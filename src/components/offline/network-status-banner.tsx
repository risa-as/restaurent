'use client';

import { useNetworkStatus } from '@/hooks/use-network-status';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export function NetworkStatusBanner() {
  const { isOnline, pendingCount, syncStatus, triggerSync } = useNetworkStatus();
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

  // Online + no pending + no flash → nothing to show
  if (isOnline && pendingCount === 0 && !justCameOnline) return null;

  if (!isOnline) {
    return (
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
