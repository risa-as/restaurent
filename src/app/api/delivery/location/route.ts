import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { triggerPusher } from '@/lib/pusher';

export async function POST(req: NextRequest) {
    // 1. Auth — only drivers may send location
    const session = await auth();
    if (!session?.user || session.user.role !== 'DRIVER') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse body
    const body = await req.json();
    const { deliveryId, lat, lng, heading, speed } = body as {
        deliveryId: string;
        lat: number;
        lng: number;
        heading?: number;
        speed?: number;
    };

    if (!deliveryId || typeof lat !== 'number' || typeof lng !== 'number') {
        return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // 3. Fetch delivery — verify ownership and active status
    const delivery = await prisma.delivery.findUnique({
        where: { id: deliveryId },
        select: { id: true, driverId: true, status: true },
    });

    if (!delivery) {
        return NextResponse.json({ error: 'Delivery not found' }, { status: 404 });
    }

    // Security gate: driver must own this delivery AND it must be ON_THE_WAY
    if (delivery.driverId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (delivery.status !== 'ON_THE_WAY') {
        // Silently ignore — driver may have just delivered, don't error
        return NextResponse.json({ ok: true, ignored: true });
    }

    // 4. Persist last known position (optional — best-effort)
    await prisma.delivery.update({
        where: { id: deliveryId },
        data: { lastLat: lat, lastLng: lng, lastLocAt: new Date() },
    }).catch(() => { /* non-fatal */ });

    // 5. Broadcast via Pusher
    await triggerPusher(`delivery-${deliveryId}`, 'location-update', {
        lat,
        lng,
        heading: heading ?? null,
        speed: speed ?? null,
        timestamp: Date.now(),
    });

    return NextResponse.json({ ok: true });
}
