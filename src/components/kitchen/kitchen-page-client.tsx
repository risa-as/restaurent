'use client';

import { useState, useEffect, useCallback } from 'react';
import { useOfflineData } from '@/hooks/use-offline-data';
import { getLiveOrders } from '@/lib/offline/db';
import { KitchenBoard } from '@/components/kitchen/kitchen-board';
import { OfflineFallbackBanner } from '@/components/offline/offline-fallback-banner';
import { ChefHat, Flame, Clock, CheckCircle2, LayoutDashboard, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { RefreshButton } from '@/components/common/refresh-button';
import { ConnectionDot } from '@/components/ui/connection-dot';

interface KitchenData {
  orders: any[];
  categories: any[];
  stations: any[];
}

interface Props {
  tenantId: string;
  stationParam?: string;
}

export function KitchenPageClient({ tenantId, stationParam }: Props) {
  const { data, loading, isOffline, cachedAt, error, refetch } =
    useOfflineData<KitchenData>('/api/kitchen/data', `kitchen:${tenantId}`);

  // Local offline orders created on this device (single-device live flow)
  const [liveOrders, setLiveOrders] = useState<any[]>([]);
  const reloadLive = useCallback(async () => {
    setLiveOrders(await getLiveOrders().catch(() => []));
  }, []);
  useEffect(() => { reloadLive(); }, [reloadLive, data]);

  // Combined refresh: server refetch + reload local orders
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

  const serverOrders = data?.orders ?? [];
  // Merge local offline orders (exclude ones already served/completed)
  const orders = [
    ...serverOrders,
    ...liveOrders.filter((o: any) => !['COMPLETED', 'SERVED'].includes(o.status)),
  ];
  const categories = data?.categories ?? [];
  const stations = data?.stations ?? [];

  const hasStations = stations.length > 0 && categories.some((c: any) => c.stationId);

  let stationLabel = 'جميع الأقسام';
  let filteredCategoryIds: string[] | null = null;

  if (stationParam && hasStations) {
    const station = stations.find((s: any) => s.id === stationParam);
    stationLabel = station ? (station.nameAr || station.name) : 'المحطة غير موجودة';
    filteredCategoryIds = categories.filter((c: any) => c.stationId === stationParam).map((c: any) => c.id);
  } else if (stationParam && !hasStations) {
    const category = categories.find((c: any) => c.id === stationParam);
    stationLabel = category ? category.name : 'القسم غير موجود';
    filteredCategoryIds = stationParam ? [stationParam] : null;
  }

  const pendingCount   = orders.filter((o: any) => o.items.every((i: any) => i.status === 'PENDING')).length;
  const preparingCount = orders.filter((o: any) => o.items.some((i: any) => i.status === 'PREPARING') && !o.items.every((i: any) => ['READY','SERVED','COMPLETED'].includes(i.status))).length;
  const readyCount     = orders.filter((o: any) => o.items.every((i: any) => ['READY','SERVED','COMPLETED'].includes(i.status))).length;
  const totalCount     = orders.length;

  return (
    <div className="h-full flex flex-col gap-3">

      {isOffline && <OfflineFallbackBanner cachedAt={cachedAt} onRefetch={refetch} />}

      {/* Top bar */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
            <ChefHat className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight leading-tight">{stationLabel}</h2>
            <p className="text-xs text-muted-foreground">
              {stationParam
                ? `عرض طلبات ${hasStations ? 'محطة' : 'قسم'} ${stationLabel} فقط`
                : 'مراقبة جميع أقسام المطبخ'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/menu"
            className={cn(
              'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors',
              hasStations
                ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20'
                : 'border-border bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground',
            )}
          >
            {hasStations ? '🏭 وضع المحطات' : '📋 وضع الأقسام'}
          </Link>
          <ConnectionDot connected={!isOffline} />
          <RefreshButton onRefresh={refetch} />
        </div>
      </div>

      {/* Stats bar */}
      {totalCount > 0 && (
        <div className="shrink-0 grid grid-cols-4 gap-2">
          <div className="flex items-center gap-2 rounded-xl border bg-card/60 px-3 py-2">
            <LayoutDashboard className="w-4 h-4 text-muted-foreground shrink-0" />
            <div>
              <p className="text-2xl font-black tabular-nums leading-none">{totalCount}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">إجمالي الطلبات</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-zinc-300/40 bg-zinc-50/30 dark:border-zinc-600/30 dark:bg-zinc-900/30 px-3 py-2">
            <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
            <div>
              <p className="text-2xl font-black tabular-nums text-zinc-600 dark:text-zinc-300 leading-none">{pendingCount}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">بانتظار البدء</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-blue-400/40 bg-blue-50/30 dark:border-blue-600/30 dark:bg-blue-950/30 px-3 py-2">
            <Flame className="w-4 h-4 text-blue-500 shrink-0" />
            <div>
              <p className="text-2xl font-black tabular-nums text-blue-600 dark:text-blue-400 leading-none">{preparingCount}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">قيد التحضير</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-50/30 dark:border-emerald-600/30 dark:bg-emerald-950/30 px-3 py-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <div>
              <p className="text-2xl font-black tabular-nums text-emerald-600 dark:text-emerald-400 leading-none">{readyCount}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">جاهزة للتقديم</p>
            </div>
          </div>
        </div>
      )}

      {/* Station tabs */}
      {hasStations && (
        <nav className="shrink-0 flex items-center gap-1 overflow-x-auto rounded-xl border bg-muted/40 p-1">
          <Link href="/kitchen" className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all', !stationParam ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
            <LayoutDashboard className="w-3.5 h-3.5" />جميع الأقسام
          </Link>
          {stations.map((station: any) => (
            <Link key={station.id} href={`/kitchen?station=${station.id}`} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all', stationParam === station.id ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground')}>
              <ChefHat className="w-3.5 h-3.5" />{station.nameAr || station.name}
            </Link>
          ))}
        </nav>
      )}

      {/* Board */}
      <div className="flex-1 overflow-hidden rounded-xl border border-border/40 bg-muted/20 p-2">
        <KitchenBoard
          orders={orders}
          categories={categories}
          filteredCategoryIds={filteredCategoryIds}
          tenantId={tenantId}
          onRefresh={refreshAll}
        />
      </div>
    </div>
  );
}
