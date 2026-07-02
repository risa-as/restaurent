'use client';

import { useNetworkStatus } from '@/hooks/use-network-status';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, CloudUpload, AlertTriangle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

/**
 * Full-viewport offline treatment: an animated striped bar pinned to the top,
 * a pulsing red inner ring around the viewport, and a floating pill — the page
 * stays fully usable, but there is no way to miss that it's running offline.
 * Rendered with fixed positioning, so it works from wherever the banner is
 * mounted (all five operational layouts).
 */
function OfflineOverlay({ pendingCount }: { pendingCount: number }) {
  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[95] h-1.5 offline-stripes-bar" aria-hidden />
      <div className="pointer-events-none fixed inset-0 z-[94] offline-viewport-ring" aria-hidden />
      <div className="pointer-events-none fixed bottom-4 left-4 z-[95] flex items-center gap-2 rounded-full bg-red-600/95 px-4 py-2 text-white shadow-lg backdrop-blur" dir="rtl">
        <WifiOff className="h-4 w-4 animate-pulse" />
        <span className="text-sm font-bold">وضع عدم الاتصال</span>
        {pendingCount > 0 && (
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs tabular-nums">{pendingCount} معلق</span>
        )}
      </div>
    </>
  );
}

export function NetworkStatusBanner() {
  const { isOnline, pendingCount, failedCount, syncStatus, triggerSync, retryFailed } = useNetworkStatus();
  const [mounted, setMounted] = useState(false);
  const [justCameOnline, setJustCameOnline] = useState(false);
  const wasOffline = useRef(false);

  // Gate all rendering behind mount so the server and the first client render
  // both produce `null`. This makes a hydration mismatch on the surrounding
  // <header> impossible, regardless of network-state quirks.
  useEffect(() => {
    setMounted(true);
  }, []);

  // Flash "reconnected" ONLY after a genuine offline → online transition,
  // never on a normal page load.
  useEffect(() => {
    if (!isOnline) {
      wasOffline.current = true;
      setJustCameOnline(false);
      return;
    }
    if (wasOffline.current) {
      wasOffline.current = false;
      setJustCameOnline(true);
      const t = setTimeout(() => setJustCameOnline(false), 3000);
      return () => clearTimeout(t);
    }
  }, [isOnline]);

  // Never participate in SSR / hydration
  if (!mounted) return null;

  // Online + nothing pending/failed + no flash → nothing to show
  if (isOnline && pendingCount === 0 && failedCount === 0 && !justCameOnline) return null;

  if (!isOnline) {
    return (
      <>
        <OfflineOverlay pendingCount={pendingCount} />
        <div className="flex items-center gap-2 bg-red-600 text-white text-sm px-4 py-2 w-full z-50">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span className="flex-1">
            أنت غير متصل بالإنترنت — سيتم حفظ الإجراءات ومزامنتها عند العودة
          </span>
          {pendingCount > 0 && (
            <span className="bg-red-800 text-white text-xs px-2 py-0.5 rounded-full">
              {pendingCount} معلق
            </span>
          )}
        </div>
      </>
    );
  }

  if (syncStatus === 'syncing') {
    return (
      <div className="flex items-center gap-2 bg-amber-500 text-white text-sm px-4 py-2 w-full z-50">
        <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
        <span className="flex-1">جارٍ مزامنة {pendingCount} إجراء معلق...</span>
      </div>
    );
  }

  // Actions that were rejected or exhausted retries — kept visible until a
  // human decides, never silently dropped.
  if (failedCount > 0) {
    return (
      <div className="flex items-center gap-2 bg-red-700 text-white text-sm px-4 py-2 w-full z-50">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span className="flex-1">
          {failedCount} إجراء فشلت مزامنته — راجع سجل الطلبات ثم أعد المحاولة
        </span>
        <button
          onClick={retryFailed}
          className="bg-red-900 hover:bg-red-950 text-white text-xs px-3 py-1 rounded-full transition-colors"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  if (syncStatus === 'error' && pendingCount > 0) {
    return (
      <div className="flex items-center gap-2 bg-orange-600 text-white text-sm px-4 py-2 w-full z-50">
        <Wifi className="h-4 w-4 shrink-0" />
        <span className="flex-1">فشلت المزامنة — {pendingCount} إجراء معلق</span>
        <button
          onClick={triggerSync}
          className="bg-orange-800 hover:bg-orange-900 text-white text-xs px-3 py-1 rounded-full transition-colors"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  // Online with a queue that hasn't drained yet (e.g. the browser was reopened
  // after going offline) — previously this state rendered nothing at all.
  if (pendingCount > 0) {
    return (
      <div className="flex items-center gap-2 bg-sky-600 text-white text-sm px-4 py-2 w-full z-50">
        <CloudUpload className="h-4 w-4 shrink-0" />
        <span className="flex-1">{pendingCount} إجراء بانتظار المزامنة</span>
        <button
          onClick={triggerSync}
          className="bg-sky-800 hover:bg-sky-900 text-white text-xs px-3 py-1 rounded-full transition-colors"
        >
          مزامنة الآن
        </button>
      </div>
    );
  }

  if (justCameOnline) {
    return (
      <div className="flex items-center gap-2 bg-green-600 text-white text-sm px-4 py-2 w-full z-50">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>تم استعادة الاتصال ومزامنة جميع البيانات</span>
      </div>
    );
  }

  return null;
}
