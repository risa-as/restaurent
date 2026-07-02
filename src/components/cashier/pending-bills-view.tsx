'use client';

import { useState, useTransition, useEffect, useCallback, useRef } from 'react';
import { settleTableBill } from '@/lib/actions/cashier';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getPusherClient } from '@/lib/pusher';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Armchair, Banknote, CreditCard, Clock, Receipt, SplitSquareHorizontal, ListOrdered, Bell } from 'lucide-react';
import { SplitBillDrawer } from '@/components/cashier/split-bill-drawer';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useFmt } from '@/contexts/number-locale-context';

interface OrderItem {
    id: string;
    quantity: number;
    menuItem: { name: string; price: number };
}

interface PendingBill {
    id: string;
    table: { number: string } | null;
    items: OrderItem[];
    totalAmount: number;
    tax: number;
    serviceFee: number;
    orderNumber: number;
    billRequestedAt: Date | null;
    billRequested?: boolean;
    status?: string;
}

interface PendingBillsViewProps {
    bills: PendingBill[];
    activeOrders?: PendingBill[];
    tenantId: string;
    shiftId?: string;
    onRefresh?: () => void | Promise<void>;
}

type ViewMode = 'pending' | 'all';

export function PendingBillsView({ bills: initialBills, activeOrders = [], tenantId, shiftId, onRefresh }: PendingBillsViewProps) {
    const fmt = useFmt();
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [loadingId, setLoadingId] = useState<string | null>(null);
    const [splitOrderId, setSplitOrderId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<ViewMode>('pending');
    // Orders removed optimistically after a confirmed settle, so the card
    // disappears instantly instead of waiting for the heavy background refetch.
    // Order ids are unique (never reused), so a lingering id can't hide a future order.
    const [settledIds, setSettledIds] = useState<Set<string>>(new Set());
    const splitBill = initialBills.find(b => b.id === splitOrderId) || activeOrders.find(b => b.id === splitOrderId);

    // Prefer the CSR background refetch; fall back to router.refresh() (SSR).
    const refresh = useCallback(
        () => (onRefresh ? onRefresh() : router.refresh()),
        [onRefresh, router],
    );
    const refreshRef = useRef(refresh);
    refreshRef.current = refresh;

    useEffect(() => {
        const pusher = getPusherClient();
        if (!pusher) return;

        const cashierChannel = pusher.subscribe(`tenant-${tenantId}-cashier`);

        cashierChannel.bind('bill-requested', () => {
            refreshRef.current();
            if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
        });

        cashierChannel.bind('bill-settled', () => refreshRef.current());

        return () => {
            cashierChannel.unbind_all();
            pusher.unsubscribe(`tenant-${tenantId}-cashier`);
        };
    }, [tenantId]);

    const handleSettle = (orderId: string, paymentMethod: 'CASH' | 'CARD') => {
        setLoadingId(orderId);
        startTransition(async () => {
            // Offline path: queue a CLOSE_BILL — the sync endpoint runs the full
            // settle (bill + shift totals + stock + loyalty) when back online.
            const queueOffline = async () => {
                const { enqueue } = await import('@/lib/offline/db');
                await enqueue({ type: 'CLOSE_BILL', tenantId, payload: { orderId, paymentMethod } });
                setSettledIds(prev => new Set(prev).add(orderId));
                toast({ title: 'تم حفظ التحصيل محلياً', description: 'ستُسوى الفاتورة تلقائياً عند عودة الإنترنت' });
            };
            try {
                if (typeof navigator !== 'undefined' && !navigator.onLine) {
                    await queueOffline();
                    return;
                }
                const result = await settleTableBill(orderId, paymentMethod, shiftId);
                if (result.error) {
                    toast({ title: 'فشل التحديث', description: result.error, variant: 'destructive' });
                } else {
                    toast({ title: '✅ تم تسوية الحساب', description: 'الطلب اكتمل، الطاولة بانتظار التنظيف' });
                    // Card gone immediately on confirmed success; reconcile the rest
                    // (table status, totals) via a background refetch we don't await.
                    setSettledIds(prev => new Set(prev).add(orderId));
                    void refresh();
                }
            } catch {
                // Network failure mid-request — keep the settle, sync later.
                await queueOffline();
            } finally {
                setLoadingId(null);
            }
        });
    };

    const pendingBillIds = new Set(initialBills.map(b => b.id));
    // For "all" tab, show active orders that are NOT already in pending bills
    const otherActiveOrders = activeOrders.filter(o => !pendingBillIds.has(o.id));
    const displayOrders = (viewMode === 'pending' ? initialBills : [...initialBills, ...otherActiveOrders])
        .filter(o => !settledIds.has(o.id));

    const statusConfig: Record<string, { label: string; color: string }> = {
        PENDING: { label: 'انتظار', color: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300' },
        PREPARING: { label: 'تحضير', color: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300' },
        READY: { label: 'جاهز', color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-300' },
        SERVED: { label: 'تم التقديم', color: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300' },
    };

    return (
        <>
        {/* View Mode Tabs */}
        <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
                <button
                    onClick={() => setViewMode('pending')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        viewMode === 'pending'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <Bell className="w-4 h-4" />
                    طلبات الحساب
                    {initialBills.length > 0 && (
                        <Badge variant="secondary" className={`h-5 px-1.5 text-[10px] ${viewMode === 'pending' ? 'bg-primary-foreground/20 text-primary-foreground' : ''}`}>
                            {initialBills.length}
                        </Badge>
                    )}
                </button>
                <button
                    onClick={() => setViewMode('all')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                        viewMode === 'all'
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <ListOrdered className="w-4 h-4" />
                    كل الطلبات النشطة
                    {activeOrders.length > 0 && (
                        <Badge variant="secondary" className={`h-5 px-1.5 text-[10px] ${viewMode === 'all' ? 'bg-primary-foreground/20 text-primary-foreground' : ''}`}>
                            {activeOrders.length}
                        </Badge>
                    )}
                </button>
            </div>
        </div>

        {displayOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 text-muted-foreground border-2 border-dashed rounded-xl">
                <Receipt className="w-12 h-12 mb-4 opacity-20" />
                <p>{viewMode === 'pending' ? 'لا توجد طاولات في انتظار الحساب' : 'لا توجد طلبات نشطة حالياً'}</p>
            </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {displayOrders.map(bill => {
                const total = bill.totalAmount + bill.tax + bill.serviceFee;
                const isBillRequested = bill.billRequested || pendingBillIds.has(bill.id);
                const orderStatus = (bill as any).status as string | undefined;
                const canSettle = orderStatus === 'READY' || orderStatus === 'SERVED' || isBillRequested;

                return (
                    <Card key={bill.id} className={`border-2 shadow-md ${isBillRequested ? 'border-primary/20' : 'border-border/60'}`}>
                        <CardContent className="p-0 flex flex-col h-full">
                            {/* Header */}
                            <div className={`px-4 py-3 border-b flex items-center justify-between ${isBillRequested ? 'bg-muted' : 'bg-muted/40'}`}>
                                <div className="flex items-center gap-2">
                                    <div className={`p-2 rounded-lg ${isBillRequested ? 'bg-primary/10 text-primary' : 'bg-muted-foreground/10 text-muted-foreground'}`}>
                                        <Armchair className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="font-black text-lg">طاولة {bill.table?.number ?? 'غ/م'}</p>
                                        {bill.billRequestedAt && isBillRequested && (
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                منذ {formatDistanceToNow(new Date(bill.billRequestedAt), { addSuffix: false, locale: ar })}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {orderStatus && statusConfig[orderStatus] && (
                                        <Badge variant="outline" className={`text-[10px] ${statusConfig[orderStatus].color}`}>
                                            {statusConfig[orderStatus].label}
                                        </Badge>
                                    )}
                                    {isBillRequested && (
                                        <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px]">
                                            <Bell className="w-3 h-3 ml-1" />
                                            طلب حساب
                                        </Badge>
                                    )}
                                    <Badge variant="outline" className="font-mono text-sm">
                                        #{bill.orderNumber}
                                    </Badge>
                                </div>
                            </div>

                            {/* Items Scroll */}
                            <div className="p-4 flex-1 space-y-3 max-h-48 overflow-y-auto">
                                {bill.items.map(item => (
                                    <div key={item.id} className="flex justify-between text-sm items-center">
                                        <div className="flex gap-2 text-muted-foreground">
                                            <span className="font-bold text-foreground">{item.quantity}×</span>
                                            <span>{item.menuItem.name}</span>
                                        </div>
                                        <div className="font-mono font-medium">
                                            {fmt(item.menuItem.price * item.quantity)}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer & Actions */}
                            <div className="p-4 border-t bg-muted/30">
                                <div className="flex justify-between items-end mb-4">
                                    <span className="font-bold text-muted-foreground">المجموع الكلي</span>
                                    <span className="text-3xl font-black text-primary font-mono">
                                        {fmt(total)} <span className="text-sm text-foreground font-normal whitespace-nowrap">د.ع</span>
                                    </span>
                                </div>

                                {canSettle ? (
                                    <div className="grid grid-cols-3 gap-2">
                                        <Button
                                            variant="default"
                                            className="w-full gap-2 h-12"
                                            disabled={isPending && loadingId === bill.id}
                                            onClick={() => handleSettle(bill.id, 'CASH')}
                                        >
                                            <Banknote className="w-5 h-5" />
                                            دفع نقدي
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="w-full gap-2 h-12 border-primary/20 hover:bg-primary/5"
                                            disabled={isPending && loadingId === bill.id}
                                            onClick={() => handleSettle(bill.id, 'CARD')}
                                        >
                                            <CreditCard className="w-5 h-5" />
                                            بطاقة دفع
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            className="w-full gap-2 h-12"
                                            onClick={() => setSplitOrderId(bill.id)}
                                        >
                                            <SplitSquareHorizontal className="w-5 h-5" />
                                            تقسيم
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="text-center text-sm text-muted-foreground py-2 bg-muted/50 rounded-lg">
                                        ⏳ لا يزال قيد التحضير في المطبخ
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
        )}

        {splitBill && (
            <SplitBillDrawer
                open={!!splitOrderId}
                onOpenChange={open => { if (!open) setSplitOrderId(null); }}
                orderId={splitBill.id}
                totalAmount={splitBill.totalAmount + splitBill.tax + splitBill.serviceFee}
                items={splitBill.items as unknown as Parameters<typeof SplitBillDrawer>[0]['items']}
                onSettled={() => refresh()}
            />
        )}
        </>
    );
}

