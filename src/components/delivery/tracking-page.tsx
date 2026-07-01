'use client';

import { useState, useEffect } from 'react';
import { getPusherClient } from '@/lib/pusher';
import { estimateEtaMinutes } from '@/lib/haversine';
import { CheckCircle, Clock, Package, MapPin, Bike } from 'lucide-react';

// Mirrors Prisma's DeliveryStatus enum exactly (incl. RETURNED) so the value
// from the DB is assignable without a cast.
type DeliveryStatus = 'PENDING' | 'ASSIGNED' | 'ON_THE_WAY' | 'DELIVERED' | 'CANCELLED' | 'RETURNED';

interface Stage {
    key: DeliveryStatus[];
    label: string;
    icon: React.ReactNode;
}

const STAGES: Stage[] = [
    { key: ['PENDING'], label: 'تم استلام الطلب', icon: <Package className="w-5 h-5" /> },
    { key: ['ASSIGNED'], label: 'قيد التحضير', icon: <Clock className="w-5 h-5" /> },
    { key: ['ON_THE_WAY'], label: 'مع السائق', icon: <Bike className="w-5 h-5" /> },
    { key: ['DELIVERED'], label: 'تم التوصيل', icon: <CheckCircle className="w-5 h-5" /> },
];

interface TrackingPageProps {
    deliveryId: string;
    orderNumber: number;
    orderStatus: string;
    address: string;
    driverName: string | null;
    lastLat: number | null;
    lastLng: number | null;
    destLat: number | null;
    destLng: number | null;
    status: DeliveryStatus;
}

export function TrackingPage({
    deliveryId,
    orderNumber,
    address,
    driverName,
    lastLat: initialLastLat,
    lastLng: initialLastLng,
    destLat,
    destLng,
    status: initialStatus,
}: TrackingPageProps) {
    const [driverLat, setDriverLat] = useState(initialLastLat);
    const [driverLng, setDriverLng] = useState(initialLastLng);
    const [status, setStatus] = useState<DeliveryStatus>(initialStatus);

    const eta = driverLat && driverLng && destLat && destLng
        ? estimateEtaMinutes(driverLat, driverLng, destLat, destLng)
        : null;

    // Subscribe to Pusher for real-time driver location
    useEffect(() => {
        const pusher = getPusherClient();
        if (!pusher) return;

        const channel = pusher.subscribe(`delivery-${deliveryId}`);
        channel.bind('location-update', (data: { lat: number; lng: number }) => {
            setDriverLat(data.lat);
            setDriverLng(data.lng);
        });
        channel.bind('status-update', (data: { status: DeliveryStatus }) => {
            setStatus(data.status);
        });

        return () => {
            channel.unbind_all();
            pusher.unsubscribe(`delivery-${deliveryId}`);
        };
    }, [deliveryId]);

    const currentStageIdx = STAGES.findIndex(s => s.key.includes(status));

    return (
        <div className="min-h-screen bg-background" dir="rtl">
            {/* Header */}
            <div className="bg-primary text-primary-foreground p-6 text-center">
                <h1 className="text-xl font-bold mb-1">تتبع طلبك</h1>
                <p className="text-primary-foreground/80 text-sm">طلب رقم #{orderNumber}</p>
                {driverName && (
                    <p className="text-sm mt-1">السائق: {driverName}</p>
                )}
            </div>

            {/* Stage progress */}
            <div className="p-6">
                <div className="flex justify-between relative mb-8">
                    {/* Progress line */}
                    <div className="absolute top-5 right-5 left-5 h-0.5 bg-muted" />
                    <div
                        className="absolute top-5 right-5 h-0.5 bg-primary transition-all duration-700"
                        style={{ width: `${(currentStageIdx / (STAGES.length - 1)) * (100 - 10 / STAGES.length)}%` }}
                    />

                    {STAGES.map((stage, idx) => {
                        const done = idx <= currentStageIdx;
                        return (
                            <div key={idx} className="flex flex-col items-center gap-2 z-10 w-16">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                                    done
                                        ? 'bg-primary border-primary text-primary-foreground'
                                        : 'bg-background border-muted-foreground/30 text-muted-foreground'
                                }`}>
                                    {stage.icon}
                                </div>
                                <p className={`text-xs text-center leading-tight ${done ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                    {stage.label}
                                </p>
                            </div>
                        );
                    })}
                </div>

                {/* ETA */}
                {eta && status === 'ON_THE_WAY' && (
                    <div className="bg-primary/10 rounded-xl p-4 text-center mb-6">
                        <p className="text-sm text-muted-foreground mb-1">الوقت المتوقع للوصول</p>
                        <p className="text-3xl font-bold text-primary">{eta} دقيقة</p>
                    </div>
                )}

                {/* Address */}
                <div className="flex items-start gap-3 p-4 border rounded-xl">
                    <MapPin className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-medium">عنوان التوصيل</p>
                        <p className="text-sm text-muted-foreground">{address}</p>
                    </div>
                </div>

                {/* Delivered message */}
                {status === 'DELIVERED' && (
                    <div className="mt-6 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
                        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                        <p className="font-bold text-green-800 dark:text-green-200">تم توصيل طلبك بنجاح!</p>
                        <p className="text-sm text-green-700 dark:text-green-300 mt-1">شكراً لطلبك</p>
                    </div>
                )}
            </div>
        </div>
    );
}
