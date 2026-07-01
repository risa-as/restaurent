'use client';

import { useOfflineData } from '@/hooks/use-offline-data';
import { CaptainOrderForm } from '@/components/captain/captain-order-form';
import { CaptainPusherListener } from '@/components/captain/captain-pusher-listener';
import { OfflineFallbackBanner } from '@/components/offline/offline-fallback-banner';
import { Loader2, Zap } from 'lucide-react';

interface CaptainData {
  categories: any[];
  tables: any[];
  serviceMode: string;
  readyCount: number;
  tenantId: string;
  branchId: string | null;
}

interface Props {
  tenantId: string;
}

export function CaptainPageClient({ tenantId }: Props) {
  const { data, loading, isOffline, cachedAt, error, refetch } =
    useOfflineData<CaptainData>('/api/captain/data', `captain:${tenantId}`);

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

  if (data?.serviceMode === 'QUICK_SERVICE') {
    return (
      <div className="h-full flex items-center justify-center p-8" dir="rtl">
        <div className="text-center space-y-4 max-w-sm">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Zap className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-black">نظام الطلب السريع</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            هذا المطعم يعمل بنظام الطلب السريع. إدارة الطلبات تتم مباشرة من صفحة الكاشير.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col gap-2">
      {isOffline && <OfflineFallbackBanner cachedAt={cachedAt} onRefetch={refetch} />}
      <div className="flex-1 min-h-0">
        {!isOffline && <CaptainPusherListener tenantId={tenantId} branchId={data?.branchId ?? null} />}
        <CaptainOrderForm
          categories={data?.categories ?? []}
          tables={data?.tables ?? []}
          readyOrdersCount={data?.readyCount ?? 0}
          serviceMode={(data?.serviceMode ?? 'TABLE_SERVICE') as any}
          tenantId={tenantId}
          onRefresh={refetch}
        />
      </div>
    </div>
  );
}
