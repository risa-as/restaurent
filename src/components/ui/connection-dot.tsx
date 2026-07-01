'use client';

import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

interface ConnectionDotProps {
    connected: boolean;
    className?: string;
}

export function ConnectionDot({ connected, className }: ConnectionDotProps) {
    return (
        <div className={cn('flex items-center gap-1.5', className)}>
            <span className="relative flex h-2 w-2">
                {connected && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                )}
                <span className={cn(
                    'relative inline-flex rounded-full h-2 w-2',
                    connected ? 'bg-green-500' : 'bg-gray-400'
                )} />
            </span>
            <span className={cn('text-xs font-medium', connected ? 'text-green-600' : 'text-muted-foreground')}>
                {connected ? 'مباشر' : 'غير متصل'}
            </span>
        </div>
    );
}

export function OfflineBanner() {
    const [isOnline, setIsOnline] = useState(true);

    useEffect(() => {
        // Do not seed from navigator.onLine — it gives false negatives on some
        // setups. Start optimistic (online) and only flip on real network events.
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (isOnline) return null;

    return (
        <div className="w-full bg-orange-500 text-white text-sm font-bold py-2 px-4 flex items-center justify-center gap-2 z-50">
            <WifiOff className="w-4 h-4" />
            ⚠️ وضع عدم الاتصال — الطلبات محفوظة محلياً وستُرسل عند عودة الإنترنت
        </div>
    );
}
