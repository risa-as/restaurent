'use client';

/**
 * Compatibility shim — delegates to the unified offline/db module.
 * cashier-view.tsx uses enqueueOrder/drainQueue and this keeps that working
 * while the new system uses the richer sync_queue store.
 */
import { openDB, enqueue } from './offline/db';
import { syncQueue } from './offline/queue';

const STORE_NAME = 'offlineOrders';

export async function enqueueOrder(payload: object): Promise<string> {
  // Enqueue ONLY to the unified sync_queue (synced via /api/offline/sync, which
  // handles bill + shift + inventory + status). The order must NOT also be written
  // to the legacy `offlineOrders` store — that caused every offline order to be
  // created twice on reconnect (once via sync_queue, once via drainQueue→createOrder).
  const item = await enqueue({
    type: 'CREATE_ORDER',
    tenantId: (payload as Record<string, string>).tenantId ?? '',
    payload: payload as Record<string, unknown>,
  });
  return item.id;
}

export async function getPendingOrders(): Promise<
  { clientId: string; clientCreatedAt: string; payload: object }[]
> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function removeOrder(clientId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const req = tx.objectStore(STORE_NAME).delete(clientId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function drainQueue(
  _submitFn?: (payload: object) => Promise<void>,
): Promise<{ success: number; failed: number }> {
  // Unified sync only. The legacy submitFn loop is intentionally removed — it
  // re-created orders that sync_queue already handles (double-creation bug).
  await syncQueue();

  // Purge any leftover legacy entries (each had a sync_queue twin handled above)
  // so they can never double-create on a future drain.
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* legacy store may not exist — ignore */ }

  return { success: 0, failed: 0 };
}
