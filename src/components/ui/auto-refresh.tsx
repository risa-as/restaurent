'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useCallback } from 'react';
import { getPusherClient } from '@/lib/pusher';

interface AutoRefreshProps {
    intervalMs?: number;
    tenantId?: string;
}

export function AutoRefresh({ intervalMs = 10000, tenantId }: AutoRefreshProps) {
    const router = useRouter();
    // Only refresh when online — avoids error-flood when connection drops
    const refresh = useCallback(() => {
        if (navigator.onLine) router.refresh();
    }, [router]);

    useEffect(() => {
        const interval = setInterval(refresh, intervalMs);
        return () => clearInterval(interval);
    }, [refresh, intervalMs]);

    useEffect(() => {
        if (!tenantId) return;
        const pusher = getPusherClient();
        if (!pusher) return;

        const ordersChannel = pusher.subscribe(`tenant-${tenantId}-orders`);
        ordersChannel.bind('order-served', refresh);
        ordersChannel.bind('order-updated', refresh);

        const kitchenChannel = pusher.subscribe(`tenant-${tenantId}-kitchen`);
        kitchenChannel.bind('order-updated', refresh);

        return () => {
            ordersChannel.unbind_all();
            pusher.unsubscribe(`tenant-${tenantId}-orders`);
            kitchenChannel.unbind_all();
            pusher.unsubscribe(`tenant-${tenantId}-kitchen`);
        };
    }, [tenantId, refresh]);

    return null;
}
