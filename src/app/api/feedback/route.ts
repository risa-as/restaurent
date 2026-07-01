import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { qrRateLimit, getRequestIp } from '@/lib/qr-rate-limit';

export async function POST(req: NextRequest) {
    try {
        // Public, unauthenticated endpoint — throttle per IP to stop mass
        // feedback spam / rating manipulation against enumerated order IDs.
        if (!(await qrRateLimit(`feedback:ip:${getRequestIp(req.headers)}`, 20, 60_000))) {
            return NextResponse.json({ error: 'طلبات كثيرة جداً، حاول بعد قليل' }, { status: 429 });
        }

        const { orderId, rating, comment } = await req.json();

        if (!orderId || typeof rating !== 'number' || rating < 1 || rating > 5) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }

        // Verify order exists and get tenant info
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            select: { id: true, tenantId: true, branchId: true, feedback: { select: { id: true } } },
        });

        if (!order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        if (!order.tenantId) {
            return NextResponse.json({ error: 'Order has no tenant' }, { status: 400 });
        }

        // Idempotency: only one feedback per order
        if (order.feedback) {
            return NextResponse.json({ error: 'Feedback already submitted' }, { status: 409 });
        }

        await prisma.customerFeedback.create({
            data: {
                orderId,
                tenantId: order.tenantId,
                branchId: order.branchId ?? undefined,
                rating,
                comment: comment?.trim() || null,
            },
        });

        // If rating >= 4, return googlePlaceId for Google Reviews redirect
        let googlePlaceId: string | null = null;
        if (rating >= 4) {
            const tenant = await prisma.tenant.findUnique({
                where: { id: order.tenantId },
                select: { googlePlaceId: true },
            });
            googlePlaceId = tenant?.googlePlaceId ?? null;
        }

        return NextResponse.json({ success: true, googlePlaceId });
    } catch {
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}
