'use client';

import {
  getQueue,
  removeFromQueue,
  incrementRetry,
  getQueueCount,
  clearLiveOrders,
  deleteLiveOrder,
  getLiveOrder,
  markActionFailed,
  getFailedCount,
  requeueFailedActions,
  updateOrderLog,
  type QueuedAction,
} from './db';

const MAX_RETRIES = 3;
const SYNC_ENDPOINT = '/api/offline/sync';
// Web Lock name — guarantees a single tab drains the shared IndexedDB queue.
const SYNC_LOCK = 'restaurant-offline-sync';

export type SyncStatus = 'idle' | 'syncing' | 'error';

type SyncListener = (pendingCount: number, status: SyncStatus, failedCount: number) => void;
const listeners = new Set<SyncListener>();

export function onSyncStateChange(fn: SyncListener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

async function notify(count: number, status: SyncStatus) {
  const failed = await getFailedCount().catch(() => 0);
  listeners.forEach((fn) => fn(count, status, failed));
}

// Per-tab reentry guard (the cross-tab guarantee comes from the Web Lock).
let syncing = false;

export async function syncQueue(): Promise<void> {
  if (syncing || !navigator.onLine) return;

  // The queue lives in IndexedDB shared by every tab (cashier + kitchen +
  // waiter + captain are opened side by side). Without a cross-tab lock, two
  // tabs both read the same CREATE_ORDER and POST it before either deletes it
  // → duplicated orders/bills. `ifAvailable` makes concurrent callers no-ops.
  if (typeof navigator !== 'undefined' && 'locks' in navigator) {
    await navigator.locks.request(SYNC_LOCK, { ifAvailable: true }, async (lock) => {
      if (!lock) return; // another tab is already syncing
      await drain();
    });
  } else {
    await drain();
  }
}

async function drain(): Promise<void> {
  if (syncing) return;
  syncing = true;

  try {
    const queue = await getQueue();
    if (queue.length === 0) {
      await notify(0, 'idle');
      return;
    }

    await notify(queue.length, 'syncing');

    for (const action of queue) {
      if (action.retries >= MAX_RETRIES) {
        // Exhausted retries — park it where the user can see and retry it.
        await markActionFailed(action, 'استنفدت محاولات المزامنة (خطأ خادم متكرر)');
        await flagOrderLogFailed(action);
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
          await reconcileSyncedAction(action, res);
        } else if (res.status >= 400 && res.status < 500) {
          // Client error — not retryable, but NEVER silently dropped: an order
          // with money on it must stay visible until a human decides.
          const reason = await res
            .json()
            .then((j: { error?: string }) => j?.error || `HTTP ${res.status}`)
            .catch(() => `HTTP ${res.status}`);
          await markActionFailed(action, reason);
          await flagOrderLogFailed(action);
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
    await notify(remaining, remaining > 0 ? 'error' : 'idle');
  } finally {
    syncing = false;
  }
}

/** After a CREATE_ORDER synced: update the on-device order log and remove the
 *  now-authoritative local mirror (so no duplicate shows even if OTHER queued
 *  actions are still stuck retrying). */
async function reconcileSyncedAction(action: QueuedAction, res: Response): Promise<void> {
  if (action.type !== 'CREATE_ORDER') return;
  const data = await res
    .json()
    .then((j: { orderId?: string; orderNumber?: number; status?: string }) => j)
    .catch(() => null);
  const localId = (action.payload as Record<string, unknown>)?.localOrderId as string | undefined;
  const logId = localId ?? action.id;
  await updateOrderLog(logId, {
    sync: 'synced',
    serverOrderId: data?.orderId ?? null,
    orderNumber: data?.orderNumber ?? null,
    ...(data?.status ? { status: data.status } : {}),
  }).catch(() => {});
  if (localId) await deleteLiveOrder(localId).catch(() => {});
}

async function flagOrderLogFailed(action: QueuedAction): Promise<void> {
  if (action.type !== 'CREATE_ORDER') return;
  const localId = (action.payload as Record<string, unknown>)?.localOrderId as string | undefined;
  await updateOrderLog(localId ?? action.id, { sync: 'failed' }).catch(() => {});
}

/** Re-queue everything in failed_actions and immediately try to sync. */
export async function retryFailedActions(): Promise<void> {
  await requeueFailedActions();
  await syncQueue();
  // If syncQueue was a no-op (offline / another tab holds the lock) still
  // refresh the listeners so the banner reflects the moved counts.
  await notify(await getQueueCount(), 'idle');
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

export function buildCloseBillAction(
  tenantId: string,
  orderId: string,
  paymentMethod: string,
): Omit<QueuedAction, 'id' | 'createdAt' | 'retries'> {
  return { type: 'CLOSE_BILL', tenantId, payload: { orderId, paymentMethod } };
}
