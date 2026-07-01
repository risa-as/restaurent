import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { triggerPusher } from '@/lib/pusher';

export async function POST(req: Request, { params: _params }: { params: { slug: string } }) {
    try {
        const body = await req.json();
        const { tenantId, tableNumber, items, customerPhone } = body;

        if (!tenantId || !tableNumber || !items || !items.length) {
            return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
        }

        // Validate table exists and is currently OCCUPIED (activated by staff)
        const table = await prisma.table.findFirst({
            where: { number: tableNumber.toString(), tenantId }
        });

        if (!table) {
            return NextResponse.json({ error: 'الطاولة غير موجودة' }, { status: 404 });
        }

        if (table.status !== 'OCCUPIED') {
            return NextResponse.json({ error: 'الطاولة غير نشطة حالياً. يرجى التواصل مع النادل لتفعيل الطاولة.' }, { status: 403 });
        }

        let customerId = null;
        if (customerPhone) {
            let customer = await prisma.customer.findUnique({
                where: {
                    tenantId_phone: { tenantId, phone: customerPhone }
                }
            });

            if (!customer) {
                customer = await prisma.customer.create({
                    data: {
                        tenantId,
                        phone: customerPhone,
                        name: 'زبون جديد (QR)',
                        lastVisitAt: new Date()
                    }
                });
            } else {
                await prisma.customer.update({
                    where: { id: customer.id },
                    data: { lastVisitAt: new Date() }
                });
            }
            customerId = customer.id;
        }

        const totalAmount = items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

        const order = await prisma.order.create({
            data: {
                tenantId,
                tableId: table.id,
                // Inherit the branch from the table the customer is seated at.
                branchId: table.branchId,
                customerId,
                status: 'PENDING',
                totalAmount,
                items: {
                    create: items.map((item: any) => ({
                        tenantId,
                        menuItemId: item.menuItemId,
                        quantity: item.quantity,
                        unitPrice: item.price,
                        totalPrice: item.price * item.quantity,
                    }))
                }
            },
            include: {
                table: true,
                items: { include: { menuItem: true } }
            }
        });

        // Real-time Push via Pusher (Using tenant-specific channels)
        // Kitchen channel for this tenant
        await triggerPusher(`tenant-${tenantId}-kitchen`, 'new-order', order);

        // Cashier channel for this tenant (optional, might re-use same channel structure if we adapt it or send directly)
        await triggerPusher(`tenant-${tenantId}-cashier`, 'new-order', order);

        return NextResponse.json({ success: true, orderId: order.id });
    } catch (e: any) {
        console.error('QR Order Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
