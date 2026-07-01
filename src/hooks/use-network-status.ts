'use client';

import { useState, useEffect, useCallback } from 'react';
import { syncQueue, onSyncStateChange, getPendingCount, type SyncStatus } from '@/lib/offline/queue';

export interface NetworkStatus {
  isOnline: boolean;
  pendingCount: number;
  syncStatus: SyncStatus;
  triggerSync: () => void;
}

export function useNetworkStatus(): NetworkStatus {
  // Start `true` on both server and first client render to avoid a hydration
  // mismatch. navigator.onLine is unreliable (false negatives on some setups),
  // so we never read it for initial state — only react to online/offline events.
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  const refreshCount = useCallback(async () => {
    try {
      const count = await getPendingCount();
      setPendingCount(count);
    } catch {
      setPendingCount(0);
    }
  }, []);

  const triggerSync = useCallback(() => {
    if (navigator.onLine) syncQueue();
  }, []);

  useEffect(() => {
    refreshCount();

    const unsub = onSyncStateChange((count, status) => {
      setPendingCount(count);
      setSyncStatus(status);
    });

    const handleOnline = () => {
      setIsOnline(true);
      syncQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('idle');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsub();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshCount]);

  return { isOnline, pendingCount, syncStatus, triggerSync };
}
