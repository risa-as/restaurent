'use client';

import { useState, useEffect, useCallback } from 'react';
import { syncQueue, onSyncStateChange, getPendingCount, retryFailedActions, type SyncStatus } from '@/lib/offline/queue';
import { getFailedCount } from '@/lib/offline/db';

export interface NetworkStatus {
  isOnline: boolean;
  pendingCount: number;
  failedCount: number;
  syncStatus: SyncStatus;
  triggerSync: () => void;
  retryFailed: () => void;
}

export function useNetworkStatus(): NetworkStatus {
  // Start `true` on both server and first client render to avoid a hydration
  // mismatch. navigator.onLine is unreliable, so it is only trusted in the
  // conservative direction (explicitly false → offline) after mount.
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');

  const refreshCounts = useCallback(async () => {
    try {
      const [pending, failed] = await Promise.all([getPendingCount(), getFailedCount()]);
      setPendingCount(pending);
      setFailedCount(failed);
      return pending;
    } catch {
      setPendingCount(0);
      setFailedCount(0);
      return 0;
    }
  }, []);

  const triggerSync = useCallback(() => {
    if (navigator.onLine) syncQueue();
  }, []);

  const retryFailed = useCallback(() => {
    retryFailedActions().catch(() => {});
  }, []);

  useEffect(() => {
    // Trust navigator.onLine only when it says offline (conservative direction).
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setIsOnline(false);
    }

    // Startup drain: if the browser was closed while offline and reopened
    // online, no `online` event ever fires — the queued actions would sit
    // invisible forever. Kick a sync as soon as any page mounts with a
    // non-empty queue.
    refreshCounts().then((pending) => {
      if (pending > 0 && navigator.onLine) syncQueue();
    });

    const unsub = onSyncStateChange((count, status, failed) => {
      setPendingCount(count);
      setSyncStatus(status);
      setFailedCount(failed);
    });

    const handleOnline = () => {
      setIsOnline(true);
      syncQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('idle');
      refreshCounts();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsub();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshCounts]);

  return { isOnline, pendingCount, failedCount, syncStatus, triggerSync, retryFailed };
}
