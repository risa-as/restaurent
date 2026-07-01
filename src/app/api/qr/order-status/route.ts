import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const sessionToken = req.cookies.get('qr_session')?.value;
        if (!sessionToken) {
            return NextResponse.json({ error: 'جلسة غير صالحة' }, { status: 401 });
        }

        const orderId = req.nextUrl.searchParams.get('orderId');
        if (!orderId) return NextResponse.json({ error: 'orderId مطلوب' }, { status: 400 });

        const order = await prisma.order.findFirst({
            where: { id: orderId, qrSessionToken: sessionToken },
            select: {
                id: true,
                status: true,
                orderNumber: true,
                totalAmount: true,
                billRequested: true,
                createdAt: true,
                items: {
                    select: {
                        id: true,
                        status: true,
                        quantity: true,
                        menuItem: { select: { name: true } },
                        modifiers: {
                            include: { modifierOption: { select: { name: true, nameAr: true } } },
                        },
                    },
                },
            },
        });

        if (!order) {
            return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });
        }

        return NextResponse.json(order);
    } catch (error) {
        console.error('QR order-status error:', error);
        return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
    }
}
