'use client';

import { useState, useTransition, useEffect, useCallback, useRef } from 'react';
import { Order, OrderItem, MenuItem, Table } from '@prisma/client';
import { serveOrder, markTableClean, requestBill } from '@/lib/actions/waiter';
import { markCustomerLeft, extendTableReview } from '@/lib/actions/table-review';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getPusherClient } from '@/lib/pusher';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ConnectionDot } from '@/components/ui/connection-dot';
import { EmptyState } from '@/components/ui/empty-state';
import {
    CheckCircle,
    Sparkles,
    BellRing,
    UtensilsCrossed,
    Armchair,
    Clock,
    RefreshCw,
    Volume2,
    VolumeX,
    UserCheck,
    TimerReset,
    ScanEye,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Receipt } from 'lucide-react';

// ── Sound helpers ──────────────────────────────────────────────────────────────
function playOrderReadySound() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        // Two-tone ascending chime
        const tones = [880, 1100];
        tones.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18);
            gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + i * 0.18 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.35);
            osc.start(ctx.currentTime + i * 0.18);
            osc.stop(ctx.currentTime + i * 0.18 + 0.35);
        });
    } catch { /* AudioContext not available */ }
}

function playReviewSound() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        // Three gentle ascending tones
        [700, 850, 1000].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.2);
            gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + i * 0.2 + 0.06);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.3);
            osc.start(ctx.currentTime + i * 0.2);
            osc.stop(ctx.currentTime + i * 0.2 + 0.3);
        });
    } catch { /* AudioContext not available */ }
}

function playCleanTableSound() {
    try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        // Single lower tone for cleaning alert
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'triangle';
        osc.frequency.value = 660;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
    } catch { /* AudioContext not available */ }
}

// ── Reminder schedule (ms after event): immediate, +15s, +30s, +30s ──────────
const REMINDER_SCHEDULE = [0, 15_000, 45_000, 75_000];

function useAlertReminder(
    soundEnabled: boolean,
    playFn: () => void,
    count: number
) {
    const prevCount = useRef(count);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

    const clearTimers = () => {
        timers.current.forEach(clearTimeout);
        timers.current = [];
    };

    useEffect(() => {
        const prev = prevCount.current;
        const curr = count;

        if (curr > prev && soundEnabled) {
            // New event detected — schedule 4 reminders
            clearTimers();
            REMINDER_SCHEDULE.forEach(delay => {
                const t = setTimeout(() => {
                    playFn();
                    if ('vibrate' in navigator) navigator.vibrate([150, 80, 150]);
                }, delay);
                timers.current.push(t);
            });
        } else if (curr < prev) {
            // Event resolved — cancel remaining reminders
            clearTimers();
        }

        prevCount.current = curr;
        return () => { /* cleanup on unmount */ };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [count, soundEnabled]);

    // Cancel timers when component unmounts
    useEffect(() => () => clearTimers(), []);
}

/**
 * Optimistically hide items removed by a confirmed action so the card disappears
 * on the FIRST click, independent of the refetch (which can lose a race and
 * resolve without applying fresh data). An id is pruned as soon as the server
 * list stops reporting it, so a reused id (e.g. a table that becomes dirty again)
 * reappears correctly.
 */
function useOptimisticHide<T extends { id: string }>(items: T[]): {
    visible: T[];
    hide: (id: string) => void;
} {
    const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
    useEffect(() => {
        setHiddenIds(prev => {
            if (prev.size === 0) return prev;
            const present = new Set(items.map(i => i.id));
            const next = new Set<string>();
            prev.forEach(id => { if (present.has(id)) next.add(id); });
            return next.size === prev.size ? prev : next;
        });
    }, [items]);
    const hide = useCallback((id: string) => {
        setHiddenIds(prev => new Set(prev).add(id));
    }, []);
    return { visible: items.filter(i => !hiddenIds.has(i.id)), hide };
}

type ReadyOrder = Order & {
    table: Table | null;
    items: (OrderItem & { menuItem: MenuItem })[];
};

type DirtyTable = Table;

interface WaiterServiceViewProps {
    readyOrders: ReadyOrder[];
    servedOrders: ReadyOrder[];
    dirtyTables: DirtyTable[];
    tablesNeedingReview: Table[];
    tenantId: string;
    serviceMode: string;
    onRefresh?: () => void | Promise<void>;
}

export function WaiterServiceView({ readyOrders: initialOrders, servedOrders: initialServed, dirtyTables: initialDirty, tablesNeedingReview: initialReview, tenantId, serviceMode, onRefresh }: WaiterServiceViewProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [newOrderFlash, setNewOrderFlash] = useState(false);
    const [newCleanFlash, setNewCleanFlash] = useState(false);
    const [pusherConnected, setPusherConnected] = useState(false);

    // Optimistically hide cards removed by a confirmed action so they disappear on
    // the first click (see useOptimisticHide). Each list moves its item elsewhere:
    // served → "قيد الطعام", billed → cashier, cleaned → available, left → "تنظيف".
    const { visible: displayReady, hide: hideServed } = useOptimisticHide(initialOrders);
    const { visible: displayServed, hide: hideBilled } = useOptimisticHide(initialServed);
    const { visible: displayDirty, hide: hideCleaned } = useOptimisticHide(initialDirty);
    const { visible: displayReview, hide: hideLeft } = useOptimisticHide(initialReview);

    // ── Reminder systems ────────────────────────────────────────────────────────
    useAlertReminder(soundEnabled, playOrderReadySound, displayReady.length);
    useAlertReminder(soundEnabled, playCleanTableSound, displayDirty.length);
    useAlertReminder(soundEnabled, playReviewSound, displayReview.length);

    // Detect new ready orders for flash + toast (visual only)
    const prevOrderCount = useRef(displayReady.length);
    useEffect(() => {
        const prev = prevOrderCount.current;
        const curr = displayReady.length;
        if (curr > prev) {
            setNewOrderFlash(true);
            setTimeout(() => setNewOrderFlash(false), 2000);
            toast({
                title: '🔔 طلب جديد جاهز!',
                description: `${curr - prev} طلب جديد جاهز للتسليم`,
            });
            document.title = `(${curr}) لوحة النادل`;
        } else if (curr === 0) {
            document.title = 'لوحة النادل';
        }
        prevOrderCount.current = curr;
    }, [displayReady.length, toast]);

    // Detect new dirty tables for flash (visual only)
    const prevDirtyCount = useRef(displayDirty.length);
    useEffect(() => {
        const prev = prevDirtyCount.current;
        const curr = displayDirty.length;
        if (curr > prev) {
            setNewCleanFlash(true);
            setTimeout(() => setNewCleanFlash(false), 2000);
        }
        prevDirtyCount.current = curr;
    }, [displayDirty.length]);

    // Pusher subscription — refresh when kitchen marks order READY.
    // Prefer the CSR background refetch; fall back to router.refresh() (SSR).
    const refresh = useCallback(
        () => (onRefresh ? onRefresh() : router.refresh()),
        [onRefresh, router],
    );

    useEffect(() => {
        const pusher = getPusherClient();
        if (!pusher) return;

        pusher.connection.bind('connected', () => setPusherConnected(true));
        pusher.connection.bind('disconnected', () => setPusherConnected(false));
        pusher.connection.bind('error', () => setPusherConnected(false));
        if (pusher.connection.state === 'connected') setPusherConnected(true);

        const kitchenChannel = pusher.subscribe(`tenant-${tenantId}-kitchen`);
        kitchenChannel.bind('order-updated', () => refresh());

        const ordersChannel = pusher.subscribe(`tenant-${tenantId}-orders`);
        ordersChannel.bind('order-served', () => refresh());
        ordersChannel.bind('table-dirty', () => refresh());

        return () => {
            kitchenChannel.unbind_all();
            pusher.unsubscribe(`tenant-${tenantId}-kitchen`);
            ordersChannel.unbind_all();
            pusher.unsubscribe(`tenant-${tenantId}-orders`);
        };
    }, [refresh]);

    // Auto-refresh كل 60 ثانية لاكتشاف طاولات تجاوزت وقت المراجعة
    useEffect(() => {
        const interval = setInterval(() => refresh(), 60_000);
        return () => clearInterval(interval);
    }, [refresh]);

    const handleCustomerLeft = (tableId: string) => {
        setLoadingId(tableId);
        startTransition(async () => {
            const result = await markCustomerLeft(tableId);
            if (result.error) {
                toast({ title: 'فشل التحديث', description: result.error, variant: 'destructive' });
            } else {
                toast({ title: '🧹 تم تسجيل المغادرة', description: 'الطاولة جاهزة للتنظيف' });
                hideLeft(tableId);
                void refresh();
            }
            setLoadingId(null);
        });
    };

    const handleExtendReview = (tableId: string) => {
        setLoadingId(tableId + '-extend');
        startTransition(async () => {
            const result = await extendTableReview(tableId, 10);
            if (result.error) {
                toast({ title: 'فشل التمديد', description: result.error, variant: 'destructive' });
            } else {
                toast({ title: '⏰ تم التمديد', description: 'سيتكرر التنبيه بعد 10 دقائق' });
                refresh();
            }
            setLoadingId(null);
        });
    };

    const handleServe = (orderId: string) => {
        setLoadingId(orderId);
        startTransition(async () => {
            // Local offline order living only on this device
            if (orderId.startsWith('local_')) {
                const { setLiveOrderStatus } = await import('@/lib/offline/db');
                await setLiveOrderStatus(orderId, 'SERVED').catch(() => {});
                toast({ title: '✅ تم التسليم', description: 'الطلب وصل للزبون' });
                hideServed(orderId);
                void refresh();
                setLoadingId(null);
                return;
            }
            const result = await serveOrder(orderId);
            if (result.error) {
                toast({ title: 'فشل التحديث', description: result.error, variant: 'destructive' });
            } else {
                toast({ title: '✅ تم التسليم', description: 'الطلب وصل للزبون' });
                hideServed(orderId);
                void refresh();
            }
            setLoadingId(null);
        });
    };

    const handleClean = (tableId: string) => {
        setLoadingId(tableId);
        startTransition(async () => {
            const result = await markTableClean(tableId);
            if (result.error) {
                toast({ title: 'فشل التحديث', description: result.error, variant: 'destructive' });
            } else {
                toast({ title: '🧹 تم التنظيف', description: 'الطاولة أصبحت متاحة' });
                // Hide the card immediately on confirmed success; reconcile the rest
                // via a background refetch we don't await (so the button frees at once).
                hideCleaned(tableId);
                void refresh();
            }
            setLoadingId(null);
        });
    };

    const handleRequestBill = (orderId: string) => {
        setLoadingId(orderId);
        startTransition(async () => {
            const result = await requestBill(orderId);
            if (result.error) {
                toast({ title: 'فشل التحديث', description: result.error, variant: 'destructive' });
            } else {
                toast({ title: '🧾 تم طلب الحساب', description: 'تم إرسال طلب الحساب إلى الكاشير بنجاح' });
                hideBilled(orderId);
                void refresh();
            }
            setLoadingId(null);
        });
    };

    return (
        <div dir="rtl" className="space-y-8 pb-10">

            {/* ── TABLES NEEDING REVIEW (QUICK_SERVICE) ── */}
            {displayReview.length > 0 && (
                <section className="animate-pulse-once">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-amber-500/15 rounded-xl">
                            <ScanEye className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black">تحتاج مراجعة ({displayReview.length})</h2>
                            <p className="text-xs text-muted-foreground">الزبون انتهى أو لا يزال يأكل؟ تحقق وحدّد</p>
                        </div>
                        <Badge className="mr-auto bg-amber-500 text-white hover:bg-amber-600 animate-pulse">
                            {displayReview.length}
                        </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {displayReview.map(table => {
                            const minutesSince = table.occupiedSince
                                ? Math.floor((Date.now() - new Date(table.occupiedSince).getTime()) / 60_000)
                                : 0;
                            return (
                                <div
                                    key={table.id}
                                    className="rounded-2xl border-2 border-amber-400/60 bg-amber-500/5 p-4 space-y-3"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2">
                                            <Armchair className="w-4 h-4 text-amber-500" />
                                            <span className="font-black text-xl">طاولة {table.number}</span>
                                        </div>
                                        <Badge variant="outline" className="font-mono text-amber-700 dark:text-amber-400 border-amber-200 text-xs">
                                            منذ {minutesSince} د
                                        </Badge>
                                    </div>

                                    <div className="flex gap-2">
                                        <Button
                                            className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl text-sm h-10"
                                            disabled={isPending && loadingId === table.id}
                                            onClick={() => handleCustomerLeft(table.id)}
                                        >
                                            <UserCheck className="w-4 h-4" />
                                            {isPending && loadingId === table.id ? '...' : 'غادر الزبون'}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="flex-1 gap-1.5 border-amber-400 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-bold rounded-xl text-sm h-10"
                                            disabled={isPending && loadingId === table.id + '-extend'}
                                            onClick={() => handleExtendReview(table.id)}
                                        >
                                            <TimerReset className="w-4 h-4" />
                                            {isPending && loadingId === table.id + '-extend' ? '...' : 'تمديد 10 د'}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* ── READY ORDERS ── */}
            <section className={cn('transition-all duration-300', newOrderFlash && 'animate-pulse')}>
                <div className="flex items-center gap-3 mb-4">
                    <div className={cn('p-2 rounded-xl transition-colors duration-500', newOrderFlash ? 'bg-green-500/40' : 'bg-green-500/15')}>
                        <BellRing className={cn('w-5 h-5 transition-colors', newOrderFlash ? 'text-green-500' : 'text-green-600 dark:text-green-400')} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black">طلبات جاهزة للتسليم</h2>
                        <p className="text-xs text-muted-foreground">اضغط &quot;تم التسليم&quot; عند إيصال الطلب للزبون</p>
                    </div>
                    {displayReady.length > 0 && (
                        <Badge className="mr-auto bg-green-500 text-white hover:bg-green-600 animate-pulse">
                            {displayReady.length}
                        </Badge>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setSoundEnabled(v => !v)}
                        title={soundEnabled ? 'إيقاف الصوت' : 'تشغيل الصوت'}
                    >
                        {soundEnabled ? <Volume2 className="h-4 w-4 text-green-600" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                    <ConnectionDot connected={pusherConnected} />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={refresh}
                        title="تحديث"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>

                {displayReady.length === 0 ? (
                    <div className="rounded-2xl border border-dashed">
                        <EmptyState
                            icon={UtensilsCrossed}
                            title="لا توجد طلبات جاهزة الآن"
                            description="ستظهر الطلبات هنا فور إتمام المطبخ تحضيرها"
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {displayReady.map(order => {
                            const isTakeaway = !order.tableId;
                            return (
                                <div
                                    key={order.id}
                                    className={cn(
                                        'rounded-2xl border-2 p-4 space-y-3 transition-all duration-300 hover:shadow-md',
                                        isTakeaway
                                            ? 'border-orange-400/50 bg-orange-500/5 hover:border-orange-400'
                                            : 'border-green-400/50 bg-green-500/5 hover:border-green-400'
                                    )}
                                >
                                    {/* Header */}
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                {isTakeaway
                                                    ? <span className="text-lg leading-none">🛵</span>
                                                    : <Armchair className="w-4 h-4 text-primary" />
                                                }
                                                <span className="font-black text-xl">
                                                    {isTakeaway ? 'سفري' : `طاولة ${order.table?.number ?? '—'}`}
                                                </span>
                                            </div>
                                            <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                <Clock className="w-3 h-3" />
                                                {formatDistanceToNow(new Date(order.updatedAt), { addSuffix: true, locale: ar })}
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="font-mono">
                                            #{order.orderNumber}
                                        </Badge>
                                    </div>

                                    {/* Items */}
                                    <div className="space-y-1.5 bg-background/60 rounded-xl p-3 border">
                                        {order.items.map(item => (
                                            <div key={item.id} className="flex justify-between text-sm">
                                                <span className="text-muted-foreground">
                                                    <span className="font-bold text-foreground">{item.quantity}×</span> {item.menuItem.name}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* CTA */}
                                    <Button
                                        className={cn(
                                            'w-full gap-2 text-white font-bold rounded-xl',
                                            isTakeaway
                                                ? 'bg-orange-600 hover:bg-orange-700'
                                                : 'bg-green-600 hover:bg-green-700'
                                        )}
                                        disabled={isPending && loadingId === order.id}
                                        onClick={() => handleServe(order.id)}
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        {isPending && loadingId === order.id
                                            ? 'جاري التحديث...'
                                            : isTakeaway ? 'تم تسليم السفري 🛵' : 'تم التسليم للزبون'
                                        }
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* ── SERVED ORDERS (WAITING FOR BILL) — TABLE_SERVICE فقط ── */}
            {serviceMode !== 'QUICK_SERVICE' && displayServed.length > 0 && (
                <section>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-500/15 rounded-xl">
                            <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black">طاولات قيد الطعام</h2>
                            <p className="text-xs text-muted-foreground">اضغط &quot;طلب الحساب&quot; عندما يطلب الزبون الفاتورة</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {displayServed.map(order => (
                            <div
                                key={order.id}
                                className={cn(
                                    'rounded-2xl border-2 border-blue-400/50 bg-blue-500/5 p-4 space-y-3',
                                    'transition-all duration-300'
                                )}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2">
                                        <Armchair className="w-4 h-4 text-blue-500" />
                                        <span className="font-black text-xl">
                                            طاولة {order.table?.number ?? '—'}
                                        </span>
                                    </div>
                                    <Badge variant="outline" className="font-mono text-blue-700 dark:text-blue-400 border-blue-200">
                                        #{order.orderNumber}
                                    </Badge>
                                </div>

                                <Button
                                    className="w-full gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl"
                                    disabled={isPending && loadingId === order.id}
                                    onClick={() => handleRequestBill(order.id)}
                                >
                                    <Receipt className="w-4 h-4" />
                                    {isPending && loadingId === order.id ? 'جاري الطلب...' : 'طلب الحساب للكاشير 🧾'}
                                </Button>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ── DIRTY TABLES ── */}
            <section className={cn('transition-all duration-300', newCleanFlash && 'animate-pulse')}>
                <div className="flex items-center gap-3 mb-4">
                    <div className={cn('p-2 rounded-xl transition-colors duration-500', newCleanFlash ? 'bg-orange-500/40' : 'bg-orange-500/15')}>
                        <Sparkles className={cn('w-5 h-5 transition-colors', newCleanFlash ? 'text-orange-500' : 'text-orange-600 dark:text-orange-400')} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black">طاولات تحتاج تنظيف</h2>
                        <p className="text-xs text-muted-foreground">اضغط &quot;تم التنظيف&quot; لإعادة الطاولة للخدمة</p>
                    </div>
                    {displayDirty.length > 0 && (
                        <Badge variant="secondary" className="mr-auto bg-orange-500 text-white hover:bg-orange-600">
                            {displayDirty.length}
                        </Badge>
                    )}
                </div>

                {displayDirty.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-12 rounded-2xl border border-dashed text-muted-foreground">
                        <Sparkles className="w-10 h-10 opacity-30" />
                        <p className="text-sm">كل الطاولات نظيفة 🎉</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                        {displayDirty.map(table => (
                            <div
                                key={table.id}
                                className="rounded-2xl border-2 border-orange-400/50 bg-orange-500/5 p-4 flex flex-col items-center gap-3 text-center"
                            >
                                <Armchair className="w-8 h-8 text-orange-500" />
                                <div>
                                    <p className="font-black text-2xl">{table.number}</p>
                                    <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">تحتاج تنظيف</p>
                                </div>
                                <Button
                                    size="sm"
                                    className="w-full gap-1.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl"
                                    disabled={isPending && loadingId === table.id}
                                    onClick={() => handleClean(table.id)}
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    {isPending && loadingId === table.id ? '...' : 'تم التنظيف'}
                                </Button>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
