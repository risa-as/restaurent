'use client';

import { useEffect } from 'react';
import { cacheKitchenData } from '@/lib/offline/db';

interface KitchenCacheProviderProps {
  orders: unknown[];
  tenantId: string;
}

/**
 * Silently caches kitchen orders to IndexedDB on every render.
 * This lets the kitchen board show stale data when offline.
 */
export function KitchenCacheProvider({ orders, tenantId }: KitchenCacheProviderProps) {
  useEffect(() => {
    if (orders.length > 0) {
      cacheKitchenData({ orders, tenantId, cachedAt: Date.now() }).catch(() => {});
    }
  }, [orders, tenantId]);

  return null;
}
