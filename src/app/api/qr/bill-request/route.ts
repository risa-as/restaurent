import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { triggerPusher } from '@/lib/pusher';

export async function POST(req: NextRequest) {
    try {
        const sessionToken = req.cookies.get('qr_session')?.value;
        if (!sessionToken) {
            return NextResponse.json({ error: 'جلسة غير صالحة' }, { status: 401 });
        }

        const { orderId } = await req.json();
        if (!orderId) return NextResponse.json({ error: 'orderId مطلوب' }, { status: 400 });

        const order = await prisma.order.findFirst({
            where: { id: orderId, qrSessionToken: sessionToken },
            select: { id: true, tenantId: true, branchId: true, tableId: true },
        });
        if (!order) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });

        await prisma.order.update({
            where: { id: orderId },
            data: {
                billRequested: true,
                billRequestedAt: new Date(),
            },
        });

        await Promise.all([
            triggerPusher(`tenant-${order.tenantId}-orders`, 'bill-requested', {
                orderId,
                tableId: order.tableId,
                branchId: order.branchId,
            }),
            // إشعار الكاشير مباشرةً بطلب فاتورة QR
            triggerPusher(`tenant-${order.tenantId}-cashier`, 'qr-bill-requested', {
                orderId,
                tableId: order.tableId,
            }),
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('QR bill-request error:', error);
        return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
    }
}
