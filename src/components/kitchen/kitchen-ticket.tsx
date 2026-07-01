'use client';

import { Order, OrderItem, MenuItem, Table, OrderItemModifier, ModifierOption } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { updateKitchenItemStatus } from '@/lib/actions/kitchen';
import { useTransition, useEffect, useState, useOptimistic } from 'react';
import { differenceInMinutes } from 'date-fns';
import { Check, Flame, Loader2, Clock, AlertTriangle, ChefHat, Bike } from 'lucide-react';
import { cn } from '@/lib/utils';

type OrderItemModifierWithOption = OrderItemModifier & { modifierOption: ModifierOption };
type KitchenOrderItem = OrderItem & {
    menuItem: MenuItem;
    modifiers?: OrderItemModifierWithOption[];
};

interface KitchenTicketProps {
    order: Order & { table: Table | null };
    items: KitchenOrderItem[];
    categoryName?: string;
    onRefresh?: () => void | Promise<void>;
    tenantId?: string;
}

export function KitchenTicket({ order, items, onRefresh, tenantId }: KitchenTicketProps) {
    const [isPending, startTransition] = useTransition();
    const [elapsed, setElapsed] = useState(0);

    const getInitialStatus = () => {
        const allReady = items.every(i => i.status === 'READY' || i.status === 'SERVED' || i.status === 'COMPLETED');
        const anyPreparing = items.some(i => i.status === 'PREPARING');
        if (allReady) return 'READY';
        if (anyPreparing) return 'PREPARING';
        return 'PENDING';
    };

    const [optimisticStatus, setOptimisticStatus] = useOptimistic(
        getInitialStatus(),
        (_state, newStatus: string) => newStatus
    );

    useEffect(() => {
        const update = () => setElapsed(differenceInMinutes(new Date(), new Date(order.createdAt)));
        update();
        const interval = setInterval(update, 30000);
        return () => clearInterval(interval);
    }, [order.createdAt]);

    const isLocal = (order as any)._local === true;

    const handleAction = () => {
        startTransition(async () => {
            const nextStatus = optimisticStatus === 'PENDING' ? 'PREPARING' : 'READY';
            setOptimisticStatus(nextStatus);
            const itemIds = items.map(i => i.id);
            try {
                if (isLocal) {
                    // Offline order living only on this device — update it locally
                    const { updateLiveOrderItems } = await import('@/lib/offline/db');
                    await updateLiveOrderItems(order.id, itemIds, nextStatus);
                } else {
                    await updateKitchenItemStatus(itemIds, nextStatus);
                }
            } catch {
                // Online order but DB unreachable → queue so the update isn't lost
                const { enqueue } = await import('@/lib/offline/db');
                for (const id of itemIds) {
                    await enqueue({
                        type: 'UPDATE_ITEM_STATUS',
                        tenantId: tenantId ?? (order as any).tenantId ?? '',
                        payload: { orderId: order.id, itemId: id, status: nextStatus },
                    }).catch(() => {});
                }
            }
            // Refetch so the parent's `items` reflect the new status. Awaited inside
            // the transition so useOptimistic holds the new state until fresh data
            // arrives — without this the button visibly reverts to its old label.
            await onRefresh?.();
        });
    };

    const isLate    = elapsed > 15;
    const isWarning = elapsed >= 10 && elapsed <= 15;

    const scheme = optimisticStatus === 'READY'
        ? {
            strip: 'bg-emerald-500',
            card:  'border-emerald-400/50 bg-emerald-50/10 dark:bg-emerald-950/15',
            time:  'bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
            badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
          }
        : optimisticStatus === 'PREPARING'
        ? {
            strip: 'bg-blue-500',
            card:  'border-blue-400/50 bg-blue-50/10 dark:bg-blue-950/15',
            time:  'bg-blue-100/80 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
            badge: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
          }
        : isLate
        ? {
            strip: 'bg-red-500 animate-pulse',
            card:  'border-red-400/60 bg-red-50/20 dark:bg-red-950/20',
            time:  'bg-red-100/80 text-red-700 dark:bg-red-900/40 dark:text-red-300',
            badge: 'bg-red-500/15 text-red-700 dark:text-red-300',
          }
        : isWarning
        ? {
            strip: 'bg-amber-400',
            card:  'border-amber-400/50 bg-amber-50/10 dark:bg-amber-950/15',
            time:  'bg-amber-100/80 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
            badge: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
          }
        : {
            strip: 'bg-zinc-400',
            card:  'border-border bg-card',
            time:  'bg-muted text-muted-foreground',
            badge: 'bg-muted text-muted-foreground',
          };

    return (
        <div className={cn(
            'flex flex-col rounded-lg border shadow-sm overflow-hidden',
            scheme.card
        )}>
            {/* ── Status strip ── */}
            <div className={cn('h-1 w-full shrink-0', scheme.strip)} />

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-2.5 pt-2 pb-1.5 border-b border-border/40">
                <div className="flex items-center gap-2 min-w-0">
                    {/* Order number */}
                    <span className="text-xl font-black tabular-nums leading-none text-foreground shrink-0">
                        #{order.orderNumber}
                    </span>

                    {/* Divider */}
                    <span className="text-border/60 text-sm select-none">|</span>

                    {/* Table / delivery */}
                    <div className="flex items-center gap-1 min-w-0">
                        {order.tableId
                            ? <>
                                <ChefHat className="w-3 h-3 text-muted-foreground shrink-0" />
                                <span className="text-xs font-semibold text-muted-foreground truncate">
                                    طاولة {order.table?.number}
                                </span>
                              </>
                            : <>
                                <Bike className="w-3 h-3 text-muted-foreground shrink-0" />
                                <span className="text-xs font-semibold text-muted-foreground">سفري</span>
                              </>
                        }
                    </div>
                </div>

                {/* Elapsed time */}
                <div className={cn(
                    'flex items-center gap-1 px-2 py-1 rounded-md shrink-0',
                    scheme.time
                )}>
                    {isLate
                        ? <AlertTriangle className="w-3 h-3 shrink-0" />
                        : <Clock className="w-3 h-3 shrink-0" />
                    }
                    <span className="text-sm font-black tabular-nums leading-none">{elapsed}</span>
                    <span className="text-[10px] font-bold leading-none">د</span>
                </div>
            </div>

            {/* ── Items list ── */}
            <div className="flex-1 px-2.5 py-2 space-y-1.5 overflow-y-auto min-h-0">
                {items.map(item => (
                    <div key={item.id} className="flex items-start gap-2 pb-1.5 border-b border-border/30 last:border-0 last:pb-0">
                        {/* Qty badge */}
                        <span className={cn(
                            'flex items-center justify-center w-6 h-6 rounded-md text-xs font-black shrink-0 mt-0.5',
                            optimisticStatus === 'READY'
                                ? 'bg-emerald-500 text-white'
                                : 'bg-primary text-primary-foreground'
                        )}>
                            {item.quantity}
                        </span>

                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold leading-tight text-foreground">
                                {item.menuItem.nameAr || item.menuItem.name}
                            </p>

                            {item.modifiers && item.modifiers.length > 0 && (
                                <div className="mt-0.5 flex flex-wrap gap-1">
                                    {item.modifiers.map(mod => (
                                        <span key={mod.id} className="text-[10px] text-blue-700 bg-blue-50 dark:bg-blue-950 dark:text-blue-300 px-1 py-0.5 rounded font-medium leading-tight">
                                            +{mod.modifierOption.nameAr || mod.modifierOption.name}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {item.notes && (
                                <p className="text-[10px] font-bold text-amber-800 bg-amber-100 dark:bg-amber-950 dark:text-amber-200 inline-flex items-center gap-0.5 px-1 py-0.5 mt-0.5 rounded leading-tight">
                                    ⚠ {item.notes}
                                </p>
                            )}
                        </div>
                    </div>
                ))}

                {/* Order note */}
                {order.note && (
                    <div className="px-2 py-1.5 bg-amber-50 dark:bg-amber-950/60 border border-amber-300/50 rounded-md text-amber-800 dark:text-amber-200 font-semibold text-xs flex items-start gap-1">
                        <span className="shrink-0 text-[11px]">📝</span>
                        <span className="leading-snug">{order.note}</span>
                    </div>
                )}
            </div>

            {/* ── Action button ── */}
            <div className="px-2 pb-2 pt-1.5 border-t border-border/30 bg-card/30">
                {optimisticStatus === 'PENDING' && (
                    <Button
                        size="sm"
                        className="w-full h-8 text-xs font-bold gap-1.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground"
                        onClick={handleAction}
                        disabled={isPending}
                    >
                        <Flame className="w-3.5 h-3.5" />
                        بدء التحضير
                    </Button>
                )}
                {optimisticStatus === 'PREPARING' && (
                    <Button
                        size="sm"
                        className="w-full h-8 text-xs font-bold gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={handleAction}
                        disabled={isPending}
                    >
                        {isPending
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Check className="w-3.5 h-3.5" />
                        }
                        {isPending ? 'جاري الحفظ...' : 'جاهز للتقديم'}
                    </Button>
                )}
                {optimisticStatus === 'READY' && (
                    <div className="w-full h-8 rounded-lg bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center gap-1.5 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                        <Check className="w-3.5 h-3.5" />
                        جاهز ✓
                    </div>
                )}
            </div>
        </div>
    );
}
