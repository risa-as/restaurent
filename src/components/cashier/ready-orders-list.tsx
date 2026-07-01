'use client';

import { Order, OrderItem, MenuItem, Table, Delivery, User, Bill } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Receipt } from '@/components/orders/receipt';
import { markOrderAsPaid, getCashierOrders } from '@/lib/actions/cashier';
import { DollarSign, RefreshCw, Utensils, Truck, ShoppingBag, CheckCircle2, Banknote, CreditCard, CheckCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState, useTransition, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

type OrderWithDetails = Order & {
    items: (OrderItem & { menuItem: MenuItem })[];
    table: Table | null;
    delivery: (Delivery & { driver: User | null }) | null;
    bills?: Pick<Bill, 'id'>[];
};

interface ReadyOrdersListProps {
    initialOrders: OrderWithDetails[];
    shiftId?: string;
}

export function ReadyOrdersList({ initialOrders, shiftId }: ReadyOrdersListProps) {
    const [orders, setOrders] = useState<OrderWithDetails[]>(initialOrders);
    const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CASH');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    useEffect(() => {
        const fetchOrders = async () => {
            const freshOrders = await getCashierOrders();
            setOrders(freshOrders);
        };
        fetchOrders();
        const interval = setInterval(fetchOrders, 10000);
        return () => clearInterval(interval);
    }, []);

    const printingOrderId = useRef<string | null>(null);

    useEffect(() => {
        const onAfterPrint = () => {
            if (printingOrderId.current) {
                handlePayment(printingOrderId.current);
                printingOrderId.current = null;
            }
        };
        window.addEventListener('afterprint', onAfterPrint);
        return () => window.removeEventListener('afterprint', onAfterPrint);
    });

    const handlePayment = async (orderId: string, method?: 'CASH' | 'CARD') => {
        const pm = method ?? paymentMethod;
        startTransition(async () => {
            const res = await markOrderAsPaid(orderId, pm as any, shiftId);
            if (res?.error) {
                toast({ variant: 'destructive', title: 'تعذّر تحصيل الفاتورة', description: res.error });
                return;
            }
            setOrders(prev => prev.filter(o => o.id !== orderId));
            if (selectedOrder?.id === orderId) setSelectedOrder(null);
            toast({
                title: 'تمت المحاسبة',
                description: pm === 'CASH' ? 'تم استلام المبلغ نقداً' : 'تم استلام المبلغ بالبطاقة',
            });
        });
    };

    const refresh = async () => {
        setIsRefreshing(true);
        const fresh = await getCashierOrders();
        setOrders(fresh);
        setIsRefreshing(false);
    };

    const getOrderMeta = (order: OrderWithDetails) => {
        if (order.table) return { icon: Utensils, label: `طاولة ${order.table.number}`, color: 'text-blue-500' };
        if (order.delivery) return { icon: Truck, label: 'توصيل', color: 'text-green-500' };
        return { icon: ShoppingBag, label: 'سفري', color: 'text-orange-500' };
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="shrink-0 px-4 py-3 border-b flex items-center justify-between bg-muted/20">
                <div className="flex flex-col">
                    <span className="text-sm font-bold">الطلبات الجاهزة</span>
                    <span className="text-xs text-muted-foreground">{orders.length} طلب</span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={refresh}
                    disabled={isRefreshing}
                    title="تحديث"
                >
                    <RefreshCw className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
                </Button>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Order List */}
                <ScrollArea className="flex-1">
                    <div className="p-2 space-y-1.5">
                        {orders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                                <CheckCircle2 className="w-8 h-8 opacity-20" />
                                <p className="text-xs">لا توجد طلبات</p>
                            </div>
                        ) : (
                            orders.map(order => {
                                const meta = getOrderMeta(order);
                                const MetaIcon = meta.icon;
                                const isSelected = selectedOrder?.id === order.id;
                                const isReady = order.status === 'READY';

                                return (
                                    <button
                                        key={order.id}
                                        onClick={() => setSelectedOrder(order)}
                                        className={cn(
                                            'w-full text-right p-3 rounded-xl border-2 transition-all text-sm',
                                            isSelected
                                                ? 'border-primary bg-primary/8 shadow-sm'
                                                : 'border-border bg-card hover:border-primary/40 hover:bg-muted/30'
                                        )}
                                    >
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="font-black text-base">#{order.orderNumber}</span>
                                            <div className="flex items-center gap-1">
                                                {order.bills && order.bills.length > 0 && (
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                                        مدفوع
                                                    </span>
                                                )}
                                                <span className={cn(
                                                    'text-[10px] font-bold px-2 py-0.5 rounded-full',
                                                    isReady
                                                        ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                                                        : 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400'
                                                )}>
                                                    {isReady ? 'جاهز' : 'بانتظار الدفع'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <div className={cn('flex items-center gap-1', meta.color)}>
                                                <MetaIcon className="w-3 h-3" />
                                                <span>{meta.label}</span>
                                            </div>
                                            <span className="font-bold text-foreground">{order.totalAmount.toFixed(0)} د.ع</span>
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </ScrollArea>

                {/* Order Detail */}
                {selectedOrder ? (
                    <div className="shrink-0 border-t bg-muted/10 flex flex-col max-h-[60%]">
                        <ScrollArea className="flex-1 px-3 pt-3">
                            <div className="flex items-center justify-between mb-3">
                                <span className="font-black text-primary text-lg">#{selectedOrder.orderNumber}</span>
                                <span className="text-xs text-muted-foreground">
                                    {getOrderMeta(selectedOrder).label}
                                </span>
                            </div>
                            <div className="space-y-1.5 pb-2">
                                {selectedOrder.items.map(item => (
                                    <div key={item.id} className="flex justify-between items-center text-xs py-1.5 border-b border-dashed last:border-0">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] font-black">
                                                ×{item.quantity}
                                            </span>
                                            <span className="truncate max-w-[100px] font-medium">{item.menuItem.name}</span>
                                        </div>
                                        <span className="font-bold">{item.totalPrice.toFixed(0)}</span>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                        <div className="px-3 pb-3 pt-2 space-y-2 border-t">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">الإجمالي</span>
                                <span className="text-lg font-black text-primary">{selectedOrder.totalAmount.toFixed(0)} د.ع</span>
                            </div>

                            {selectedOrder.bills && selectedOrder.bills.length > 0 ? (
                                /* Already paid — just complete the pickup */
                                <>
                                    <div className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold border border-emerald-500/30">
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        تم الدفع مسبقاً
                                    </div>
                                    <Button
                                        className="w-full h-10 font-bold gap-2 bg-emerald-600 hover:bg-emerald-700"
                                        onClick={() => handlePayment(selectedOrder.id)}
                                        disabled={isPending}
                                    >
                                        <CheckCheck className="w-4 h-4" />
                                        {isPending ? 'جاري التحديث...' : 'إتمام التسليم'}
                                    </Button>
                                </>
                            ) : (
                                /* Not yet paid — show payment method + collect button */
                                <>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <button
                                            onClick={() => setPaymentMethod('CASH')}
                                            className={cn(
                                                'flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-bold transition-all',
                                                paymentMethod === 'CASH'
                                                    ? 'bg-emerald-500 text-white border-emerald-500'
                                                    : 'border-border text-muted-foreground hover:border-emerald-400'
                                            )}
                                        >
                                            <Banknote className="w-3.5 h-3.5" />
                                            نقد
                                        </button>
                                        <button
                                            onClick={() => setPaymentMethod('CARD')}
                                            className={cn(
                                                'flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-bold transition-all',
                                                paymentMethod === 'CARD'
                                                    ? 'bg-blue-500 text-white border-blue-500'
                                                    : 'border-border text-muted-foreground hover:border-blue-400'
                                            )}
                                        >
                                            <CreditCard className="w-3.5 h-3.5" />
                                            بطاقة
                                        </button>
                                    </div>
                                    <Button
                                        className={cn(
                                            'w-full h-10 font-bold gap-2',
                                            paymentMethod === 'CASH'
                                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                                : 'bg-blue-600 hover:bg-blue-700'
                                        )}
                                        onClick={() => handlePayment(selectedOrder.id)}
                                        disabled={isPending}
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        {isPending ? 'جاري التحديث...' : `تحصيل — ${paymentMethod === 'CASH' ? 'نقد' : 'بطاقة'}`}
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="shrink-0 border-t p-6 flex flex-col items-center justify-center text-muted-foreground gap-2">
                        <DollarSign className="w-7 h-7 opacity-20" />
                        <p className="text-xs">اختر طلباً للمحاسبة</p>
                    </div>
                )}
            </div>

            {selectedOrder && <Receipt order={selectedOrder} />}
        </div>
    );
}
