'use client';

import { Order, OrderItem, MenuItem, Table, User } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { updateOrderStatus } from '@/lib/actions/orders'; // Reuse existing update action
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Clock, Utensils } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface WaiterDashboardProps {
    orders: (Order & {
        items: (OrderItem & { menuItem: MenuItem })[],
        table: Table | null,
        waiter: User | null
    })[];
}

export function WaiterDashboard({ orders: initialOrders }: WaiterDashboardProps) {
    const router = useRouter();
    const [loadingId, setLoadingId] = useState<string | null>(null);

    // Auto-refresh logic
    useEffect(() => {
        const interval = setInterval(() => {
            router.refresh();
        }, 5000); // Fast refresh for ready orders
        return () => clearInterval(interval);
    }, [router]);

    const handleServe = async (orderId: string) => {
        setLoadingId(orderId);
        try {
            await updateOrderStatus(orderId, 'SERVED');
            router.refresh();
        } catch (error) {
            console.error("Failed to serve order", error);
        } finally {
            setLoadingId(null);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {initialOrders.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center h-[60vh] text-muted-foreground animate-in fade-in zoom-in duration-500">
                    <Utensils className="w-24 h-24 mb-6 opacity-20" />
                    <h2 className="text-3xl font-bold opacity-30 tracking-tight">لا توجد طلبات جاهزة</h2>
                    <p className="mt-2 text-lg opacity-50">بانتظار المطبخ...</p>
                </div>
            )}

            {initialOrders.map(order => (
                <Card key={order.id} className="border-l-4 border-l-green-500 shadow-md hover:shadow-lg transition-all animate-in slide-in-from-bottom-5">
                    <CardHeader className="pb-2 bg-green-50/10">
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-2xl font-bold text-gray-800">
                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-lg">#{order.orderNumber}</span>
                                    {order.table && (
                                        <Badge variant="outline" className="text-lg px-3 py-1 bg-white border-green-200 text-green-700">
                                            طاولة {order.table.number}
                                        </Badge>
                                    )}
                                </CardTitle>
                                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                                    <Clock className="w-4 h-4" />
                                    <span>جاهز منذ {formatDistanceToNow(new Date(order.updatedAt), { locale: ar })}</span>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-4">
                        <div className="space-y-2 bg-gray-50 p-3 rounded-lg border border-dashed text-sm">
                            {order.items.map(item => (
                                <div key={item.id} className="flex justify-between items-center">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="h-6 w-6 rounded-full flex items-center justify-center p-0 text-xs">
                                            {item.quantity}
                                        </Badge>
                                        <span className="font-medium">{item.menuItem.name}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <Button
                            className="w-full text-lg h-12 bg-green-600 hover:bg-green-700 shadow-md transition-all active:scale-[0.98]"
                            size="lg"
                            onClick={() => handleServe(order.id)}
                            disabled={loadingId === order.id}
                        >
                            {loadingId === order.id ? (
                                <span className="animate-spin">⌛</span>
                            ) : (
                                <>
                                    <CheckCircle className="w-5 h-5 ml-2" />
                                    تم التقديم للعميل
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
