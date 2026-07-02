'use client';

import { useCallback, useEffect, useState } from 'react';
import { getOrderLog, type OrderLogEntry } from '@/lib/offline/db';
import { onSyncStateChange } from '@/lib/offline/queue';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  ScrollText,
  CloudUpload,
  CheckCircle2,
  AlertTriangle,
  Armchair,
  ShoppingBag,
  Bike,
  UtensilsCrossed,
  ChefHat,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  PENDING:   { label: 'انتظار',     className: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-900/60 dark:text-zinc-300 dark:border-zinc-700' },
  PREPARING: { label: 'قيد التحضير', className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800' },
  READY:     { label: 'جاهز',       className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800' },
  SERVED:    { label: 'تم التقديم',  className: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800' },
  COMPLETED: { label: 'مكتمل',      className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800' },
};

const SYNC_BADGE = {
  synced:  { label: 'مُزامَن',          Icon: CheckCircle2,  className: 'text-emerald-600 dark:text-emerald-400' },
  pending: { label: 'بانتظار المزامنة', Icon: CloudUpload,   className: 'text-amber-600 dark:text-amber-400' },
  failed:  { label: 'فشلت المزامنة',    Icon: AlertTriangle, className: 'text-red-600 dark:text-red-400' },
} as const;

const TYPE_META = {
  DINE_IN:  { label: 'محلي',  Icon: Armchair },
  TAKEAWAY: { label: 'سفري',  Icon: ShoppingBag },
  DELIVERY: { label: 'توصيل', Icon: Bike },
} as const;

function LogEntryCard({ entry }: { entry: OrderLogEntry }) {
  const status = STATUS_BADGE[entry.status] ?? STATUS_BADGE.PENDING;
  const sync = SYNC_BADGE[entry.sync] ?? SYNC_BADGE.pending;
  const typeMeta = TYPE_META[entry.orderType] ?? TYPE_META.DINE_IN;
  const SourceIcon = entry.source === 'captain' ? UtensilsCrossed : ChefHat;

  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-black tabular-nums text-sm shrink-0">
            {entry.orderNumber ? `#${entry.orderNumber}` : 'طلب محلي'}
          </span>
          <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[10px] shrink-0">
            <SourceIcon className="h-3 w-3" />
            {entry.source === 'captain' ? 'الكابتن' : 'الكاشير'}
          </Badge>
          <Badge variant="outline" className="h-5 gap-1 px-1.5 text-[10px] shrink-0">
            <typeMeta.Icon className="h-3 w-3" />
            {entry.tableName ? `طاولة ${entry.tableName}` : typeMeta.label}
          </Badge>
        </div>
        <Badge variant="outline" className={cn('h-5 px-2 text-[10px] shrink-0', status.className)}>
          {status.label}
        </Badge>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {entry.itemsCount} صنف · <span className="font-bold text-foreground tabular-nums">{entry.total.toLocaleString('en-US')}</span>
        </span>
        <span className={cn('flex items-center gap-1', sync.className)}>
          <sync.Icon className={cn('h-3.5 w-3.5', entry.sync === 'pending' && 'animate-pulse')} />
          {sync.label}
        </span>
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground border-t pt-1.5">
        <span className="tabular-nums" dir="ltr">{format(entry.createdAt, 'HH:mm')}</span>
        <span>{formatDistanceToNow(entry.createdAt, { addSuffix: true, locale: ar })}</span>
      </div>
    </div>
  );
}

/**
 * Floating on-device order log — every order created from this device
 * (cashier/captain, online or offline) with its status, sync state and time.
 * Mounted on all five operational layouts.
 */
export function OrderLog({ tenantId }: { tenantId?: string }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<OrderLogEntry[]>([]);
  const [attention, setAttention] = useState(0); // pending+failed → badge on the button

  const reload = useCallback(async () => {
    if (!tenantId) return;
    const log = await getOrderLog(tenantId).catch(() => [] as OrderLogEntry[]);
    setEntries(log);
    setAttention(log.filter((e) => e.sync !== 'synced').length);
  }, [tenantId]);

  // Keep the badge fresh: on mount, whenever the sync queue changes state, and
  // on a slow interval while the sheet is open.
  useEffect(() => {
    reload();
    const unsub = onSyncStateChange(() => { reload(); });
    return () => { unsub(); };
  }, [reload]);

  useEffect(() => {
    if (!open) return;
    reload();
    const id = setInterval(reload, 15000);
    return () => clearInterval(id);
  }, [open, reload]);

  if (!tenantId) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className="fixed bottom-4 right-4 z-[95] flex items-center gap-2 rounded-full border bg-card/95 px-4 py-2.5 shadow-lg backdrop-blur transition-colors hover:bg-accent"
          aria-label="سجل الطلبات"
        >
          <ScrollText className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold">سجل الطلبات</span>
          {attention > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white tabular-nums">
              {attention}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:max-w-md p-0 flex flex-col" dir="rtl">
        <SheetHeader className="border-b p-4 text-right">
          <SheetTitle className="flex items-center gap-2 text-base">
            <ScrollText className="h-5 w-5 text-primary" />
            سجل الطلبات على هذا الجهاز
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            الطلبات المنشأة من هذا الجهاز — الحالة، حالة المزامنة، والوقت
          </p>
        </SheetHeader>
        <ScrollArea className="flex-1">
          <div className="space-y-2 p-4">
            {entries.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">
                لا توجد طلبات مسجّلة بعد — ستظهر هنا الطلبات المنشأة من هذا الجهاز
              </div>
            ) : (
              entries.map((entry) => <LogEntryCard key={entry.id} entry={entry} />)
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
