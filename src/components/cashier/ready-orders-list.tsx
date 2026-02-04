'use client';

import { Order, OrderItem, MenuItem, Table, Delivery, User } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Receipt } from '@/components/orders/receipt';
import { markOrderAsPaid, getCashierOrders } from '@/lib/actions/cashier';
import { CheckCircle, DollarSign, RefreshCw, ShoppingBag, Utensils, Printer } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useState, useTransition, useEffect, useRef } from 'react';

type OrderWithDetails = Order & {
    items: (OrderItem & { menuItem: MenuItem })[];
    table: Table | null;
    delivery: (Delivery & { driver: User | null }) | null;
};

interface ReadyOrdersListProps {
    initialOrders: OrderWithDetails[];
}

export function ReadyOrdersList({ initialOrders }: ReadyOrdersListProps) {
    const [orders, setOrders] = useState<OrderWithDetails[]>(initialOrders);
    const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    // Auto-refresh orders
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

    // Handle print auto-pay
    useEffect(() => {
        const onAfterPrint = () => {
            if (printingOrderId.current) {
                handlePayment(printingOrderId.current);
                printingOrderId.current = null;
            }
        };
        window.addEventListener('afterprint', onAfterPrint);
        return () => window.removeEventListener('afterprint', onAfterPrint);
    }); // Re-bind on every render to ensure handlePayment has latest scope

    const handlePayment = async (orderId: string) => {
        startTransition(async () => {
            try {
                await markOrderAsPaid(orderId);
                setOrders(prev => prev.filter(o => o.id !== orderId));
                if (selectedOrder?.id === orderId) {
                    setSelectedOrder(null);
                }
                toast({
                    title: "تمت العملية بنجاح",
                    description: "تم استلام المبلغ وترحيل الطلب.",
                });
            } catch (error) {
                toast({
                    variant: "destructive",
                    title: "خطأ",
                    description: "حدث خطأ أثناء معالجة الطلب.",
                });
            }
        });
    };

    return (
        <div className="flex flex-col h-full bg-white border-r">
            <div className="p-4 border-b bg-muted/30 font-semibold flex justify-between items-center">
                <span className="text-lg">الطلبات الجاهزة والمقدمة ({orders.length})</span>
                <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => {
                        if (selectedOrder) {
                            printingOrderId.current = selectedOrder.id;
                            window.print();
                        }
                    }} disabled={!selectedOrder} title="طباعة الفاتورة">
                        <Printer className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={async () => {
                        setIsRefreshing(true);
                        const freshOrders = await getCashierOrders();
                        setOrders(freshOrders);
                        setIsRefreshing(false);
                    }} disabled={isRefreshing} title="تحديث القائمة">
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* List */}
                <ScrollArea className="w-1/2 border-l">
                    <div className="p-2 space-y-2">
                        {orders.length === 0 ? (
                            <div className="text-center text-muted-foreground py-10">لا توجد طلبات جاهزة</div>
                        ) : (
                            orders.map(order => (
                                <div
                                    key={order.id}
                                    onClick={() => setSelectedOrder(order)}
                                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${selectedOrder?.id === order.id ? 'bg-primary/5 border-primary ring-1 ring-primary' : 'bg-white hover:border-primary/50'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <div className="font-bold">#{order.orderNumber}</div>
                                        <div className={`text-xs px-2 py-0.5 rounded-full ${order.status === 'SERVED'
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-green-100 text-green-700'
                                            }`}>
                                            {order.status === 'SERVED' ? 'بانتظار الدفع' : 'جاهز من المطبخ'}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-gray-600">
                                        <div className="flex items-center gap-1">
                                            {order.table && <><Utensils className="w-3 h-3" /> ط {order.table.number}</>}
                                            {order.delivery && <><ShoppingBag className="w-3 h-3" /> دليفري</>}
                                            {!order.table && !order.delivery && <><ShoppingBag className="w-3 h-3" /> سفري</>}
                                        </div>
                                        <div className="font-bold text-black">{order.totalAmount.toFixed(0)}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>

                {/* Details */}
                <div className="w-1/2 flex flex-col bg-gray-50/50">
                    {selectedOrder ? (
                        <>
                            <ScrollArea className="flex-1 p-4">
                                <div className="text-center mb-4">
                                    <h2 className="text-2xl font-bold text-primary">#{selectedOrder.orderNumber}</h2>
                                    <p className="text-muted-foreground text-xs">
                                        {selectedOrder.table ? `طاولة ${selectedOrder.table.number}` : (selectedOrder.delivery ? 'توصيل' : 'سفري')}
                                    </p>
                                </div>

                                <div className="space-y-2 mb-4">
                                    {selectedOrder.items.map(item => (
                                        <div key={item.id} className="flex justify-between items-center text-sm py-1 border-b border-dashed last:border-0">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-muted px-1.5 rounded text-xs font-bold">{item.quantity}x</div>
                                                <span className="truncate max-w-[100px]">{item.menuItem.name}</span>
                                            </div>
                                            <div className="font-medium">{item.totalPrice.toFixed(0)}</div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                            <div className="p-3 border-t bg-white">
                                <div className="flex justify-between text-lg font-bold mb-3">
                                    <span>الإجمالي</span>
                                    <span className="text-primary">{selectedOrder.totalAmount.toFixed(0)} د.ع</span>
                                </div>
                                <Button
                                    className="w-full font-bold bg-green-600 hover:bg-green-700"
                                    onClick={() => handlePayment(selectedOrder.id)}
                                    disabled={isPending}
                                >
                                    {isPending ? '...' : 'تم المحاسبة'}
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                            <DollarSign className="w-8 h-8 text-gray-300 mb-2" />
                            <p className="text-sm">اختر طلب للمحاسبة</p>
                        </div>
                    )}
                </div>
            </div>
            {selectedOrder && <Receipt order={selectedOrder} />}
        </div>
    );
}
