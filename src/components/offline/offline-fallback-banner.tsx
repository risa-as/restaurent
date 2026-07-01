'use client';

import { WifiOff, RefreshCw, Clock } from 'lucide-react';

interface Props {
  cachedAt: number | null;
  onRefetch: () => void;
}

export function OfflineFallbackBanner({ cachedAt, onRefetch }: Props) {
  const timeAgo = cachedAt
    ? new Intl.RelativeTimeFormat('ar', { numeric: 'auto' }).format(
        -Math.round((Date.now() - cachedAt) / 60000),
        'minute',
      )
    : null;

  return (
    <div className="flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-50/80 dark:bg-amber-950/30 px-4 py-2 text-sm text-amber-700 dark:text-amber-400 shrink-0">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span className="flex-1 font-medium">
        وضع بلا إنترنت — تعرض بيانات مخزنة مؤقتاً
        {timeAgo && (
          <span className="font-normal opacity-75 mr-1">
            <Clock className="inline w-3 h-3 mx-0.5" />
            {timeAgo}
          </span>
        )}
      </span>
      <button
        onClick={onRefetch}
        className="flex items-center gap-1 rounded-lg bg-amber-100 dark:bg-amber-900/40 px-2 py-1 text-xs font-bold hover:bg-amber-200 dark:hover:bg-amber-800/60 transition-colors"
      >
        <RefreshCw className="w-3 h-3" />
        إعادة المحاولة
      </button>
    </div>
  );
}
