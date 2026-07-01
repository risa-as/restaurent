'use client';

import { useOfflineData } from '@/hooks/use-offline-data';
import { CashierView } from '@/components/cashier/cashier-view';
import { PendingBillsView } from '@/components/cashier/pending-bills-view';
import { ShiftOpenModal } from '@/components/cashier/shift-open-modal';
import { ShiftStatusBar } from '@/components/cashier/shift-status-bar';
import { OfflineFallbackBanner } from '@/components/offline/offline-fallback-banner';
import { Loader2 } from 'lucide-react';

interface CashierData {
  serviceMode: string;
  currentShift: any;
  loyaltyEnabled: boolean;
  categories: any[];
  menuItems: any[];
  tables: any[];
  orders: any[];
  qrBills?: any[];
  activeTableOrders?: any[];
  pendingBills?: any[];
  tenantId: string;
}

interface Props {
  tenantId: string;
  cashierName: string;
}

export function CashierPageClient({ tenantId, cashierName }: Props) {
  const { data, loading, isOffline, cachedAt, error, refetch } =
    useOfflineData<CashierData>('/api/cashier/data', `cashier:${tenantId}`);

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

  const requiresShift = !data?.currentShift;

  if (data?.serviceMode === 'QUICK_SERVICE') {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <h1 className="text-2xl font-bold mb-4 hidden print:block">نظام الكاشير (خدمة سريعة)</h1>
        {isOffline && <OfflineFallbackBanner cachedAt={cachedAt} onRefetch={refetch} />}
        {requiresShift && !isOffline && <ShiftOpenModal required onRefresh={refetch} />}
        {data?.currentShift && <ShiftStatusBar shift={data.currentShift} cashierName={cashierName} onRefresh={refetch} />}
        <div className="flex-1 min-h-0 overflow-hidden">
          <CashierView
            initialOrders={data?.orders ?? []}
            categories={data?.categories ?? []}
            menuItems={data?.menuItems ?? []}
            tables={data?.tables ?? []}
            serviceMode={data?.serviceMode as any}
            shiftId={data?.currentShift?.id}
            qrPendingBills={data?.qrBills ?? []}
            activeTableOrders={data?.activeTableOrders ?? []}
            tenantId={tenantId}
            loyaltyEnabled={data?.loyaltyEnabled ?? false}
            onRefresh={refetch}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col" dir="rtl">
      <h1 className="text-2xl font-bold mb-4 hidden print:block">نظام الكاشير (حسابات الطاولات)</h1>
      {isOffline && <OfflineFallbackBanner cachedAt={cachedAt} onRefetch={refetch} />}
      {requiresShift && !isOffline && <ShiftOpenModal required onRefresh={refetch} />}
      {data?.currentShift && <ShiftStatusBar shift={data.currentShift} cashierName={cashierName} onRefresh={refetch} />}
      <div className="flex-1 min-h-0 px-4 overflow-y-auto pb-8 pt-2">
        <PendingBillsView
          bills={data?.pendingBills ?? []}
          activeOrders={data?.activeTableOrders ?? []}
          tenantId={tenantId}
          shiftId={data?.currentShift?.id}
          onRefresh={refetch}
        />
      </div>
    </div>
  );
}
