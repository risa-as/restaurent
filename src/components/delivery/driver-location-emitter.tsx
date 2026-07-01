'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface DriverLocationEmitterProps {
    deliveryId: string;
    /** Only emit when true — should be set only when status === 'ON_THE_WAY' */
    isActive: boolean;
}

const THROTTLE_MS = 10_000;   // max one update per 10 seconds
const MIN_DISTANCE_M = 15;    // skip if moved less than 15 metres

/** Haversine distance in metres between two lat/lng pairs */
function distanceMetres(lat1: number, lng1: number, lat2: number, lng2: number) {
    const R = 6_371_000;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Invisible component — renders null unless GPS is denied.
 * When isActive=true, starts watchPosition and POSTs updates to /api/delivery/location.
 * When isActive=false or unmounted, stops watching immediately.
 */
export function DriverLocationEmitter({ deliveryId, isActive }: DriverLocationEmitterProps) {
    const [permissionDenied, setPermissionDenied] = useState(false);
    const watchIdRef = useRef<number | null>(null);
    const lastSentRef = useRef<{ lat: number; lng: number; at: number } | null>(null);

    useEffect(() => {
        if (!isActive || typeof window === 'undefined' || !('geolocation' in navigator)) return;

        // Check permission first for better UX
        navigator.permissions?.query({ name: 'geolocation' }).then(result => {
            if (result.state === 'denied') {
                setPermissionDenied(true);
                return;
            }
        }).catch(() => { /* permissions API not supported — proceed anyway */ });

        watchIdRef.current = navigator.geolocation.watchPosition(
            (position) => {
                setPermissionDenied(false);
                const { latitude: lat, longitude: lng, heading, speed } = position.coords;
                const now = Date.now();
                const last = lastSentRef.current;

                // Throttle: skip if last update was less than THROTTLE_MS ago
                if (last && now - last.at < THROTTLE_MS) return;

                // Distance filter: skip if haven't moved MIN_DISTANCE_M
                if (last && distanceMetres(last.lat, last.lng, lat, lng) < MIN_DISTANCE_M) return;

                lastSentRef.current = { lat, lng, at: now };

                // Fire-and-forget — don't block or await
                fetch('/api/delivery/location', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ deliveryId, lat, lng, heading, speed }),
                }).catch(() => { /* non-fatal: offline tolerance */ });
            },
            (error) => {
                if (error.code === GeolocationPositionError.PERMISSION_DENIED) {
                    setPermissionDenied(true);
                }
            },
            {
                enableHighAccuracy: true,
                maximumAge: 5_000,
                timeout: 15_000,
            }
        );

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
        };
    }, [isActive, deliveryId]);

    // Only render UI if permission denied
    if (!permissionDenied || !isActive) return null;

    return (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
                لا يمكن تتبع موقعك — يرجى السماح بصلاحية GPS في المتصفح
            </span>
        </div>
    );
}
