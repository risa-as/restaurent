'use client';

import { Delivery, Order, OrderItem, MenuItem, User } from '@prisma/client';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { updateDeliveryStatus } from '@/lib/actions/delivery';
import { useState, useTransition, useEffect } from 'react';
import { Phone, MapPin, Navigation, CheckCircle, Clock, Package, DollarSign, RefreshCw, History, Bike } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type DeliveryWithRelations = Delivery & {
    order: Order & { items: (OrderItem & { menuItem: MenuItem })[] };
    driver: User | null;
};

interface DriverDashboardProps {
    deliveries: DeliveryWithRelations[];
}

export function DriverDashboard({ deliveries }: DriverDashboardProps) {
    const router = useRouter();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const refreshData = () => {
        setIsRefreshing(true);
        router.refresh();
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    // Auto-refresh every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            router.refresh();
        }, 10000);
        return () => clearInterval(interval);
    }, [router]);

    // Filter out delivered/cancelled orders from the main view to keep it clean, 
    // or maybe show them in a separate tab? 
    // For now, let's show active tasks at the top.

    // Sort: Assigned first, then Out for Delivery.
    const activeDeliveries = deliveries
        .filter(d => ['ASSIGNED', 'OUT_FOR_DELIVERY'].includes(d.status))
        .sort((a, b) => new Date(b.order.createdAt).getTime() - new Date(a.order.createdAt).getTime());

    const completedDeliveries = deliveries
        .filter(d => ['DELIVERED', 'CANCELLED'].includes(d.status))
        .sort((a, b) => new Date(b.order.updatedAt).getTime() - new Date(a.order.updatedAt).getTime());

    return (
        <div className="max-w-md mx-auto pb-20 space-y-4">
            <div className="flex justify-between items-center px-1">
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <Bike className="w-6 h-6 text-primary" />
                    لوحة السائق
                </h1>
                <Button variant="ghost" size="sm" onClick={refreshData} disabled={isRefreshing} className="gap-2">
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>تحديث</span>
                </Button>
            </div>

            <Tabs defaultValue="active" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="active" className="flex items-center gap-2">
                        <Navigation className="w-4 h-4" />
                        الطلبات الحالية
                        {activeDeliveries.length > 0 && (
                            <Badge variant="secondary" className="mr-1 px-1.5 py-0 h-5 text-[10px] min-w-4 flex justify-center">{activeDeliveries.length}</Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-2">
                        <History className="w-4 h-4" />
                        الأرشيف
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="active" className="space-y-4">
                    {activeDeliveries.length > 0 ? (
                        activeDeliveries.map(delivery => (
                            <DriverOrderCard key={delivery.id} delivery={delivery} />
                        ))
                    ) : (
                        <div className="text-center py-10 bg-white rounded-xl border border-dashed shadow-sm">
                            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Package className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">لا توجد طلبات نشطة</h3>
                            <p className="text-gray-500 text-sm mt-1">أنت جاهز لاستقبال طلبات جديدة</p>
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                    {completedDeliveries.length > 0 ? (
                        completedDeliveries.map(delivery => (
                            <div key={delivery.id} className="bg-white rounded-lg p-4 flex justify-between items-center shadow-sm border border-gray-100">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="font-bold text-sm text-gray-900">#{delivery.order.orderNumber}</div>
                                        <Badge variant={delivery.status === 'CANCELLED' ? 'destructive' : 'outline'} className={delivery.status === 'DELIVERED' ? 'bg-green-50 text-green-700 border-green-200' : ''}>
                                            {delivery.status === 'DELIVERED' ? 'تم التوصيل' : 'ملغي'}
                                        </Badge>
                                    </div>
                                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {format(new Date(delivery.order.updatedAt), 'dd/MM/yyyy hh:mm a')}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1 truncate max-w-[200px]">{delivery.customerName} - {delivery.address}</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-primary">{delivery.deliveryFee.toFixed(0)}</div>
                                    <div className="text-[10px] text-muted-foreground">أجرة توصيل</div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10">
                            <History className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-500">سجل التوصيلات فارغ</p>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}

function DriverOrderCard({ delivery }: { delivery: DeliveryWithRelations }) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const handleCall = () => {
        window.open(`tel:${delivery.customerPhone}`);
    };

    const handleMap = () => {
        // Construct Google Maps URL query
        // If lat/lng exists use them, otherwise use address
        const query = encodeURIComponent(delivery.address);
        window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    };

    const handleStatusUpdate = (newStatus: 'OUT_FOR_DELIVERY' | 'DELIVERED') => {
        startTransition(async () => {
            const result = await updateDeliveryStatus(delivery.id, newStatus);
            if (!result) { // Assuming result returns updated object or throws
                toast({ title: "فشل التحديث", variant: "destructive" });
            } else {
                toast({ title: "تم تحديث الحالة بنجاح" });
            }
        });
    };

    const isAssigned = delivery.status === 'ASSIGNED';
    const isOut = delivery.status === 'OUT_FOR_DELIVERY';

    return (
        <Card className={`overflow-hidden border-0 shadow-lg ring-1 ${isOut ? 'ring-blue-200 shadow-blue-100' : 'ring-gray-200'}`}>
            <CardHeader className="bg-white border-b p-4 pb-3">
                <div className="flex justify-between items-start">
                    <div>
                        <Badge variant={isOut ? "default" : "secondary"} className={`mb-2 font-medium ${isOut ? 'bg-blue-600 hover:bg-blue-700' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'}`}>
                            {isOut ? 'جاري التوصيل' : 'مهمة جديدة'}
                        </Badge>
                        <h3 className="font-bold text-xl text-gray-900 leading-none">#{delivery.order.orderNumber}</h3>
                    </div>
                    <div className="text-left">
                        <div className="text-xs text-muted-foreground font-medium flex items-center gap-1 bg-gray-50 px-2 py-1 rounded-full">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(delivery.order.createdAt), { addSuffix: true, locale: ar })}
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-5 bg-white">
                {/* Customer Info Section */}
                <div className="bg-gray-50 p-3 rounded-xl space-y-3">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-xs text-gray-500 mb-0.5 font-medium">العميل</div>
                            <div className="font-bold text-gray-900 text-base">{delivery.customerName}</div>
                            <div className="text-sm text-gray-500 font-mono tracking-tight mt-0.5">{delivery.customerPhone}</div>
                        </div>
                        <Button size="icon" className="rounded-full w-10 h-10 shadow-sm bg-white text-green-600 hover:bg-green-50 border border-green-100" onClick={handleCall}>
                            <Phone className="w-5 h-5" />
                        </Button>
                    </div>

                    <div className="h-px bg-gray-200 w-full" />

                    <div className="flex justify-between items-start">
                        <div className="flex-1">
                            <div className="text-xs text-gray-500 mb-0.5 font-medium">العنوان</div>
                            <div className="text-sm text-gray-800 leading-snug">{delivery.address}</div>
                        </div>
                        <Button size="icon" className="rounded-full w-10 h-10 shadow-sm bg-white text-blue-600 hover:bg-blue-50 border border-blue-100 shrink-0 mr-3" onClick={handleMap}>
                            <MapPin className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {/* Order Summary */}
                <div className="px-1">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-semibold text-gray-900">تفاصيل الطلب</span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{delivery.order.items.length} عناصر</span>
                    </div>
                    <div className="space-y-2 mb-4">
                        {delivery.order.items.map(item => (
                            <div key={item.id} className="flex justify-between text-sm">
                                <span className="text-gray-600"><span className="font-bold text-gray-900">{item.quantity}x</span> {item.menuItem.name}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-dashed">
                        <span className="font-bold text-gray-700">المجموع الكلي</span>
                        <div className="flex items-center gap-1 text-primary font-bold text-lg">
                            <DollarSign className="w-4 h-4" />
                            <span>{delivery.order.totalAmount.toFixed(0)}</span>
                        </div>
                    </div>
                </div>


            </CardContent>

            <CardFooter className="p-4 pt-0 bg-white">
                {isAssigned && (
                    <Button
                        className="w-full h-12 text-base font-bold bg-blue-600 hover:bg-blue-700 shadow-blue-100 shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                        onClick={() => handleStatusUpdate('OUT_FOR_DELIVERY')}
                        disabled={isPending}
                    >
                        {isPending ? 'جاري التحديث...' : (
                            <span className="flex items-center gap-2">
                                استلام الطلب والبدء
                                <Navigation className="w-5 h-5" />
                            </span>
                        )}
                    </Button>
                )}
                {isOut && (
                    <Button
                        className="w-full h-12 text-base font-bold bg-green-600 hover:bg-green-700 shadow-green-100 shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                        onClick={() => handleStatusUpdate('DELIVERED')}
                        disabled={isPending}
                    >
                        {isPending ? 'جاري التحديث...' : (
                            <span className="flex items-center gap-2">
                                إكمال التوصيل
                                <CheckCircle className="w-5 h-5" />
                            </span>
                        )}
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
