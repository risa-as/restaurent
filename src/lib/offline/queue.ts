'use client';

import {
  getQueue,
  removeFromQueue,
  incrementRetry,
  getQueueCount,
  clearLiveOrders,
  getLiveOrder,
  type QueuedAction,
} from './db';

const MAX_RETRIES = 3;
const SYNC_ENDPOINT = '/api/offline/sync';

export type SyncStatus = 'idle' | 'syncing' | 'error';

type SyncListener = (pendingCount: number, status: SyncStatus) => void;
const listeners = new Set<SyncListener>();

export function onSyncStateChange(fn: SyncListener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify(count: number, status: SyncStatus) {
  listeners.forEach((fn) => fn(count, status));
}

let syncing = false;

export async function syncQueue(): Promise<void> {
  if (syncing || !navigator.onLine) return;
  syncing = true;

  const queue = await getQueue();
  if (queue.length === 0) {
    syncing = false;
    notify(0, 'idle');
    return;
  }

  notify(queue.length, 'syncing');

  for (const action of queue) {
    if (action.retries >= MAX_RETRIES) {
      await removeFromQueue(action.id);
      continue;
    }

    try {
      // For an offline-created order, carry its FINAL local status (items marked
      // ready in the kitchen, served by the waiter) to the cloud so it doesn't
      // resurface as PENDING after sync.
      let body: QueuedAction = action;
      if (action.type === 'CREATE_ORDER') {
        const localId = (action.payload as Record<string, unknown>)?.localOrderId as string | undefined;
        if (localId) {
          const live = await getLiveOrder(localId).catch(() => null);
          if (live) {
            const payloadItems = (action.payload as Record<string, unknown>).items as Array<Record<string, unknown>> | undefined;
            const items = payloadItems?.map((it, i) => ({ ...it, status: live.items[i]?.status ?? 'PENDING' }));
            body = { ...action, payload: { ...action.payload, items, orderStatus: live.status } };
          }
        }
      }

      const res = await fetch(SYNC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await removeFromQueue(action.id);
      } else if (res.status >= 400 && res.status < 500) {
        // Client error — not retryable, drop it
        await removeFromQueue(action.id);
      } else {
        await incrementRetry(action.id);
      }
    } catch {
      await incrementRetry(action.id);
    }
  }

  const remaining = await getQueueCount();
  // Fully synced → the server is now authoritative; drop the local mirror so
  // the next fetch doesn't show duplicates of now-synced offline orders.
  if (remaining === 0) {
    await clearLiveOrders().catch(() => {});
  }
  syncing = false;
  notify(remaining, remaining > 0 ? 'error' : 'idle');
}

export async function getPendingCount(): Promise<number> {
  return getQueueCount();
}

// Auto-sync when coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    syncQueue();
  });
}

// Utility: build a queued action payload for common operations
export function buildCreateOrderAction(
  tenantId: string,
  payload: QueuedAction['payload'],
  branchId?: string | null,
): Omit<QueuedAction, 'id' | 'createdAt' | 'retries'> {
  return { type: 'CREATE_ORDER', tenantId, payload: { ...payload, branchId } };
}

export function buildUpdateOrderStatusAction(
  tenantId: string,
  orderId: string,
  status: string,
): Omit<QueuedAction, 'id' | 'createdAt' | 'retries'> {
  return { type: 'UPDATE_ORDER_STATUS', tenantId, payload: { orderId, status } };
}

export function buildUpdateItemStatusAction(
  tenantId: string,
  orderId: string,
  itemId: string,
  status: string,
): Omit<QueuedAction, 'id' | 'createdAt' | 'retries'> {
  return { type: 'UPDATE_ITEM_STATUS', tenantId, payload: { orderId, itemId, status } };
}
