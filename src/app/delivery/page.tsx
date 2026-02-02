import { getDeliveryOrders, getDrivers, getAllDeliveryOrders } from '@/lib/actions/delivery';
import { DeliveryDashboard } from '@/components/delivery/delivery-dashboard';
import { DeliveryStats } from '@/components/delivery/delivery-stats';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { auth } from '@/lib/auth'; // Assuming auth helper
import { redirect } from 'next/navigation';

export default async function DeliveryPage() {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const isManager = session.user.role === 'DELIVERY_MANAGER' || session.user.role === 'ADMIN' || session.user.role === 'MANAGER';

    // Pass role or ID to filter in server action ideally, or filter here.
    // For better security, filtering should be in the Server Action.
    // Let's assume getDeliveryOrders handles it or returns all for now and we filter here (not ideal for large data but works for v1).
    // Better: Update getDeliveryOrders to take userId/role.

    const deliveries = await getDeliveryOrders();
    const drivers = await getDrivers();
    const allDeliveries = await getAllDeliveryOrders();

    // Filter for Driver
    const filteredDeliveries = isManager
        ? deliveries
        : deliveries.filter(d => d.driverId === session.user.id);

    const activeCount = deliveries.filter(d => ['ASSIGNED', 'OUT_FOR_DELIVERY'].includes(d.status)).length;
    const pendingCount = deliveries.filter(d => d.status === 'PENDING').length;
    const onlineDrivers = drivers.length; // Approximate

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">
                        {isManager ? 'إدارة التوصيل' : 'خدمة التوصيل'}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {isManager ? 'متابعة الطلبات وتعيين السائقين' : 'قائمة طلباتك الحالية'}
                    </p>
                </div>
                {isManager && (
                    <div className="flex gap-3">
                        <div className="bg-white border rounded-lg px-4 py-2 flex flex-col items-center shadow-sm">
                            <span className="text-xs text-muted-foreground font-medium">قيد الانتظار</span>
                            <span className="text-xl font-bold text-red-600">{pendingCount}</span>
                        </div>
                        <div className="bg-white border rounded-lg px-4 py-2 flex flex-col items-center shadow-sm">
                            <span className="text-xs text-muted-foreground font-medium">جاري التوصيل</span>
                            <span className="text-xl font-bold text-blue-600">{activeCount}</span>
                        </div>
                        <div className="bg-white border rounded-lg px-4 py-2 flex flex-col items-center shadow-sm">
                            <span className="text-xs text-muted-foreground font-medium">سائق متاح</span>
                            <span className="text-xl font-bold text-green-600">{onlineDrivers}</span>
                        </div>
                    </div>
                )}
            </div>

            {isManager ? (
                <Tabs defaultValue="active" className="flex-1 flex flex-col space-y-4" dir="rtl">
                    <div className="flex items-center justify-between">
                        <TabsList className="bg-muted/50 p-1">
                            <TabsTrigger value="active" className="px-6">اللوحة الرئيسية</TabsTrigger>
                            <TabsTrigger value="stats" className="px-6">التحليلات</TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="active" className="flex-1 mt-0">
                        <DeliveryDashboard deliveries={filteredDeliveries} drivers={drivers} />
                    </TabsContent>

                    <TabsContent value="stats" className="mt-0">
                        <DeliveryStats deliveries={allDeliveries} drivers={drivers} />
                    </TabsContent>
                </Tabs>
            ) : (
                <div className="flex-1">
                    <DeliveryDashboard deliveries={filteredDeliveries} drivers={drivers} />
                </div>
            )}
        </div>
    );
}
