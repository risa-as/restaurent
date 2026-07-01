'use client';

import { useEffect } from 'react';
import { cacheTables, type OfflineTable } from '@/lib/offline/db';

interface CaptainCacheProviderProps {
  tables: Array<{
    id: string;
    name?: string | null;
    number: string | number;
    capacity: number;
    status: string;
  }>;
}

/**
 * Silently caches table data to IndexedDB so the captain screen
 * can show the last-known state when the connection drops.
 */
export function CaptainCacheProvider({ tables }: CaptainCacheProviderProps) {
  useEffect(() => {
    if (tables.length === 0) return;

    const offlineTables: OfflineTable[] = tables.map((t) => ({
      id: t.id,
      name: t.name ?? `طاولة ${String(t.number)}`,
      capacity: t.capacity,
      status: t.status,
    }));

    cacheTables(offlineTables).catch(() => {});
  }, [tables]);

  return null;
}
