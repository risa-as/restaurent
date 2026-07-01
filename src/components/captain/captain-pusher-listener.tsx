'use client';

import { useEffect, useCallback } from 'react';
import { getPusherClient } from '@/lib/pusher';
import { useToast } from '@/hooks/use-toast';
import { BellRing } from 'lucide-react';

/**
 * Invisible component rendered inside CaptainOrderForm.
 * Subscribes to the 'orders' Pusher channel and pops a toast
 * when the kitchen marks an order as ready — filtered by branch.
 */
export function CaptainPusherListener({ tenantId, branchId }: { tenantId: string; branchId?: string | null }) {
    const { toast } = useToast();

    const handleOrderReady = useCallback((data: { branchId?: string | null }) => {
        // If both the event and the captain have a branchId, only notify matching branch
        if (branchId && data?.branchId && data.branchId !== branchId) return;

        toast({
            title: '🔔 طلب جاهز!',
            description: 'المطبخ أنهى تحضير طلب — يرجى تسليمه للزبون',
            duration: 8000,
        });
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
    }, [toast, branchId]);

    useEffect(() => {
        const pusher = getPusherClient();
        if (!pusher) return;

        const ordersChannel = pusher.subscribe(`tenant-${tenantId}-orders`);
        ordersChannel.bind('order-ready', handleOrderReady);

        return () => {
            ordersChannel.unbind('order-ready', handleOrderReady);
            // لا نستدعي pusher.unsubscribe هنا لأن CaptainOrderForm يستخدم نفس الـ channel
            // الـ Pusher client يدير الاتصال تلقائياً
        };
    }, [handleOrderReady]);

    return null;
}

/**
 * Bell icon button the captain can press to check/clear notification state.
 */
export function CaptainNotificationBell({ hasReadyOrders }: { hasReadyOrders: boolean }) {
    return hasReadyOrders ? (
        <div className="flex items-center gap-2 rounded-full bg-green-500/15 border border-green-400/50 px-3 py-1.5 text-sm font-semibold text-green-700 dark:text-green-400 animate-pulse">
            <BellRing className="h-4 w-4" />
            <span>طلب جاهز!</span>
        </div>
    ) : null;
}
