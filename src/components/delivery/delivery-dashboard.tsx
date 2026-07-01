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
import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react';
import { MapPin, Phone, Truck, CheckCircle, User as UserIcon, Clock, Navigation } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { useRouter } from 'next/navigation';
import { RelativeTime } from '@/components/common/relative-time';
import { Button } from '@/components/ui/button';
import { DriverMapModal } from '@/components/delivery/driver-map-modal';

type DeliveryWithRelations = Delivery & {
    order: Order & { items: (OrderItem & { menuItem: MenuItem })[] };
    driver: User | null;
    lastLat?: number | null;
    lastLng?: number | null;
};

interface DeliveryDashboardProps {
    deliveries: DeliveryWithRelations[];
    drivers: User[];
    onRefresh?: () => void | Promise<void>;
}

export function DeliveryDashboard({ deliveries, drivers, onRefresh }: DeliveryDashboardProps) {
    const router = useRouter();
    const [trackingDelivery, setTrackingDelivery] = useState<DeliveryWithRelations | null>(null);

    // Prefer the CSR background refetch; fall back to router.refresh() (SSR).
    const refresh = onRefresh ?? (() => router.refresh());
    const refreshRef = useRef(refresh);
    refreshRef.current = refresh;

    // Auto-refresh every 10 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            refreshRef.current();
        }, 10000);

        return () => clearInterval(interval);
    }, []);
    const columns = [
        {
            label: 'في التحضير',
            color: 'border-t-orange-500 bg-orange-500/5 border-orange-500/20',
            items: deliveries.filter(d => d.status === 'PENDING' && d.order.status !== 'READY'),
        },
        {
            label: 'جاهز للتعيين',
            color: 'border-t-red-500 bg-red-500/5 border-red-500/20',
            items: deliveries.filter(d => d.status === 'PENDING' && d.order.status === 'READY'),
        },
        {
            label: 'تم التعيين',
            color: 'border-t-yellow-500 bg-yellow-500/5 border-yellow-500/20',
            items: deliveries.filter(d => d.status === 'ASSIGNED'),
        },
        {
            label: 'جاري التوصيل',
            color: 'border-t-blue-500 bg-blue-500/5 border-blue-500/20',
            items: deliveries.filter(d => d.status === 'ON_THE_WAY'),
        },
    ];

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[calc(100vh-180px)] min-h-[500px]">
                {columns.map(col => (
                    <div key={col.label} className={`flex flex-col rounded-xl border-t-4 h-full overflow-hidden shadow-sm ${col.color}`}>
                        <div className="p-3 border-b bg-card/50 backdrop-blur-sm flex justify-between items-center">
                            <h3 className="font-bold text-sm text-foreground">{col.label}</h3>
                            <Badge variant="secondary" className="shadow-sm border">
                                {col.items.length}
                            </Badge>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-muted/10">
                            {col.items.length === 0 ? (
                                <EmptyState
                                    icon={Truck}
                                    title="لا توجد طلبات"
                                    description="ستظهر طلبات التوصيل هنا"
                                />
                            ) : (
                                col.items.map(delivery => (
                                    <DeliveryCard key={delivery.id} delivery={delivery} drivers={drivers} onRefresh={refresh} onTrack={delivery.status === 'ON_THE_WAY' ? () => setTrackingDelivery(delivery) : undefined} />
                                ))
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Live Tracking Modal */}
            {trackingDelivery && (
                <DriverMapModal
                    deliveryId={trackingDelivery.id}
                    driverName={trackingDelivery.driver?.name ?? 'السائق'}
                    customerAddress={trackingDelivery.address}
                    customerLat={trackingDelivery.lat}
                    customerLng={trackingDelivery.lng}
                    lastLat={trackingDelivery.lastLat}
                    lastLng={trackingDelivery.lastLng}
                    onClose={() => setTrackingDelivery(null)}
                />
            )}
        </>
    );
}

function DeliveryCard({ delivery, drivers, onTrack, onRefresh }: { delivery: DeliveryWithRelations, drivers: User[], onTrack?: () => void, onRefresh?: () => void | Promise<void> }) {
    // const [selectedDriver, setSelectedDriver] = useState<string>('');
    const [isPending, startTransition] = useTransition();
    const [optimisticStatus, setOptimisticStatus] = useOptimistic<string, string>(
        delivery.status,
        (_, newStatus) => newStatus
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
                    <Badge variant="outline" className="font-mono group-hover:border-primary/50 transition-colors">
                        #{delivery.order.orderNumber}
                    </Badge>
                    <span className="text-[10px] uppercase font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <RelativeTime date={delivery.order.createdAt} />
                    </span>
                </div>
                <div className="font-bold text-foreground leading-tight">{delivery.customerName}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                    <Phone className="w-3 h-3 text-primary/70" />
                    <span className="font-mono dir-ltr">{delivery.customerPhone}</span>
                </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
                <div className="text-xs bg-muted/40 p-2.5 rounded-md flex items-start gap-2 border text-muted-foreground leading-relaxed">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-red-500" />
                    <span className="line-clamp-2">{delivery.address}</span>
                </div>

                <div className="flex items-center justify-between text-xs font-medium bg-secondary/20 p-2 rounded text-secondary-foreground">
                    <span>{delivery.order.items.length} عناصر</span>
                    <span className="font-bold">{delivery.order.totalAmount.toFixed(0)} د.ع</span>
                </div>

                {/* Kitchen Status Badge */}
                <div className={`text-xs flex items-center gap-2 p-2 rounded border font-bold ${
                    delivery.order.status === 'READY'
                        ? 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/30'
                        : delivery.order.status === 'PREPARING'
                        ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30'
                        : 'bg-muted/50 text-muted-foreground border-muted'
                }`}>
                    {delivery.order.status === 'READY' ? (
                        <><CheckCircle className="w-3.5 h-3.5" /><span>جاهز للتوصيل</span></>
                    ) : delivery.order.status === 'PREPARING' ? (
                        <><Clock className="w-3.5 h-3.5" /><span>يتم التجهيز في المطبخ</span></>
                    ) : (
                        <><Clock className="w-3.5 h-3.5" /><span>في انتظار المطبخ</span></>
                    )}
                </div>

                {/* Assign Driver — only available when PENDING and order is READY */}
                {(optimisticStatus === 'PENDING' || optimisticStatus === 'ASSIGNED') && (
                    <div className="space-y-2">
                        {optimisticStatus === 'ASSIGNED' && (
                            <div className="text-xs flex items-center gap-2 bg-yellow-500/15 p-2 rounded text-yellow-600 dark:text-yellow-400 border border-yellow-500/20">
                                <UserIcon className="w-3 h-3" />
                                <span>السائق الحالي: {currentDriver?.name || 'غ/م'}</span>
                            </div>
                        )}
                        {delivery.order.status !== 'READY' && optimisticStatus === 'PENDING' ? (
                            <div className="text-xs text-muted-foreground text-center py-1 bg-muted/40 rounded border border-dashed">
                                يُتاح التعيين بعد اكتمال التحضير
                            </div>
                        ) : (
                            <Select onValueChange={(driverId) => {
                                startTransition(async () => {
                                    setOptimisticStatus('ASSIGNED');
                                    setOptimisticDriverId(driverId);
                                    await assignDriver(delivery.id, driverId);
                                    // Refetch so the card moves to the "assigned" column
                                    // (columns are derived from the server prop, not optimistic state).
                                    await onRefresh?.();
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
                        )}
                    </div>
                )}

                {/* Live tracking button — only when out for delivery */}
                {optimisticStatus === 'ON_THE_WAY' && onTrack && (
                    <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                        onClick={onTrack}
                    >
                        <Navigation className="w-3.5 h-3.5" />
                        📍 تتبع مباشر
                    </Button>
                )}

                {/* Read-Only Status for Out/Delivered if they exist */}
                {optimisticStatus === 'ON_THE_WAY' && (
                    <div className="text-xs flex items-center gap-2 bg-blue-500/15 p-2 rounded text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        <Truck className="w-3 h-3" />
                        <span>خرج للتوصيل - السائق: {currentDriver?.name}</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
