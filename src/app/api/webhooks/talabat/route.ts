import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { TalabatClient } from '@/lib/talabat';
import { triggerPusher } from '@/lib/pusher';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const rawBody = await req.text();
    const signature = req.headers.get('x-talabat-signature') || '';

    let payload: any;
    try {
        payload = JSON.parse(rawBody);
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const storeId = payload.storeId as string;
    if (!storeId) return NextResponse.json({ error: 'Missing storeId' }, { status: 400 });

    // Find tenant config by storeId
    const config = await prisma.talabatConfig.findFirst({
        where: { storeId, isEnabled: true },
        include: { tenant: { select: { id: true } } }
    });

    if (!config) return NextResponse.json({ error: 'Unknown store' }, { status: 404 });

    // Verify signature — MANDATORY. A missing or invalid signature is rejected
    // (previously a missing signature was silently accepted).
    const client = new TalabatClient(config);
    if (!signature || !client.verifySignature(rawBody, signature)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const talabatOrderId = payload.orderId as string;
    if (!talabatOrderId) return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });

    // Idempotency: skip if already processed
    const existing = await prisma.talabatOrder.findUnique({ where: { talabatOrderId } });
    if (existing) return NextResponse.json({ received: true, duplicate: true });

    // Map items to local MenuItems via itemMapping JSON
    const itemMapping: Record<string, string> = config.itemMapping
        ? JSON.parse(config.itemMapping as string)
        : {};

    const talabatItems: any[] = payload.items ?? [];
    const orderItems = talabatItems
        .map((ti: any) => {
            const menuItemId = itemMapping[String(ti.itemId)];
            if (!menuItemId) return null;
            return { menuItemId, quantity: ti.quantity ?? 1 };
        })
        .filter(Boolean) as { menuItemId: string; quantity: number }[];

    if (orderItems.length === 0) {
        return NextResponse.json({ error: 'No matching menu items' }, { status: 422 });
    }

    // Fetch menu items to calculate total — scoped to the webhook's tenant so a
    // mis-configured itemMapping can never price/attach another tenant's item.
    const menuItems = await prisma.menuItem.findMany({
        where: { id: { in: orderItems.map(i => i.menuItemId) }, tenantId: config.tenantId },
        select: { id: true, price: true }
    });
    const priceMap = new Map(menuItems.map(m => [m.id, m.price]));
    const totalAmount = orderItems.reduce((sum, i) => sum + (priceMap.get(i.menuItemId) ?? 0) * i.quantity, 0);

    // Get branch (use config.branchId if set)
    const branchId = config.branchId ?? null;

    // Create order in Prisma (no orderType field on Order model)
    const order = await prisma.order.create({
        data: {
            tenantId: config.tenantId,
            branchId,
            orderNumber: 0,
            status: 'PENDING',
            totalAmount,
            note: `طلب Talabat #${talabatOrderId}`,
            items: {
                create: orderItems.map(i => ({
                    menuItemId: i.menuItemId,
                    quantity: i.quantity,
                    unitPrice: priceMap.get(i.menuItemId) ?? 0,
                    totalPrice: (priceMap.get(i.menuItemId) ?? 0) * i.quantity,
                }))
            }
        }
    });

    // Create a Delivery record to mark this as a delivery order
    const customerName  = (payload.customer?.name  as string | undefined) ?? 'Talabat Customer';
    const customerPhone = (payload.customer?.phone as string | undefined) ?? '---';
    const address       = (payload.deliveryAddress  as string | undefined) ?? 'Talabat Delivery';
    const deliveryFee   = (payload.deliveryFee       as number | undefined) ?? 0;

    await prisma.delivery.create({
        data: {
            orderId: order.id,
            customerName,
            customerPhone,
            address,
            deliveryFee,
            status: 'PENDING',
        }
    });

    // Create TalabatOrder record
    await prisma.talabatOrder.create({
        data: {
            talabatOrderId,
            orderId: order.id,
            rawPayload: rawBody,
        }
    });

    // Notify kitchen via Pusher
    const channelId = branchId || config.tenantId;
    await triggerPusher(`tenant-${config.tenantId}-kitchen-${channelId}`, 'new-order', {
        orderId: order.id,
        source: 'talabat',
        timestamp: Date.now(),
    });

    return NextResponse.json({ received: true, orderId: order.id });
}
