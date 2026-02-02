
'use client';

import { useState, useTransition, useEffect } from 'react';
import { Order, OrderItem, MenuItem, Table, Delivery, User } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { markOrderAsPaid, getCashierOrders } from '@/lib/actions/cashier';
import { CheckCircle, DollarSign, RefreshCw, ShoppingBag, Utensils } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

type OrderWithDetails = Order & {
    items: (OrderItem & { menuItem: MenuItem })[];
    table: Table | null;
    delivery: (Delivery & { driver: User | null }) | null;
};

interface CashierInterfaceProps {
    initialOrders: OrderWithDetails[];
}

export function CashierInterface({ initialOrders }: CashierInterfaceProps) {
    const [orders, setOrders] = useState<OrderWithDetails[]>(initialOrders);
    const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    // Auto-refresh orders
    useEffect(() => {
        const interval = setInterval(async () => {
            const freshOrders = await getCashierOrders();
            setOrders(freshOrders);
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    // Also update orders when initialOrders prop changes (e.g. via server revalidation logic if any)
    useEffect(() => {
        setOrders(initialOrders);
    }, [initialOrders]);


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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[calc(100vh-140px)]">
            {/* Right Column: Order List */}
            <div className="border rounded-xl bg-white shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b bg-muted/30 font-semibold flex justify-between items-center">
                    <span>قائمة الطلبات الجاهزة ({orders.length})</span>
                    <Button variant="ghost" size="icon" onClick={async () => {
                        const freshOrders = await getCashierOrders();
                        setOrders(freshOrders);
                    }}>
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                </div>
                <ScrollArea className="flex-1 p-4 bg-gray-50/50">
                    <div className="space-y-3">
                        {orders.length === 0 ? (
                            <div className="text-center text-muted-foreground py-10">لا توجد طلبات جاهزة حالياً</div>
                        ) : (
                            orders.map(order => (
                                <div
                                    key={order.id}
                                    onClick={() => setSelectedOrder(order)}
                                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${selectedOrder?.id === order.id ? 'bg-primary/5 border-primary ring-1 ring-primary' : 'bg-white hover:border-primary/50'}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="font-bold text-lg">#{order.orderNumber}</div>
                                        <div className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">جاهز</div>
                                    </div>
                                    <div className="flex justify-between items-center text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            {order.table && <span className="flex items-center gap-1"><Utensils className="w-3 h-3" /> طاولة {order.table.number}</span>}
                                            {order.delivery && <span className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" /> توصيل</span>}
                                            {!order.table && !order.delivery && <span className="flex items-center gap-1"><ShoppingBag className="w-3 h-3" /> سفري</span>}
                                        </div>
                                        <div className="font-bold text-black">{order.totalAmount.toFixed(0)} د.ع</div>
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-2 text-left dir-ltr">
                                        {format(new Date(order.createdAt), 'hh:mm a')}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Left Column: Order Details */}
            <div className="border rounded-xl bg-white shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b bg-muted/30 font-semibold">تفاصيل الطلب المحدد</div>
                {selectedOrder ? (
                    <>
                        <ScrollArea className="flex-1 p-6">
                            <div className="text-center mb-6">
                                <h2 className="text-3xl font-bold text-primary mb-1">#{selectedOrder.orderNumber}</h2>
                                <p className="text-muted-foreground text-sm">
                                    {selectedOrder.table ? `طاولة ${selectedOrder.table.number}` : (selectedOrder.delivery ? 'طلب توصيل' : 'طلي سفري')}
                                </p>
                            </div>

                            <div className="space-y-4 mb-8">
                                {selectedOrder.items.map(item => (
                                    <div key={item.id} className="flex justify-between items-center py-2 border-b border-dashed last:border-0">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-muted w-6 h-6 rounded flex items-center justify-center text-xs font-bold">{item.quantity}x</div>
                                            <span className="font-medium">{item.menuItem.name}</span>
                                        </div>
                                        <div className="font-medium">{item.totalPrice.toFixed(0)} د.ع</div>
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-2 bg-gray-50 p-4 rounded-lg">
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">المجموع</span>
                                    <span>{selectedOrder.totalAmount.toFixed(0)} د.ع</span>
                                </div>
                                {/* Add Tax/Service logic if needed here based on order properties */}
                                <div className="flex justify-between text-xl font-bold pt-2 border-t mt-2">
                                    <span>الإجمالي للدفع</span>
                                    <span className="text-primary">{selectedOrder.totalAmount.toFixed(0)} د.ع</span>
                                </div>
                            </div>
                        </ScrollArea>
                        <div className="p-4 border-t bg-gray-50">
                            <Button
                                className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700"
                                onClick={() => handlePayment(selectedOrder.id)}
                                disabled={isPending}
                            >
                                <CheckCircle className="w-5 h-5 ml-2" />
                                {isPending ? 'جاري المعالجة...' : 'تم المحاسبة (ترحيل الطلب)'}
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-6">
                        <div className="bg-gray-100 p-4 rounded-full mb-4">
                            <DollarSign className="w-8 h-8 text-gray-400" />
                        </div>
                        <p>اختر طلب من القائمة لعرض التفاصيل والمحاسبة</p>
                    </div>
                )}
            </div>
        </div>
    );
}
