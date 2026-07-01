import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { qrRateLimit, getRequestIp } from '@/lib/qr-rate-limit';

export async function POST(req: NextRequest) {
    try {
        const sessionToken = req.cookies.get('qr_session')?.value;
        if (!sessionToken) {
            return NextResponse.json({ error: 'جلسة غير صالحة' }, { status: 401 });
        }

        // Throttle this public endpoint (per session + per IP).
        const ip = getRequestIp(req.headers);
        const [sessOk, ipOk] = await Promise.all([
            qrRateLimit(`qr-reg:sess:${sessionToken}`, 10, 60_000),
            qrRateLimit(`qr-reg:ip:${ip}`, 40, 60_000),
        ]);
        if (!sessOk || !ipOk) {
            return NextResponse.json({ error: 'طلبات كثيرة جداً، حاول بعد قليل' }, { status: 429 });
        }

        const { orderId, phone, name, address } = await req.json();
        if (!orderId || !phone?.trim()) {
            return NextResponse.json({ error: 'رقم الهاتف مطلوب' }, { status: 400 });
        }

        // Verify the order belongs to this session
        const order = await (prisma as any).order.findFirst({
            where: { id: orderId, qrSessionToken: sessionToken },
            select: { id: true, tenantId: true },
        });
        if (!order) {
            return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
        }

        const tenantId = order.tenantId as string;
        const cleanPhone = phone.trim();

        // Create or update customer (unique: tenantId + phone)
        const customer = await (prisma as any).customer.upsert({
            where: { tenantId_phone: { tenantId, phone: cleanPhone } },
            create: {
                tenantId,
                phone: cleanPhone,
                name: name?.trim() || null,
                address: address?.trim() || null,
                lastVisitAt: new Date(),
            },
            update: {
                name: name?.trim() || undefined,
                address: address?.trim() || undefined,
                lastVisitAt: new Date(),
            },
        });

        // Link customer to this order
        await (prisma as any).order.update({
            where: { id: orderId },
            data: { customerId: customer.id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('QR register-customer error:', error);
        return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
    }
}
