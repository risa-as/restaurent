'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { getPusherClient } from '@/lib/pusher';
import { X, Wifi, WifiOff, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Force client-side only Map component rendering
const DriverMap = dynamic(() => import('@/components/delivery/driver-map'), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-muted animate-pulse rounded-md flex items-center justify-center">تحميل الخريطة...</div>
});

interface LocationUpdate {
    lat: number;
    lng: number;
    heading: number | null;
    speed: number | null;
    timestamp: number;
}

interface DriverMapModalProps {
    deliveryId: string;
    driverName: string;
    customerAddress: string;
    /** The actual coordinates of the customer destination */
    customerLat?: number | null;
    customerLng?: number | null;
    /** Last known location from DB — used as initial marker position */
    lastLat?: number | null;
    lastLng?: number | null;
    onClose: () => void;
}

const MAX_TRAIL_POINTS = 20;
const OFFLINE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function DriverMapModal({
    deliveryId,
    driverName,
    customerAddress,
    customerLat,
    customerLng,
    lastLat,
    lastLng,
    onClose,
}: DriverMapModalProps) {
    const [trail, setTrail] = useState<[number, number][]>(
        lastLat && lastLng ? [[lastLat, lastLng]] : []
    );
    const [latest, setLatest] = useState<LocationUpdate | null>(null);
    const [isOffline, setIsOffline] = useState(false);
    const offlineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const resetOfflineTimer = useCallback(() => {
        if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current);
        setIsOffline(false);
        offlineTimerRef.current = setTimeout(() => setIsOffline(true), OFFLINE_TIMEOUT_MS);
    }, []);

    useEffect(() => {
        const pusher = getPusherClient();
        if (!pusher) return;

        const channel = pusher.subscribe(`delivery-${deliveryId}`);

        channel.bind('location-update', (data: LocationUpdate) => {
            resetOfflineTimer();
            setLatest(data);
            setTrail(prev => {
                const next: [number, number][] = [...prev, [data.lat, data.lng]];
                return next.slice(-MAX_TRAIL_POINTS);
            });
        });

        channel.bind('tracking-ended', () => {
            onClose();
        });

        // Start offline timer immediately
        resetOfflineTimer();

        return () => {
            channel.unbind_all();
            pusher.unsubscribe(`delivery-${deliveryId}`);
            if (offlineTimerRef.current) clearTimeout(offlineTimerRef.current);
        };
    }, [deliveryId, onClose, resetOfflineTimer]);

    const currentPos = latest
        ? ([latest.lat, latest.lng] as [number, number])
        : trail.length > 0
            ? trail[trail.length - 1]
            : null;

    const defaultCenter: [number, number] = currentPos ?? [33.315, 44.361]; // Baghdad fallback

    const secondsAgo = latest
        ? Math.round((Date.now() - latest.timestamp) / 1000)
        : null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" dir="rtl">
            <div className="w-full max-w-2xl rounded-2xl overflow-hidden bg-card border shadow-2xl flex flex-col" style={{ maxHeight: '90vh' }}>

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b bg-card shrink-0">
                    <div>
                        <p className="font-black text-sm">
                            📍 تتبع مباشر — {driverName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate max-w-xs">{customerAddress}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Connection indicator */}
                        <div className={`flex items-center gap-1.5 text-xs font-medium ${isOffline ? 'text-muted-foreground' : 'text-green-600 dark:text-green-400'}`}>
                            {isOffline
                                ? <><WifiOff className="h-3.5 w-3.5" /> غير متصل</>
                                : <><Wifi className="h-3.5 w-3.5" /> مباشر</>
                            }
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Map — explicit height fixes Leaflet missing-tiles bug */}
                <div className="relative h-[420px] overflow-hidden">
                    {/* Offline overlay */}
                    {isOffline && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                            <div className="text-center space-y-2">
                                <WifiOff className="h-10 w-10 mx-auto text-muted-foreground/40" />
                                <p className="font-semibold text-muted-foreground">السائق غير متصل</p>
                                <p className="text-xs text-muted-foreground">لا توجد تحديثات منذ 30 دقيقة</p>
                            </div>
                        </div>
                    )}

                    <DriverMap
                        defaultCenter={defaultCenter}
                        trail={trail}
                        currentPos={currentPos}
                        driverName={driverName}
                        latest={latest}
                        customerLat={customerLat}
                        customerLng={customerLng}
                        customerAddress={customerAddress}
                    />
                </div>

                {/* Status bar */}
                <div className="shrink-0 flex items-center justify-between px-4 py-2.5 border-t bg-muted/30 text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                        <Navigation className="h-3.5 w-3.5" />
                        {latest?.speed != null
                            ? <span>السرعة: <strong>{Math.round(latest.speed * 3.6)} كم/س</strong></span>
                            : <span>لا تتوفر بيانات السرعة</span>
                        }
                    </div>
                    <span>
                        {secondsAgo != null
                            ? `آخر تحديث: منذ ${secondsAgo} ثانية`
                            : currentPos
                                ? 'آخر موقع معروف من قاعدة البيانات'
                                : 'في انتظار تحديثات الموقع...'
                        }
                    </span>
                </div>
            </div>
        </div>
    );
}
