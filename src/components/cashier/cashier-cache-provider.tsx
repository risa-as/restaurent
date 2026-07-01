'use client';

import { useEffect } from 'react';
import { cacheMenuItems, cacheTables, type OfflineMenuItem, type OfflineTable } from '@/lib/offline/db';

interface CashierCacheProviderProps {
  menuItems: Array<{
    id: string;
    name: string;
    price: number;
    categoryId: string;
    isAvailable: boolean;
    imageUrl?: string | null;
    category?: { id: string; name: string };
    _count?: { modifierGroups: number };
  }>;
  tables: Array<{
    id: string;
    name?: string | null;
    number: string | number;
    capacity: number;
    status: string;
  }>;
}

/**
 * Silently caches menu items and tables to IndexedDB for offline use.
 * Rendered as an invisible client island inside the server-rendered cashier page.
 */
export function CashierCacheProvider({ menuItems, tables }: CashierCacheProviderProps) {
  useEffect(() => {
    const offlineItems: OfflineMenuItem[] = menuItems.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      categoryId: item.categoryId,
      categoryName: item.category?.name ?? '',
      isAvailable: item.isAvailable,
      imageUrl: item.imageUrl ?? null,
    }));

    const offlineTables: OfflineTable[] = tables.map((t) => ({
      id: t.id,
      name: t.name ?? `طاولة ${String(t.number)}`,
      capacity: t.capacity,
      status: t.status,
    }));

    if (offlineItems.length > 0) {
      cacheMenuItems(offlineItems).catch(() => {});
    }
    if (offlineTables.length > 0) {
      cacheTables(offlineTables).catch(() => {});
    }
  }, [menuItems, tables]);

  return null;
}
