'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOfflineData } from '@/hooks/use-offline-data';
import { getLiveOrders } from '@/lib/offline/db';
import { WaiterServiceView } from '@/components/waiter/waiter-service-view';
import { OfflineFallbackBanner } from '@/components/offline/offline-fallback-banner';
import { Loader2 } from 'lucide-react';

interface WaiterData {
  serviceMode: string;
  readyOrders: any[];
  dirtyTables: any[];
  servedOrders: any[];
  tablesNeedingReview: any[];
}

interface Props {
  tenantId: string;
}

export function WaiterPageClient({ tenantId }: Props) {
  const { data, loading, isOffline, cachedAt, error, refetch } =
    useOfflineData<WaiterData>('/api/waiter/data', `waiter:${tenantId}`);

  // Local offline orders created on this device — surface the READY ones here.
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const reloadLive = useCallback(async () => {
    setLiveOrders(await getLiveOrders().catch(() => []));
  }, []);
  useEffect(() => { reloadLive(); }, [reloadLive, data]);
  const refreshAll = useCallback(async () => {
    await refetch();
    await reloadLive();
  }, [refetch, reloadLive]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-center" dir="rtl">
        <div className="space-y-3">
          <p className="text-muted-foreground">{error}</p>
          <button onClick={refetch} className="text-sm text-primary underline">إعادة المحاولة</button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      {isOffline && <OfflineFallbackBanner cachedAt={cachedAt} onRefetch={refetch} />}
      <WaiterServiceView
        readyOrders={[
          ...((data?.readyOrders ?? []) as any[]),
          ...liveOrders.filter((o: any) => o.status === 'READY'),
        ] as any}
        servedOrders={(data?.servedOrders ?? []) as any}
        dirtyTables={data?.dirtyTables ?? []}
        tablesNeedingReview={data?.tablesNeedingReview ?? []}
        tenantId={tenantId}
        serviceMode={(data?.serviceMode ?? 'TABLE_SERVICE') as any}
        onRefresh={refreshAll}
      />
    </div>
  );
}
