import { getDeliveryOrders, getDrivers, getUnpaidDeliveryOrders } from '@/lib/actions/delivery';
import { DeliveryDashboard } from '@/components/delivery/delivery-dashboard';
import { DriverDashboard } from '@/components/delivery/driver-dashboard';
import { DeliveryManagerView } from '@/components/delivery/delivery-manager-view';
import { auth } from '@/lib/auth'; // Assuming auth helper
import { redirect } from 'next/navigation';
import { Clock, Bike, Users } from 'lucide-react';

export default async function DeliveryPage() {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const isManager = session.user.role === 'DELIVERY_MANAGER' || session.user.role === 'ADMIN' || session.user.role === 'MANAGER';

    const deliveries = await getDeliveryOrders();
    const drivers = await getDrivers();
    const unpaidDeliveries = isManager ? await getUnpaidDeliveryOrders() : [];

    // Filter for Driver
    const filteredDeliveries = isManager
        ? deliveries
        : deliveries.filter(d => d.driverId === session.user.id);

    const activeCount = deliveries.filter(d => ['ASSIGNED', 'OUT_FOR_DELIVERY'].includes(d.status)).length;
    const pendingCount = deliveries.filter(d => d.status === 'PENDING').length;
    const onlineDrivers = drivers.length; // Approximate

    return (
        <div className="p-6 md:p-8 space-y-8 h-full flex flex-col bg-gray-50/50">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                    <p className="text-muted-foreground mt-2 text-lg">
                        {isManager ? 'متابعة حركة الطلبات وتعيين السائقين' : 'قائمة طلباتك الحالية'}
                    </p>
                </div>
                {isManager && (
                    <div className="flex gap-4">
                        <div className="bg-white border rounded-xl px-6 py-3 flex flex-col items-center shadow-sm min-w-[120px] transition-all hover:shadow-md">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm font-medium">قيد الانتظار</span>
                            </div>
                            <span className="text-2xl font-bold text-orange-600">{pendingCount}</span>
                        </div>
                        <div className="bg-white border rounded-xl px-6 py-3 flex flex-col items-center shadow-sm min-w-[120px] transition-all hover:shadow-md">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <Bike className="w-4 h-4" />
                                <span className="text-sm font-medium">جاري التوصيل</span>
                            </div>
                            <span className="text-2xl font-bold text-blue-600">{activeCount}</span>
                        </div>
                        <div className="bg-white border rounded-xl px-6 py-3 flex flex-col items-center shadow-sm min-w-[120px] transition-all hover:shadow-md">
                            <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                <Users className="w-4 h-4" />
                                <span className="text-sm font-medium">سائق متاح</span>
                            </div>
                            <span className="text-2xl font-bold text-green-600">{onlineDrivers}</span>
                        </div>
                    </div>
                )}
            </div>

            {isManager ? (
                <DeliveryManagerView
                    activeDeliveries={deliveries}
                    historyDeliveries={deliveries}
                    unpaidDeliveries={unpaidDeliveries}
                    drivers={drivers}
                />
            ) : (
                <div className="flex-1">
                    <DriverDashboard deliveries={filteredDeliveries} />
                </div>
            )}
        </div>
    );
}
