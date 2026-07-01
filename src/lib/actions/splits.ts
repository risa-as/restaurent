'use server';

import { prisma } from '@/lib/prisma';
import { verifyRole } from '@/lib/auth-guard';
import { requireTenantId } from '@/lib/utils/require-tenant';
import { revalidatePath } from 'next/cache';
import { PaymentMethod } from '@prisma/client';

// T106: Equal split — divide order total into n equal portions
export async function createEqualSplit(orderId: string, n: number) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'CASHIER']);
    requireTenantId(tenantId);

    if (n < 2 || n > 20) return { error: 'عدد الأجزاء يجب أن يكون بين 2 و 20' };

    try {
        const order = await prisma.order.findFirst({
            where: { id: orderId, tenantId }
        });
        if (!order) return { error: 'الطلب غير موجود' };

        // Remove any existing unpaid splits before creating new ones
        const existingSplits = await prisma.billSplit.findMany({
            where: { orderId }
        });
        const hasPayments = existingSplits.some(s => s.isPaid);
        if (hasPayments) return { error: 'لا يمكن إعادة التقسيم بعد دفع جزء منه' };

        await prisma.billSplit.deleteMany({ where: { orderId } });

        const portion = Math.round((order.totalAmount / n) * 100) / 100;
        // Last split absorbs rounding difference
        const splits = Array.from({ length: n }, (_, i) => ({
            orderId,
            splitIndex: i + 1,
            totalAmount: i === n - 1
                ? Math.round((order.totalAmount - portion * (n - 1)) * 100) / 100
                : portion,
            isPaid: false,
        }));

        await prisma.billSplit.createMany({ data: splits });
        revalidatePath('/cashier');
        return { success: true };
    } catch (error) {
        console.error('createEqualSplit error:', error);
        return { error: 'فشل في تقسيم الفاتورة' };
    }
}

// T107: Item-based split — assign order items to named portions
export async function createItemSplit(
    orderId: string,
    assignments: { orderItemIds: string[]; splitIndex: number }[]
) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'CASHIER']);
    requireTenantId(tenantId);

    try {
        const order = await prisma.order.findFirst({
            where: { id: orderId, tenantId },
            include: { items: true }
        });
        if (!order) return { error: 'الطلب غير موجود' };

        const existingSplits = await prisma.billSplit.findMany({ where: { orderId } });
        if (existingSplits.some(s => s.isPaid)) {
            return { error: 'لا يمكن إعادة التقسيم بعد دفع جزء منه' };
        }
        await prisma.billSplit.deleteMany({ where: { orderId } });

        const itemPriceMap = new Map(order.items.map(i => [i.id, i.totalPrice]));

        await prisma.$transaction(async (tx) => {
            for (const assignment of assignments) {
                const total = assignment.orderItemIds.reduce(
                    (sum, itemId) => sum + (itemPriceMap.get(itemId) ?? 0), 0
                );

                const split = await tx.billSplit.create({
                    data: {
                        orderId,
                        splitIndex: assignment.splitIndex,
                        totalAmount: Math.round(total * 100) / 100,
                        isPaid: false,
                    }
                });

                if (assignment.orderItemIds.length > 0) {
                    await tx.billSplitItem.createMany({
                        data: assignment.orderItemIds.map(orderItemId => ({
                            splitId: split.id,
                            orderItemId,
                        }))
                    });
                }
            }
        });

        revalidatePath('/cashier');
        return { success: true };
    } catch (error) {
        console.error('createItemSplit error:', error);
        return { error: 'فشل في تقسيم الفاتورة حسب الأصناف' };
    }
}

// T108: Settle one split portion — creates a Bill, marks split paid
export async function settlePartialBill(
    splitId: string,
    paymentMethod: string,
    shiftId?: string
) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'CASHIER']);
    requireTenantId(tenantId);

    try {
        await prisma.$transaction(async (tx) => {
            const split = await tx.billSplit.findFirst({
                where: { id: splitId },
                include: { order: { select: { id: true, tenantId: true, tableId: true } } }
            });

            if (!split) throw new Error('Split not found');
            if (split.order.tenantId !== tenantId) throw new Error('Access denied');
            if (split.isPaid) throw new Error('هذا الجزء مدفوع مسبقاً');

            const bill = await tx.bill.create({
                data: {
                    orderId: split.orderId,
                    tenantId,
                    amount: split.totalAmount,
                    paymentMethod: paymentMethod as PaymentMethod,
                    shiftId: shiftId ?? null,
                }
            });

            await tx.billSplit.update({
                where: { id: splitId },
                data: { isPaid: true, billId: bill.id }
            });

            // If all splits are now paid → complete the order
            const remaining = await tx.billSplit.count({
                where: { orderId: split.orderId, isPaid: false }
            });

            if (remaining === 0) {
                await tx.order.update({
                    where: { id: split.orderId },
                    data: { status: 'COMPLETED' }
                });
                if (split.order.tableId) {
                    await tx.table.update({
                        where: { id: split.order.tableId },
                        data: { status: 'DIRTY' }
                    });
                }
            }
        });

        revalidatePath('/cashier');
        return { success: true };
    } catch (error) {
        console.error('settlePartialBill error:', error);
        return { error: 'فشل في تسوية الجزء' };
    }
}

// T109: Fetch all splits for an order
export async function getOrderSplits(orderId: string) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'CASHIER']);
    requireTenantId(tenantId);

    try {
        const order = await prisma.order.findFirst({
            where: { id: orderId, tenantId }
        });
        if (!order) return [];

        return await prisma.billSplit.findMany({
            where: { orderId },
            include: {
                items: {
                    include: {
                        orderItem: { include: { menuItem: true } }
                    }
                },
                bill: true
            },
            orderBy: { splitIndex: 'asc' }
        });
    } catch (error) {
        console.error('getOrderSplits error:', error);
        return [];
    }
}
