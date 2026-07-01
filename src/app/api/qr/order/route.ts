import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { triggerPusher } from '@/lib/pusher';
import { qrRateLimit, getRequestIp } from '@/lib/qr-rate-limit';
import { activeBranchOr } from '@/lib/utils/branch-where';

export async function POST(req: NextRequest) {
    try {
        const sessionToken = req.cookies.get('qr_session')?.value;
        if (!sessionToken) {
            return NextResponse.json({ error: 'جلسة غير صالحة' }, { status: 401 });
        }

        // Abuse protection on this public endpoint: throttle per session (common
        // case) and per IP (cookie-rotating bot). IP cap is generous so customers
        // sharing the restaurant's WiFi/NAT are not blocked.
        const ip = getRequestIp(req.headers);
        const [sessOk, ipOk] = await Promise.all([
            qrRateLimit(`qr-order:sess:${sessionToken}`, 8, 60_000),
            qrRateLimit(`qr-order:ip:${ip}`, 40, 60_000),
        ]);
        if (!sessOk || !ipOk) {
            return NextResponse.json({ error: 'طلبات كثيرة جداً، حاول بعد قليل' }, { status: 429 });
        }

        const body = await req.json();
        const { tenantSlug, tableId, items, note } = body;

        if (!tenantSlug || !items || items.length === 0) {
            return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { slug: tenantSlug },
            select: { id: true },
        });
        if (!tenant) return NextResponse.json({ error: 'المطعم غير موجود' }, { status: 404 });

        let table = null;
        if (tableId) {
            table = await prisma.table.findFirst({
                where: { id: tableId, tenantId: tenant.id },
                select: { id: true, number: true, branchId: true },
            });
            if (!table) return NextResponse.json({ error: 'الطاولة غير موجودة' }, { status: 404 });
        }

        // Resolve menu item prices and validate modifiers
        const branchId = table?.branchId ?? null;
        const menuItemIds = items.map((i: { menuItemId: string }) => i.menuItemId);
        const menuItemsData = await prisma.menuItem.findMany({
            where: {
                id: { in: menuItemIds },
                tenantId: tenant.id,
                isAvailable: true,
                isDeleted: false,
                ...(branchId ? { branchId } : activeBranchOr()),
            },
            include: {
                modifierGroups: {
                    include: {
                        modifierGroup: {
                            include: { options: true },
                        },
                    },
                },
            },
        });

        const menuMap = new Map(menuItemsData.map(m => [m.id, m]));

        let totalAmount = 0;
        const orderItemsData: {
            menuItemId: string;
            quantity: number;
            notes?: string;
            unitPrice: number;
            totalPrice: number;
            modifiers: { modifierOptionId: string; appliedPrice: number }[];
        }[] = [];

        for (const item of items) {
            const mi = menuMap.get(item.menuItemId);
            if (!mi) return NextResponse.json({ error: `صنف غير موجود: ${item.menuItemId}` }, { status: 400 });

            let modifierTotal = 0;
            const resolvedModifiers: { modifierOptionId: string; appliedPrice: number }[] = [];

            const selectedOptionIds = new Set<string>((item.modifiers || []).map((m: { modifierOptionId: string }) => m.modifierOptionId));

            for (const junction of mi.modifierGroups) {
                const group = junction.modifierGroup;
                const selected = group.options.filter(o => selectedOptionIds.has(o.id));
                if (group.isRequired && selected.length < group.minSelect) {
                    return NextResponse.json({ error: `مجموعة "${group.name}" إلزامية` }, { status: 400 });
                }
                for (const opt of selected) {
                    modifierTotal += opt.priceAdjustment;
                    resolvedModifiers.push({ modifierOptionId: opt.id, appliedPrice: opt.priceAdjustment });
                }
            }

            const unitPrice = mi.price + modifierTotal;
            const itemTotal = unitPrice * item.quantity;
            totalAmount += itemTotal;

            orderItemsData.push({
                menuItemId: item.menuItemId,
                quantity: item.quantity,
                notes: item.notes,
                unitPrice,
                totalPrice: itemTotal,
                modifiers: resolvedModifiers,
            });
        }

        const createdOrder = await (prisma as any).order.create({
            data: {
                tenantId: tenant.id,
                branchId,
                tableId: table?.id ?? null,
                status: 'PENDING',
                totalAmount,
                note: note ?? null,
                qrSessionToken: sessionToken,
                items: {
                    create: orderItemsData.map(item => ({
                        menuItemId: item.menuItemId,
                        quantity: item.quantity,
                        notes: item.notes ?? null,
                        unitPrice: item.unitPrice,
                        totalPrice: item.totalPrice,
                        status: 'PENDING',
                        modifiers: item.modifiers.length > 0 ? {
                            create: item.modifiers.map(m => ({
                                modifierOptionId: m.modifierOptionId,
                                appliedPrice: m.appliedPrice,
                            })),
                        } : undefined,
                    })),
                },
            },
        });

        // Mark table as OCCUPIED if it was AVAILABLE
        if (table) {
            await prisma.table.update({
                where: { id: table.id },
                data: { status: 'OCCUPIED' },
            });
        }

        // Notify kitchen and captain via Pusher
        const channelBase = `tenant-${tenant.id}`;
        await Promise.all([
            triggerPusher(`${channelBase}-kitchen`, 'new-order', { orderId: createdOrder.id, branchId }),
            triggerPusher(`${channelBase}-orders`, 'new-order', { orderId: createdOrder.id, branchId }),
        ]);

        const response = NextResponse.json({ orderId: createdOrder.id }, { status: 201 });
        response.cookies.set('qr_session', sessionToken, { path: '/', maxAge: 60 * 60 * 24, sameSite: 'lax' });
        return response;
    } catch (error) {
        console.error('QR order error:', error);
        return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
    }
}
