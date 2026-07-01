'use server';
/* eslint-disable @typescript-eslint/no-unused-vars */

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createOrderSchema, CreateOrderInput } from '@/lib/validations/pos';
import { verifyRole, getCurrentUser } from '@/lib/auth-guard';
import { triggerPusher } from '@/lib/pusher';
import { checkPlanCount } from '@/lib/plan-limits';
import { requireTenantId } from '@/lib/utils/require-tenant';
import { getBranchFilter, getOperationalBranchWhere } from '@/lib/utils/branch-filter';
import { ServiceMode } from '@prisma/client';
import { cookies } from 'next/headers';

export async function getPOSData() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return { categories: [], menuItems: [], tables: [] };

        const branchWhere = await getOperationalBranchWhere(tenantId);

        const [categories, menuItems] = await Promise.all([
            prisma.category.findMany({
                where: { tenantId, ...branchWhere },
                orderBy: { name: 'asc' },
            }),
            prisma.menuItem.findMany({
                where: { tenantId, isAvailable: true, isDeleted: false, ...branchWhere },
                include: {
                    category: true,
                    offers: {
                        where: {
                            isActive: true,
                            startDate: { lte: new Date() },
                            endDate: { gte: new Date() }
                        }
                    },
                    _count: { select: { modifierGroups: true } },
                },
                orderBy: { name: 'asc' },
            }),
        ]);

        const tables = await prisma.table.findMany({
            where: { tenantId, ...branchWhere },
            orderBy: { number: 'asc' }
        });

        return { categories, menuItems, tables };
    } catch (error) {
        console.error("Failed to load POS data", error);
        return { categories: [], menuItems: [], tables: [] };
    }
}

export async function getPendingCaptainOrders() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];

        const branchFilter = await getBranchFilter(tenantId);
        return await prisma.order.findMany({
            where: { tenantId, ...branchFilter, status: 'PENDING' },
            include: {
                table: true,
                items: {
                    include: {
                        menuItem: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    } catch (error) {
        console.error("Failed to fetch pending orders", error);
        return [];
    }
}

import { auth } from '@/lib/auth';

export async function createOrder(data: CreateOrderInput) {
    const { userId, role: userRole, tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'CASHIER', 'CAPTAIN']);
    requireTenantId(tenantId);

    const validated = createOrderSchema.safeParse(data);
    if (!validated.success) return { error: "Invalid order data" };

    const { tableId, items, note, serviceMode, customerPhone, pointsRedeemed, customerLat, customerLng, paymentMethod: orderPaymentMethod } = validated.data;

    // Look up the cashier's active shift before the transaction (cookies() must be called outside tx)
    let autoShiftId: string | null = null;
    try {
        const cookieStore = await cookies();
        const shiftCookieVal = cookieStore.get('current_shift')?.value;
        if (shiftCookieVal) {
            const activeShift = await prisma.cashierShift.findFirst({
                where: { id: shiftCookieVal, tenantId, closedAt: null },
                select: { id: true },
            });
            if (activeShift) autoShiftId = activeShift.id;
        }
        // Fallback: the cookie expires after 8h, but a shift can stay open longer.
        // Without this, sales after the 8h mark are not attributed to the shift
        // and its totals stay at zero. Attribute to the cashier's own open shift.
        if (!autoShiftId) {
            const fallbackShift = await prisma.cashierShift.findFirst({
                where: { cashierId: userId, tenantId, closedAt: null },
                orderBy: { openedAt: 'desc' },
                select: { id: true },
            });
            if (fallbackShift) autoShiftId = fallbackShift.id;
        }
    } catch { /* not in a request context — skip */ }

    try {
        await checkPlanCount(tenantId, 'monthlyOrder');

        const branchFilter = await getBranchFilter(tenantId);

        let newOrderId = "";

        await prisma.$transaction(async (tx) => {
            // 1. Fetch settings and menu items
            const settings = await tx.systemSetting.findFirst();
            const taxRate = settings?.taxRate || 0;
            const serviceFeePct = settings?.serviceFee || 0;

            const menuItems = await tx.menuItem.findMany({
                where: {
                    id: { in: items.map(i => i.menuItemId) }
                },
                include: {
                    offers: {
                        where: {
                            isActive: true,
                            startDate: { lte: new Date() },
                            endDate: { gte: new Date() }
                        }
                    },
                    recipe: {
                        include: {
                            material: true
                        }
                    },
                    modifierGroups: {
                        include: { modifierGroup: { select: { id: true, isRequired: true, minSelect: true } } }
                    }
                }
            });

            const menuItemMap = new Map(menuItems.map(item => [item.id, item]));
            let subtotal = 0;
            const orderItemsData = [];

            for (const item of items) {
                const menuItem = menuItemMap.get(item.menuItemId);

                if (!menuItem) throw new Error(`Item ${item.menuItemId} not found`);

                const selectedOptionIds = (item.modifiers ?? []).map(m => m.modifierOptionId);

                // Validate required modifier groups
                for (const link of menuItem.modifierGroups) {
                    const { id: groupId, isRequired, minSelect } = link.modifierGroup;
                    if (!isRequired && minSelect === 0) continue;
                    const optionsInGroup = await tx.modifierOption.findMany({
                        where: { groupId },
                        select: { id: true }
                    });
                    const groupOptionIds = optionsInGroup.map(o => o.id);
                    const selected = selectedOptionIds.filter(id => groupOptionIds.includes(id));
                    if (isRequired && selected.length < (minSelect || 1)) {
                        throw new Error(`Required modifier group not satisfied for item ${menuItem.name}`);
                    }
                }

                // Resolve modifier prices
                let modifierTotal = 0;
                const modifierRecords: { modifierOptionId: string; appliedPrice: number }[] = [];
                if (selectedOptionIds.length > 0) {
                    const options = await tx.modifierOption.findMany({
                        where: { id: { in: selectedOptionIds }, group: { tenantId } },
                        select: { id: true, priceAdjustment: true }
                    });
                    for (const opt of options) {
                        modifierTotal += opt.priceAdjustment;
                        modifierRecords.push({ modifierOptionId: opt.id, appliedPrice: opt.priceAdjustment });
                    }
                }

                // Price Logic
                let unitPrice = menuItem.price;
                let discount = 0;

                if (menuItem.offers.length > 0) {
                    const bestOffer = menuItem.offers.reduce((prev, curr) => {
                        return (curr.discountPct > prev.discountPct) ? curr : prev;
                    });

                    discount = (unitPrice * bestOffer.discountPct) / 100;
                    unitPrice = unitPrice - discount;
                }
                unitPrice += modifierTotal;

                const totalPrice = unitPrice * item.quantity;
                subtotal += totalPrice;

                // Cost Logic
                let itemCost = 0;
                if (menuItem.recipe && menuItem.recipe.length > 0) {
                    itemCost = menuItem.recipe.reduce((acc, r) => {
                        return acc + (r.quantity * (r.material.costPerUnit || 0));
                    }, 0);
                    itemCost = itemCost * item.quantity;
                }

                orderItemsData.push({
                    menuItemId: item.menuItemId,
                    quantity: item.quantity,
                    unitPrice: unitPrice,
                    totalPrice: totalPrice,
                    notes: item.notes,
                    cost: itemCost,
                    modifiers: modifierRecords.length > 0
                        ? { create: modifierRecords }
                        : undefined,
                });
            }

            // Calculate Totals
            const taxAmount = (subtotal * taxRate) / 100;
            const serviceAmount = (subtotal * serviceFeePct) / 100;
            const totalAmount = subtotal + taxAmount + serviceAmount;

            // Find or associate customer
            let customerId = undefined;
            if (customerPhone) {
                let customer = await tx.customer.findUnique({
                    where: { tenantId_phone: { tenantId, phone: customerPhone } }
                });
                if (!customer) {
                    customer = await tx.customer.create({
                        data: {
                            tenantId,
                            phone: customerPhone,
                            name: 'زبون جديد (POS)',
                            lastVisitAt: new Date()
                        }
                    });
                } else {
                    await tx.customer.update({
                        where: { id: customer.id },
                        data: { lastVisitAt: new Date() }
                    });
                }
                customerId = customer.id;
            }

            // 2. Create Order
            const order = await tx.order.create({
                data: {
                    tenantId,
                    tableId: tableId || null,
                    ...branchFilter,
                    status: 'PENDING',
                    tax: taxAmount,
                    serviceFee: serviceAmount,
                    note,
                    totalAmount: totalAmount - (pointsRedeemed || 0),
                    customerId,
                    waiterId: userRole === 'CAPTAIN' ? userId : null,
                    items: {
                        create: orderItemsData
                    }
                }
            });
            newOrderId = order.id;

            // 3. Update Table Status if needed
            if (tableId) {
                await tx.table.update({
                    where: { id: tableId },
                    data: { status: 'OCCUPIED' }
                });
            } else {
                // If no tableId, it's a Takeaway/Delivery order
                const isDelivery = validated.data.deliveryType === 'delivery';

                if (isDelivery) {
                    await tx.delivery.create({
                        data: {
                            orderId: order.id,
                            customerName: validated.data.customerName || "زبون توصيل",
                            customerPhone: validated.data.customerPhone || "-",
                            address: validated.data.customerAddress || "عنوان غير محدد",
                            lat: customerLat,
                            lng: customerLng,
                            deliveryFee: 5000,
                            status: 'PENDING'
                        }
                    });
                }
            }

            // 4. Auto-Payment for Cashier/Manager (Takeaway/Hall)
            const isDelivery = validated.data.deliveryType === 'delivery';
            const isAuthorized = userRole === 'CASHIER' || userRole === 'MANAGER' || userRole === 'ADMIN';

            if (isAuthorized && !isDelivery) {
                const pm = orderPaymentMethod ?? 'CASH';
                const billAmount = totalAmount - (pointsRedeemed || 0);

                await tx.bill.create({
                    data: {
                        orderId: order.id,
                        tenantId,
                        amount: billAmount,
                        paymentMethod: pm,
                        paidAt: new Date(),
                        shiftId: autoShiftId,
                    }
                });

                // Update the cashier's active shift totals
                if (autoShiftId) {
                    await tx.cashierShift.update({
                        where: { id: autoShiftId },
                        data: {
                            totalSales: { increment: billAmount },
                            totalCash: pm === 'CASH' ? { increment: billAmount } : undefined,
                            totalCard: pm === 'CARD' ? { increment: billAmount } : undefined,
                        },
                    });
                }

                // Deduct redeemed loyalty points from customer account
                if ((pointsRedeemed || 0) > 0 && customerId) {
                    const loyaltySetting = await tx.tenant.findUnique({
                        where: { id: tenantId },
                        select: { loyaltyPointValueIqd: true },
                    });
                    const pv = loyaltySetting?.loyaltyPointValueIqd ?? 100;
                    const pointsCount = Math.round((pointsRedeemed || 0) / pv);
                    if (pointsCount > 0) {
                        await tx.customer.update({
                            where: { id: customerId },
                            data: { totalPoints: { decrement: pointsCount } },
                        });
                    }
                }
            }
        }, {
            timeout: 20000
        });

        revalidatePath('/dashboard/pos');
        revalidatePath('/dashboard/tables');
        revalidatePath('/dashboard/orders');
        revalidatePath('/captain/tables');
        revalidatePath('/captain');
        await triggerPusher(`tenant-${tenantId}-kitchen`, 'new-order', { orderId: newOrderId, timestamp: Date.now() });

        // أرسل event لتحديث حالة الطاولة فورياً على شاشة الكابتن
        if (tableId) {
            await triggerPusher(`tenant-${tenantId}-orders`, 'table-status-changed', {
                tableId,
                status: 'OCCUPIED',
                timestamp: Date.now()
            });
        }

        return { success: true, orderId: newOrderId };

    } catch (error: any) {
        if (error?.upgradeRequired) return { error: error.message, upgradeRequired: true };
        // Database unreachable (offline) — signal the client to queue the order
        // locally instead of showing a hard error. P1001/P1017 = connection,
        // P2024 = pool timeout.
        if (['P1001', 'P1017', 'P2024'].includes(error?.code)) {
            return { error: 'تعذّر الاتصال — سيُحفظ الطلب محلياً', offline: true };
        }
        console.error("Failed to create order", error);
        return { error: "Failed to create order" };
    }
}
