'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin } from 'lucide-react';

// Custom pin icon — no CDN dependency
if (typeof window !== 'undefined') {
    const pinIcon = L.divIcon({
        html: `<div style="font-size:32px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,.4))">📍</div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
    });
    L.Marker.prototype.options.icon = pinIcon;
}

interface LeafletMapProps {
    initialLat?: number;
    initialLng?: number;
    /** إحداثيات تُمرَّر من الخارج (Geocoding) لتحريك الخريطة برمجياً */
    externalLat?: number | null;
    externalLng?: number | null;
    onLocationSelect?: (lat: number, lng: number) => void;
    readOnly?: boolean;
    height?: string;
}

/** يحرّك الخريطة عند استلام إحداثيات خارجية جديدة (من Geocoding) */
function ExternalPositionSync({ lat, lng, onSync }: { lat: number | null | undefined; lng: number | null | undefined; onSync: (pos: L.LatLngExpression) => void }) {
    const map = useMap();
    useEffect(() => {
        if (lat && lng) {
            const pos: L.LatLngExpression = [lat, lng];
            map.flyTo(pos, 16, { duration: 1.2 });
            onSync(pos);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lat, lng]);
    return null;
}

function LocationMarker({ position, setPosition, onLocationSelect, readOnly }: any) {
    const map = useMapEvents({
        click(e) {
            if (readOnly) return;
            setPosition(e.latlng);
            if (onLocationSelect) {
                onLocationSelect(e.latlng.lat, e.latlng.lng);
            }
        },
    });

    useEffect(() => {
        if (position) {
            map.flyTo(position, map.getZoom());
        }
    }, [map, position]);

    return position === null ? null : (
        <Marker position={position}></Marker>
    );
}

export default function LeafletMap({
    initialLat,
    initialLng,
    externalLat,
    externalLng,
    onLocationSelect,
    readOnly = false,
    height = "300px"
}: LeafletMapProps) {
    const [position, setPosition] = useState<L.LatLngExpression | null>(
        initialLat && initialLng ? [initialLat, initialLng] : null
    );
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    if (!isMounted) return <div className="bg-muted animate-pulse rounded-md" style={{ height, width: '100%' }} />;

    return (
        <div style={{ height, width: '100%', position: 'relative' }} className="rounded-md overflow-hidden border">
            <MapContainer
                center={position || [33.3152, 44.3661]}
                zoom={initialLat ? 16 : 12}
                className="h-full w-full z-0"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                    subdomains="abcd"
                    maxZoom={20}
                />
                <ExternalPositionSync
                    lat={externalLat}
                    lng={externalLng}
                    onSync={(pos) => {
                        setPosition(pos);
                        if (onLocationSelect && Array.isArray(pos)) {
                            onLocationSelect(pos[0] as number, pos[1] as number);
                        }
                    }}
                />
                <LocationMarker
                    position={position}
                    setPosition={(pos: any) => {
                        setPosition(pos);
                        if (onLocationSelect) {
                            onLocationSelect(pos.lat, pos.lng);
                        }
                    }}
                    onLocationSelect={onLocationSelect}
                    readOnly={readOnly}
                />
            </MapContainer>

            {!readOnly && (
                <div className="absolute bottom-2 right-2 z-[1000] bg-white dark:bg-slate-800 px-2 py-1 rounded shadow-md flex items-center gap-1.5 text-xs text-muted-foreground pointer-events-none border">
                    <MapPin className="w-3 h-3 text-primary" />
                    انقر لتغيير الموقع
                </div>
            )}
        </div>
    );
}
