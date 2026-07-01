'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';

// ── Custom SVG icons — no CDN dependency ─────────────────────────────────────
function makeSvgIcon(emoji: string, size = 36) {
    return L.divIcon({
        html: `<div style="
            font-size:${size}px;
            line-height:1;
            filter:drop-shadow(0 2px 4px rgba(0,0,0,.4));
            display:flex;align-items:center;justify-content:center;
        ">${emoji}</div>`,
        className: '',
        iconSize: [size, size],
        iconAnchor: [size / 2, size],
        popupAnchor: [0, -size],
    });
}

const driverIcon   = makeSvgIcon('🛵', 36);
const customerIcon = makeSvgIcon('📍', 32);

/** Forces Leaflet to recalculate tile layout after the modal animation. */
function MapResizer() {
    const map = useMap();
    useEffect(() => {
        const t1 = setTimeout(() => map.invalidateSize(), 100);
        const t2 = setTimeout(() => map.invalidateSize(), 400);
        const t3 = setTimeout(() => map.invalidateSize(), 900);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, [map]);
    return null;
}

interface LocationUpdate {
    lat: number;
    lng: number;
    heading: number | null;
    speed: number | null;
    timestamp: number;
}

interface DriverMapProps {
    defaultCenter: [number, number];
    trail: [number, number][];
    currentPos: [number, number] | null;
    driverName: string;
    latest: LocationUpdate | null;
    customerLat?: number | null;
    customerLng?: number | null;
    customerAddress: string;
}

export default function DriverMap({
    defaultCenter,
    trail,
    currentPos,
    driverName,
    latest,
    customerLat,
    customerLng,
    customerAddress,
}: DriverMapProps) {
    return (
        <MapContainer
            center={defaultCenter}
            zoom={14}
            style={{ height: '420px', width: '100%' }}
            scrollWheelZoom
        >
            <MapResizer />

            {/* Primary: CartoCDN — fast & globally reliable */}
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
                subdomains="abcd"
                maxZoom={20}
                errorTileUrl="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Trail polyline */}
            {trail.length > 1 && (
                <Polyline
                    positions={trail}
                    pathOptions={{ color: '#f97316', weight: 4, opacity: 0.8, dashArray: '8 5' }}
                />
            )}

            {/* Driver marker 🛵 */}
            {currentPos && (
                <Marker position={currentPos} icon={driverIcon}>
                    <Popup>
                        <strong>{driverName}</strong><br />
                        {latest?.speed ? `السرعة: ${Math.round(latest.speed * 3.6)} كم/س` : 'في انتظار تحديثات...'}
                    </Popup>
                </Marker>
            )}

            {/* Customer destination marker 📍 */}
            {customerLat && customerLng && (
                <Marker position={[customerLat, customerLng]} icon={customerIcon}>
                    <Popup>
                        <strong>موقع التوصيل</strong><br />
                        {customerAddress || 'لا يوجد عنوان نصي'}
                    </Popup>
                </Marker>
            )}
        </MapContainer>
    );
}
