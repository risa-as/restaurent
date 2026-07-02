'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface OfflineDataState<T> {
  data: T | null;
  loading: boolean;
  isOffline: boolean;
  cachedAt: number | null;
  error: string | null;
  refetch: () => void;
}

export function useOfflineData<T>(
  apiUrl: string,
  cacheKey: string,
): OfflineDataState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Drives the self-heal retry: incremented on every failed load, reset to 0 on
  // success. The retry effect re-runs on each increment (backoff grows with it).
  const [failCount, setFailCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const hasDataRef = useRef(false); // whether anything is currently on screen

  const load = useCallback(async (silent = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    // Silent (background) refresh keeps the current UI mounted instead of
    // flashing the full-page loading spinner — used by refetch / retries.
    if (!silent) setLoading(true);

    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    try {
      // 15s cap for the Electron case where the local server hangs on an
      // unreachable cloud DB. A genuine offline fetch rejects almost immediately.
      // Also abort the underlying fetch so the socket isn't left running after
      // the race has already settled.
      const timeoutPromise = new Promise<never>(
        (_, reject) =>
          (timeoutId = setTimeout(() => {
            reject(new Error('NETWORK_TIMEOUT'));
            controller.abort();
          }, 15000)),
      );

      const res = await Promise.race([
        fetch(apiUrl, {
          signal: controller.signal,
          credentials: 'same-origin',
          cache: 'no-store',
        }),
        timeoutPromise,
      ]);

      if (timeoutId) clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: T = await res.json();
      setData(json);
      hasDataRef.current = true;
      setIsOffline(false);
      setCachedAt(null);
      setError(null);
      setFailCount(0);

      // Persist to page_cache for offline fallback
      const { writePageCache } = await import('@/lib/offline/db');
      await writePageCache(cacheKey, json).catch(() => {});
    } catch (err: any) {
      if (timeoutId) clearTimeout(timeoutId);
      if (err?.name === 'AbortError') return;

      // A slow/failed fetch is NOT the same as being offline. `navigator.onLine
      // === false` is the only reliable offline signal; a slow response while
      // navigator reports online is just a slow server — we must NOT flash the
      // "offline" banner or start hammering the backend. We only trust onLine in
      // the conservative direction (show offline only when it is explicitly false).
      const genuinelyOffline =
        typeof navigator !== 'undefined' && navigator.onLine === false;

      // Backfill from cache only if there is nothing on screen yet, so the page
      // stays usable — but WITHOUT the offline banner when we're actually online.
      if (!hasDataRef.current) {
        try {
          const { readPageCache } = await import('@/lib/offline/db');
          const cached = await readPageCache<T>(cacheKey);
          if (cached) {
            setData(cached.data);
            hasDataRef.current = true;
            setCachedAt(cached.cachedAt);
          }
        } catch {
          /* ignore cache read failure */
        }
      }

      if (genuinelyOffline) {
        setIsOffline(true);
        setError(hasDataRef.current ? null : 'لا توجد بيانات محفوظة — يرجى الاتصال بالإنترنت أولاً');
      } else {
        // Online but slow/failed → keep showing current data and retry quietly.
        setIsOffline(false);
        setError(hasDataRef.current ? null : 'الاتصال بطيء، جارٍ إعادة المحاولة…');
      }

      setFailCount((c) => c + 1);
    } finally {
      // Only the LATEST load may clear `loading`. If a newer load superseded this
      // one, leave loading as-is so the spinner stays until the newer load resolves.
      // Otherwise an aborted initial fetch (React StrictMode's double-invoke in dev,
      // or a quick refetch) would set loading=false while data is still null —
      // flashing the empty state ("لا توجد أقسام") for the whole real fetch.
      // (Checked via abortRef identity, not signal.aborted — the 15s timeout also
      // aborts this controller and that case MUST still clear the spinner.)
      if (!silent && abortRef.current === controller) setLoading(false);
    }
  }, [apiUrl, cacheKey]);

  useEffect(() => {
    load();
    const handleOnline = () => load(true);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
      abortRef.current?.abort();
    };
  }, [load]);

  // Self-heal with exponential backoff after any failed load (offline OR a slow
  // server), stopping as soon as a load succeeds (which resets failCount to 0).
  // Replaces the old fixed 8s poll that piled load onto an already-slow backend.
  useEffect(() => {
    if (failCount === 0) return;
    const delay = Math.min(3000 * 2 ** (failCount - 1), 30000); // 3s, 6s, 12s, 24s, 30s…
    const id = setTimeout(() => load(true), delay);
    return () => clearTimeout(id);
  }, [failCount, load]);

  // Background refresh — never toggles the full-page loading state.
  const refetch = useCallback(() => load(true), [load]);

  return { data, loading, isOffline, cachedAt, error, refetch };
}
