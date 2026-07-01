'use client';

import { useOfflineData } from '@/hooks/use-offline-data';
import { DriverDashboard } from '@/components/delivery/driver-dashboard';
import { DeliveryManagerView } from '@/components/delivery/delivery-manager-view';
import { OfflineFallbackBanner } from '@/components/offline/offline-fallback-banner';
import { Loader2, Clock, Bike, Users } from 'lucide-react';

interface DeliveryData {
  deliveries: any[];
  drivers: any[];
  unpaidDeliveries: any[];
  menuItems: any[];
  historyDeliveries: any[];
  isManager: boolean;
  userId: string;
}

export function DeliveryPageClient({ tenantId }: { tenantId: string }) {
  const { data, loading, isOffline, cachedAt, error, refetch } =
    useOfflineData<DeliveryData>('/api/delivery/data', `delivery:${tenantId}`);

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

  const deliveries = data?.deliveries ?? [];
  const isManager = data?.isManager ?? false;
  const activeCount = deliveries.filter((d: any) => ['ASSIGNED', 'OUT_FOR_DELIVERY'].includes(d.status)).length;
  const pendingCount = deliveries.filter((d: any) => d.status === 'PENDING').length;
  const filteredDeliveries = isManager
    ? deliveries
    : deliveries.filter((d: any) => d.driverId === data?.userId);

  return (
    <div className="p-6 md:p-8 space-y-8 h-full flex flex-col bg-background">
      {isOffline && <OfflineFallbackBanner cachedAt={cachedAt} onRefetch={refetch} />}

      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-muted-foreground mt-2 text-lg">
          {isManager ? 'متابعة حركة الطلبات وتعيين السائقين' : 'قائمة طلباتك الحالية'}
        </p>
        {isManager && (
          <div className="flex gap-4">
            <div className="bg-card border rounded-xl px-6 py-3 flex flex-col items-center shadow-sm min-w-[120px]">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">قيد الانتظار</span>
              </div>
              <span className="text-2xl font-bold text-yellow-500">{pendingCount}</span>
            </div>
            <div className="bg-card border rounded-xl px-6 py-3 flex flex-col items-center shadow-sm min-w-[120px]">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Bike className="w-4 h-4" />
                <span className="text-sm font-medium">جاري التوصيل</span>
              </div>
              <span className="text-2xl font-bold text-primary">{activeCount}</span>
            </div>
            <div className="bg-card border rounded-xl px-6 py-3 flex flex-col items-center shadow-sm min-w-[120px]">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="w-4 h-4" />
                <span className="text-sm font-medium">سائق متاح</span>
              </div>
              <span className="text-2xl font-bold text-green-500">{data?.drivers?.length ?? 0}</span>
            </div>
          </div>
        )}
      </div>

      {isManager ? (
        <DeliveryManagerView
          activeDeliveries={deliveries}
          historyDeliveries={data?.historyDeliveries ?? []}
          unpaidDeliveries={data?.unpaidDeliveries ?? []}
          drivers={data?.drivers ?? []}
          menuItems={(data?.menuItems ?? []) as any}
          onRefresh={refetch}
        />
      ) : (
        <div className="flex-1">
          <DriverDashboard
            deliveries={filteredDeliveries}
            historyDeliveries={data?.historyDeliveries ?? []}
            onRefresh={refetch}
          />
        </div>
      )}
    </div>
  );
}
