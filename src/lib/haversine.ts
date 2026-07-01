const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
    return (deg * Math.PI) / 180;
}

/**
 * T137: Haversine distance between two GPS coordinates, in kilometres.
 */
export function calculateDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
}

/**
 * Estimate ETA in minutes. avgSpeedKmh defaults to 30 (typical urban speed).
 * Returns at least 5 minutes.
 */
export function estimateEtaMinutes(
    driverLat: number,
    driverLng: number,
    destLat: number,
    destLng: number,
    avgSpeedKmh = 30
): number {
    const distanceKm = calculateDistanceKm(driverLat, driverLng, destLat, destLng);
    const etaRaw = (distanceKm / avgSpeedKmh) * 60;
    return Math.max(5, Math.ceil(etaRaw));
}
