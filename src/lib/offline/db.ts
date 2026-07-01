const DB_NAME = 'restaurant-offline';
const DB_VERSION = 4; // v4: adds live_orders store for single-device offline order flow

export interface OfflineOrder {
  id: string;
  tableId: string | null;
  tableName: string | null;
  items: Array<{
    menuItemId: string;
    name: string;
    price: number;
    quantity: number;
    notes?: string;
    modifiers?: Array<{ id: string; name: string; price: number }>;
  }>;
  notes?: string;
  type: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  createdAt: number;
  tenantId: string;
  branchId?: string | null;
}

export interface OfflineMenuItem {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  categoryName: string;
  imageUrl?: string | null;
  isAvailable: boolean;
  modifierGroups?: Array<{
    id: string;
    name: string;
    required: boolean;
    maxSelections: number;
    options: Array<{ id: string; name: string; price: number }>;
  }>;
}

export interface OfflineTable {
  id: string;
  name: string;
  capacity: number;
  status: string;
  currentOrderId?: string | null;
}

export interface OfflineKitchenAction {
  id: string;
  orderId: string;
  itemId?: string;
  action: 'MARK_READY' | 'MARK_PREPARING' | 'MARK_ITEM_READY';
  createdAt: number;
}

export interface QueuedAction {
  id: string;
  type: 'CREATE_ORDER' | 'UPDATE_ORDER_STATUS' | 'UPDATE_ITEM_STATUS' | 'CLOSE_BILL';
  payload: Record<string, unknown>;
  createdAt: number;
  retries: number;
  tenantId: string;
}

let dbInstance: IDBDatabase | null = null;

export function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Keep legacy store from v1 so old cashier queue doesn't break
      if (!db.objectStoreNames.contains('offlineOrders')) {
        const legacyStore = db.createObjectStore('offlineOrders', { keyPath: 'clientId' });
        legacyStore.createIndex('clientCreatedAt', 'clientCreatedAt');
      }

      if (!db.objectStoreNames.contains('menu_items')) {
        const menuStore = db.createObjectStore('menu_items', { keyPath: 'id' });
        menuStore.createIndex('categoryId', 'categoryId');
      }

      if (!db.objectStoreNames.contains('tables')) {
        db.createObjectStore('tables', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('offline_orders')) {
        const ordersStore = db.createObjectStore('offline_orders', { keyPath: 'id' });
        ordersStore.createIndex('createdAt', 'createdAt');
      }

      if (!db.objectStoreNames.contains('sync_queue')) {
        const queueStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
        queueStore.createIndex('createdAt', 'createdAt');
      }

      if (!db.objectStoreNames.contains('kitchen_cache')) {
        db.createObjectStore('kitchen_cache', { keyPath: 'id' });
      }

      // v3: generic page cache — one record per operational page
      if (!db.objectStoreNames.contains('page_cache')) {
        db.createObjectStore('page_cache', { keyPath: 'id' });
      }

      // v4: live orders created/updated offline on a single device, shared
      // across kitchen/waiter/captain pages until the server sync reconciles.
      if (!db.objectStoreNames.contains('live_orders')) {
        const liveStore = db.createObjectStore('live_orders', { keyPath: 'id' });
        liveStore.createIndex('createdAt', 'createdAt');
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = () => reject(request.error);
  });
}

function txGet<T>(db: IDBDatabase, store: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

function txGetAll<T>(db: IDBDatabase, store: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result as T[]);
    req.onerror = () => reject(req.error);
  });
}

function txPut<T>(db: IDBDatabase, store: string, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(value);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function txDelete(db: IDBDatabase, store: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function txClear(db: IDBDatabase, store: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── Menu Items ────────────────────────────────────────────────────────────────

export async function cacheMenuItems(items: OfflineMenuItem[]): Promise<void> {
  const db = await openDB();
  await txClear(db, 'menu_items');
  await Promise.all(items.map((item) => txPut(db, 'menu_items', item)));
}

export async function getCachedMenuItems(): Promise<OfflineMenuItem[]> {
  const db = await openDB();
  return txGetAll<OfflineMenuItem>(db, 'menu_items');
}

// ── Tables ────────────────────────────────────────────────────────────────────

export async function cacheTables(tables: OfflineTable[]): Promise<void> {
  const db = await openDB();
  await txClear(db, 'tables');
  await Promise.all(tables.map((t) => txPut(db, 'tables', t)));
}

export async function getCachedTables(): Promise<OfflineTable[]> {
  const db = await openDB();
  return txGetAll<OfflineTable>(db, 'tables');
}

export async function updateCachedTable(table: OfflineTable): Promise<void> {
  const db = await openDB();
  await txPut(db, 'tables', table);
}

// ── Kitchen Cache ─────────────────────────────────────────────────────────────

export async function cacheKitchenData(data: Record<string, unknown>): Promise<void> {
  const db = await openDB();
  await txPut(db, 'kitchen_cache', { id: 'current', ...data, cachedAt: Date.now() });
}

export async function getCachedKitchenData(): Promise<Record<string, unknown> | undefined> {
  const db = await openDB();
  return txGet(db, 'kitchen_cache', 'current');
}

// ── Sync Queue ────────────────────────────────────────────────────────────────

export async function enqueue(action: Omit<QueuedAction, 'id' | 'createdAt' | 'retries'>): Promise<QueuedAction> {
  const db = await openDB();
  const item: QueuedAction = {
    ...action,
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
    retries: 0,
  };
  await txPut(db, 'sync_queue', item);
  return item;
}

export async function getQueue(): Promise<QueuedAction[]> {
  const db = await openDB();
  const all = await txGetAll<QueuedAction>(db, 'sync_queue');
  return all.sort((a, b) => a.createdAt - b.createdAt);
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await openDB();
  await txDelete(db, 'sync_queue', id);
}

export async function incrementRetry(id: string): Promise<void> {
  const db = await openDB();
  const item = await txGet<QueuedAction>(db, 'sync_queue', id);
  if (item) await txPut(db, 'sync_queue', { ...item, retries: item.retries + 1 });
}

export async function getQueueCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

// ── Page Cache (CSR offline fallback) ─────────────────────────────────────────

export async function writePageCache(pageKey: string, data: unknown): Promise<void> {
  const db = await openDB();
  await txPut(db, 'page_cache', { id: pageKey, data, cachedAt: Date.now() });
}

export async function readPageCache<T>(pageKey: string): Promise<{ data: T; cachedAt: number } | null> {
  const db = await openDB();
  const record = await txGet<{ id: string; data: T; cachedAt: number }>(db, 'page_cache', pageKey);
  return record ? { data: record.data, cachedAt: record.cachedAt } : null;
}

// ── Live Orders (single-device offline flow) ──────────────────────────────────
// A full order shape (matching what kitchen/waiter render) stored locally so an
// order created while offline is visible across pages on the same device.

export interface LiveOrderItem {
  id: string;
  quantity: number;
  status: string;
  notes?: string | null;
  unitPrice: number;
  totalPrice: number;
  menuItem: { id: string; name: string; nameAr?: string | null; category: { id: string; name: string } };
  modifiers?: Array<{ id: string; modifierOption: { nameAr?: string | null; name: string } }>;
}

export interface LiveOrder {
  id: string;
  orderNumber: number;
  tenantId: string;
  tableId: string | null;
  table: { number: string } | null;
  status: string;
  note?: string | null;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  items: LiveOrderItem[];
  _local: true;
}

export async function saveLiveOrder(order: LiveOrder): Promise<void> {
  const db = await openDB();
  await txPut(db, 'live_orders', order);
}

export async function getLiveOrders(): Promise<LiveOrder[]> {
  const db = await openDB();
  const all = await txGetAll<LiveOrder>(db, 'live_orders');
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export async function getLiveOrder(id: string): Promise<LiveOrder | null> {
  const db = await openDB();
  const o = await txGet<LiveOrder>(db, 'live_orders', id);
  return o ?? null;
}

/** Update the status of specific items (or all items) on a local order. */
export async function updateLiveOrderItems(orderId: string, itemIds: string[] | null, status: string): Promise<void> {
  const db = await openDB();
  const order = await txGet<LiveOrder>(db, 'live_orders', orderId);
  if (!order) return;
  order.items = order.items.map((it) =>
    (itemIds === null || itemIds.includes(it.id)) ? { ...it, status } : it,
  );
  // Roll the order status up from its items
  const allReady = order.items.every((i) => ['READY', 'SERVED', 'COMPLETED'].includes(i.status));
  const anyPreparing = order.items.some((i) => i.status === 'PREPARING');
  order.status = allReady ? 'READY' : anyPreparing ? 'PREPARING' : order.status;
  order.updatedAt = new Date().toISOString();
  await txPut(db, 'live_orders', order);
}

/** Set the whole-order status (e.g. SERVED / COMPLETED). */
export async function setLiveOrderStatus(orderId: string, status: string): Promise<void> {
  const db = await openDB();
  const order = await txGet<LiveOrder>(db, 'live_orders', orderId);
  if (!order) return;
  order.status = status;
  order.updatedAt = new Date().toISOString();
  await txPut(db, 'live_orders', order);
}

/** Clear all local orders — called once the queue has fully synced to the server. */
export async function clearLiveOrders(): Promise<void> {
  const db = await openDB();
  await txClear(db, 'live_orders');
}

/**
 * Clears cached READ data on logout so a different tenant's user signing in on
 * the SAME device never sees the previous tenant's cached menu/tables/orders.
 *
 * IMPORTANT: deliberately preserves `sync_queue` and `live_orders` — those hold
 * operations created offline that have NOT yet reached the server, and wiping
 * them would silently lose a cashier's un-synced orders. Those drain + self-clear
 * once back online (see queue.ts). Read caches are safe to drop anytime.
 */
export async function clearOfflineCaches(): Promise<void> {
  const db = await openDB();
  const readCaches = ['menu_items', 'tables', 'kitchen_cache', 'page_cache', 'offlineOrders'];
  await Promise.all(
    readCaches
      .filter((s) => db.objectStoreNames.contains(s))
      .map((s) => txClear(db, s)),
  );
}
