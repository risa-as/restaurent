'use client';

import type { Delivery, Order, OrderItem, MenuItem, User } from '@prisma/client';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { assignDriver } from '@/lib/actions/delivery';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useEffect, useOptimistic, useTransition } from 'react';
import { MapPin, Phone, Truck, CheckCircle, User as UserIcon, Clock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { RelativeTime } from '@/components/common/relative-time';

type DeliveryWithRelations = Delivery & {
    order: Order & { items: (OrderItem & { menuItem: MenuItem })[] };
    driver: User | null;
};

interface DeliveryDashboardProps {
    deliveries: DeliveryWithRelations[];
    drivers: User[];
}

export function DeliveryDashboard({ deliveries, drivers }: DeliveryDashboardProps) {
    const router = useRouter();

    // Auto-refresh every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            router.refresh();
        }, 10000);

        return () => clearInterval(interval);
    }, [router]);
    const columns = [
        { id: 'PENDING', label: 'طلبات جديدة', color: 'bg-red-50 border-red-200' },
        { id: 'ASSIGNED', label: 'تم التعيين', color: 'bg-yellow-50 border-yellow-200' },
        { id: 'OUT_FOR_DELIVERY', label: 'جاري التوصيل', color: 'bg-blue-50 border-blue-200' },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-180px)] min-h-[500px]">
            {columns.map(col => {
                const items = deliveries.filter(d => d.status === col.id);
                return (
                    <div key={col.id} className={`flex flex-col rounded-xl border h-full overflow-hidden shadow-sm transition-colors ${col.color.replace('border-', 'border-t-4 border-t-')}`}>
                        <div className="p-3 border-b bg-white/50 backdrop-blur-sm flex justify-between items-center">
                            <h3 className="font-bold text-sm text-gray-700">{col.label}</h3>
                            <Badge variant="secondary" className="bg-white text-gray-600 shadow-sm border">
                                {items.length}
                            </Badge>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar bg-slate-50/50">
                            {items.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs opacity-50">
                                    <Truck className="w-8 h-8 mb-2 stroke-1" />
                                    <span>لا توجد طلبات</span>
                                </div>
                            ) : (
                                items.map(delivery => (
                                    <DeliveryCard key={delivery.id} delivery={delivery} drivers={drivers} />
                                ))
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    );
}

function DeliveryCard({ delivery, drivers }: { delivery: DeliveryWithRelations, drivers: User[] }) {
    // const [selectedDriver, setSelectedDriver] = useState<string>('');
    const [isPending, startTransition] = useTransition();
    const [optimisticStatus, setOptimisticStatus] = useOptimistic(
        delivery.status,
        (state, newStatus: string) => newStatus
    );
    const [optimisticDriverId, setOptimisticDriverId] = useOptimistic(
        delivery.driverId,
        (state, newDriverId: string) => newDriverId
    );

    // Helper to get driver name even if optimistic
    const currentDriverId = optimisticDriverId || delivery.driverId;
    const currentDriver = drivers.find(d => d.id === currentDriverId) || delivery.driver;

    return (
        <Card className="shadow-sm border-l-4 hover:shadow-md transition-all duration-200 group h-fit" style={{ borderLeftColor: delivery.status === 'PENDING' ? '#ef4444' : delivery.status === 'ASSIGNED' ? '#eab308' : '#3b82f6' }}>
            <CardHeader className="pb-3 p-4 space-y-0">
                <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline" className="font-mono bg-white group-hover:border-primary/50 transition-colors">
                        #{delivery.order.orderNumber}
                    </Badge>
                    <span className="text-[10px] uppercase font-medium text-muted-foreground bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <RelativeTime date={delivery.order.createdAt} />
                    </span>
                </div>
                <div className="font-bold text-gray-800 leading-tight">{delivery.customerName}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                    <Phone className="w-3 h-3 text-primary/70" />
                    <span className="font-mono dir-ltr">{delivery.customerPhone}</span>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
                <div className="text-xs bg-gray-50 p-2.5 rounded-md flex items-start gap-2 border border-gray-100 text-gray-600 leading-relaxed">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-500" />
                    <span className="line-clamp-2">{delivery.address}</span>
                </div>

                <div className="flex items-center justify-between text-xs font-medium bg-secondary/20 p-2 rounded text-secondary-foreground">
                    <span>{delivery.order.items.length} عناصر</span>
                    <span className="font-bold">{delivery.order.totalAmount.toFixed(0)} د.ع</span>
                </div>

                {/* Kitchen Status Badge */}
                {(delivery.order.status === 'PREPARING' || delivery.order.status === 'READY') && (
                    <div className={`text-xs flex items-center gap-2 p-2 rounded border font-bold ${delivery.order.status === 'READY'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-orange-50 text-orange-700 border-orange-200'
                        }`}>
                        {delivery.order.status === 'READY' ? (
                            <>
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>جاهز للتوصيل</span>
                            </>
                        ) : (
                            <>
                                <Clock className="w-3.5 h-3.5" />
                                <span>يتم التجهيز في المطبخ</span>
                            </>
                        )}
                    </div>
                )}

                {/* Assign Driver (Available for PENDING and ASSIGNED) */}
                {(optimisticStatus === 'PENDING' || optimisticStatus === 'ASSIGNED') && (
                    <div className="space-y-2">
                        {optimisticStatus === 'ASSIGNED' && (
                            <div className="text-xs flex items-center gap-2 bg-yellow-50 p-2 rounded text-yellow-800 border border-yellow-100 mb-2">
                                <UserIcon className="w-3 h-3" />
                                <span>السائق الحالي: {currentDriver?.name || 'غ/م'}</span>
                            </div>
                        )}
                        <Select onValueChange={(driverId) => {
                            startTransition(async () => {
                                setOptimisticStatus('ASSIGNED');
                                setOptimisticDriverId(driverId);
                                await assignDriver(delivery.id, driverId);
                            });
                        }}>
                            <SelectTrigger className="h-8 text-xs w-full" disabled={isPending}>
                                <SelectValue placeholder={optimisticStatus === 'ASSIGNED' ? "تغيير السائق" : "تعيين سائق"} />
                            </SelectTrigger>
                            <SelectContent dir="rtl">
                                {drivers.map(d => (
                                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* Read-Only Status for Out/Delivered if they exist */}
                {optimisticStatus === 'OUT_FOR_DELIVERY' && (
                    <div className="text-xs flex items-center gap-2 bg-blue-50 p-2 rounded text-blue-800 border border-blue-100">
                        <Truck className="w-3 h-3" />
                        <span>خرج للتوصيل - السائق: {currentDriver?.name}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
