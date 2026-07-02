'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useOfflineData } from '@/hooks/use-offline-data';
import { getPusherClient } from '@/lib/pusher';
import { getLiveOrders } from '@/lib/offline/db';
import { OfflineFallbackBanner } from '@/components/offline/offline-fallback-banner';
import { ClientOrderCard } from './client-order-card';
import { Loader2 } from 'lucide-react';

interface OrdersData {
  orders: any[];
}

const statusConfig: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'انتظار', color: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800' },
  PREPARING: { label: 'تحضير', color: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800' },
  READY: { label: 'جاهز', color: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800' },
};

export function CaptainOrdersClient({ tenantId }: { tenantId: string }) {
  const { data, loading, isOffline, cachedAt, refetch } =
    useOfflineData<OrdersData>('/api/captain/orders/data', `captain-orders:${tenantId}`);

  // Local offline orders created on this device
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const reloadLive = useCallback(async () => {
    setLiveOrders(await getLiveOrders().catch(() => []));
  }, []);
  useEffect(() => { reloadLive(); }, [reloadLive, data]);
  const refreshAll = useCallback(async () => {
    await refetch();
    await reloadLive();
  }, [refetch, reloadLive]);

  // Kitchen status changes arrive via Pusher (like the waiter board) with a
  // slow 60s fallback poll — the old flat 10s poll hit the API 6×/min per tab.
  const refreshRef = useRef(refreshAll);
  refreshRef.current = refreshAll;
  useEffect(() => {
    const debounceRef = { id: null as ReturnType<typeof setTimeout> | null };
    const scheduleRefresh = () => {
      if (debounceRef.id) clearTimeout(debounceRef.id);
      debounceRef.id = setTimeout(() => refreshRef.current(), 300);
    };

    const pusher = getPusherClient();
    const kitchenChannel = pusher?.subscribe(`tenant-${tenantId}-kitchen`);
    kitchenChannel?.bind('order-updated', scheduleRefresh);
    kitchenChannel?.bind('item-updated', scheduleRefresh);
    const ordersChannel = pusher?.subscribe(`tenant-${tenantId}-orders`);
    ordersChannel?.bind('order-updated', scheduleRefresh);

    const id = setInterval(() => {
      if (navigator.onLine) refreshRef.current();
    }, 60_000);

    return () => {
      clearInterval(id);
      if (debounceRef.id) clearTimeout(debounceRef.id);
      kitchenChannel?.unbind('order-updated', scheduleRefresh);
      kitchenChannel?.unbind('item-updated', scheduleRefresh);
      ordersChannel?.unbind('order-updated', scheduleRefresh);
      // channels stay subscribed — other captain components share them
    };
  }, [tenantId]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const serverOrders = (data?.orders ?? []) as any[];
  const orders = [
    ...serverOrders,
    ...liveOrders.filter((o: any) => ['PENDING', 'PREPARING', 'READY'].includes(o.status)),
  ];

  return (
    <div className="h-full overflow-y-auto max-w-5xl mx-auto p-1">
      {isOffline && <OfflineFallbackBanner cachedAt={cachedAt} onRefetch={refreshAll} />}
      <h1 className="text-2xl font-bold mb-6">متابعة طلبات المطبخ</h1>

      <div className="grid gap-4">
        {orders.length === 0 ? (
          <div className="text-center text-muted-foreground py-10">
            لا توجد طلبات نشطة حالياً
          </div>
        ) : (
          orders.map((order: any) => (
            <ClientOrderCard
              key={order.id}
              order={order}
              config={statusConfig[order.status] || statusConfig.PENDING}
              status={order.status}
              tenantId={tenantId}
              onRefresh={refreshAll}
            />
          ))
        )}
      </div>
    </div>
  );
}
