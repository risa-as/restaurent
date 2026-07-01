'use server';

import { prisma } from '@/lib/prisma';
import { verifyRole, getCurrentUser } from '@/lib/auth-guard';
import { revalidatePath } from 'next/cache';
import { triggerPusher } from '@/lib/pusher';
import { requireTenantId } from '@/lib/utils/require-tenant';
import { getBranchFilter, getOperationalBranchWhere } from '@/lib/utils/branch-filter';
import { deductOrderStock } from '@/lib/actions/order-completion';

/** Fetch all table orders currently READY for service (table orders only) */
export async function getReadyOrders() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];

        const branchFilter = await getBranchFilter(tenantId);

        return await prisma.order.findMany({
            where: { tenantId, status: 'READY', ...branchFilter, delivery: null },
            include: { table: true, items: { include: { menuItem: true } }, waiter: true },
            orderBy: { updatedAt: 'asc' },
        });
    } catch (error) {
        console.error('Failed to fetch ready orders', error);
        return [];
    }
}

/** Mark an order as SERVED (waiter delivered food to table) */
export async function serveOrder(orderId: string) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'WAITER']);
    requireTenantId(tenantId);
    try {
        const [order, tenant] = await Promise.all([
            prisma.order.findFirst({
                where: { id: orderId, tenantId },
                select: { id: true, tableId: true, totalAmount: true, qrSessionToken: true },
            }),
            prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { serviceMode: true },
            }),
        ]);
        if (!order) return { error: 'Order not found or access denied' };

        // طلبات QR دائماً تمر بالكاشير — الزبون لم يدفع بعد
        const isQuickService = tenant?.serviceMode === 'QUICK_SERVICE' && !order.qrSessionToken;

        if (isQuickService) {
            // QUICK_SERVICE: الزبون دفع عند الطلب — أكمل الطلب تلقائياً عند التسليم
            // جلب وقت المراجعة من الإعدادات قبل بدء الـ transaction
            const systemSettings = await prisma.systemSetting.findFirst();
            const reviewAfterMinutes = systemSettings?.tableReviewMinutes ?? 25;

            await prisma.$transaction(async (tx) => {
                await deductOrderStock(tx, orderId);
                await tx.order.update({ where: { id: orderId }, data: { status: 'COMPLETED' } });
                // Only create bill if none exists (avoid duplicate for cashier-created pre-paid orders)
                const existingBill = await tx.bill.findFirst({ where: { orderId } });
                if (!existingBill) {
                    await (tx as any).bill.create({
                        data: {
                            orderId,
                            tenantId,
                            amount: order.totalAmount,
                            paymentMethod: 'CASH',
                        },
                    });
                }
                if (order.tableId) {
                    // أبقِ الطاولة OCCUPIED — الزبون لا يزال يأكل
                    // سيُطلَب تنبيه المراجعة بعد reviewAfterMinutes دقيقة
                    await tx.table.update({
                        where: { id: order.tableId },
                        data: {
                            status: 'OCCUPIED',
                            occupiedSince: new Date(),
                            reviewAfter: reviewAfterMinutes,
                        },
                    });
                }
            }, { timeout: 30000 });

            revalidatePath('/waiter');
            revalidatePath('/kitchen');
            revalidatePath('/cashier');
            revalidatePath('/dashboard/tables');
            revalidatePath('/inventory/stock');
            revalidatePath('/captain/orders');

            await Promise.all([
                triggerPusher(`tenant-${tenantId}-kitchen`, 'order-updated', { timestamp: Date.now() }),
                triggerPusher(`tenant-${tenantId}-orders`, 'order-served', { orderId, timestamp: Date.now() }),
                triggerPusher(`tenant-${tenantId}-cashier`, 'bill-settled', { orderId, timestamp: Date.now() }),
                triggerPusher(`tenant-${tenantId}-customer`, 'order-completed', { orderId, timestamp: Date.now() }),
            ]);
        } else {
            // TABLE_SERVICE: أبقِ SERVED — الكاشير يُكمل الدفع لاحقاً
            await prisma.$transaction(async (tx) => {
                await tx.order.update({ where: { id: orderId }, data: { status: 'SERVED' } });

                // Start Phase 2 timer when all active orders for this table are served
                if (order.tableId) {
                    const remainingActive = await tx.order.count({
                        where: {
                            tableId: order.tableId,
                            status: { in: ['PENDING', 'PREPARING', 'READY'] },
                            id: { not: orderId },
                        },
                    });
                    if (remainingActive === 0) {
                        const systemSettings = await tx.systemSetting.findFirst({ select: { tableReviewMinutes: true } });
                        const reviewAfterMinutes = systemSettings?.tableReviewMinutes ?? 25;
                        await tx.table.update({
                            where: { id: order.tableId },
                            data: { occupiedSince: new Date(), reviewAfter: reviewAfterMinutes },
                        });
                    }
                }
            }, { timeout: 30000 });

            revalidatePath('/waiter');
            revalidatePath('/kitchen');
            revalidatePath('/captain/orders');

            await Promise.all([
                triggerPusher(`tenant-${tenantId}-kitchen`, 'order-updated', { timestamp: Date.now() }),
                triggerPusher(`tenant-${tenantId}-orders`, 'order-served', { orderId, timestamp: Date.now() }),
            ]);
        }

        return { success: true };
    } catch (error) {
        console.error('Failed to serve order', error);
        return { error: 'فشل تحديث الحالة' };
    }
}

/** Fetch tables that are DIRTY and need cleaning */
export async function getDirtyTables() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];

        const branchWhere = await getOperationalBranchWhere(tenantId);
        return await prisma.table.findMany({
            where: { tenantId, status: 'DIRTY', ...branchWhere },
            orderBy: { number: 'asc' },
        });
    } catch {
        return [];
    }
}

/** Mark a table as AVAILABLE after waiter has cleaned it */
export async function markTableClean(tableId: string) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'WAITER']);
    requireTenantId(tenantId);
    try {
        const table = await prisma.table.findFirst({ where: { id: tableId, tenantId } });
        if (!table) return { error: 'Table not found or access denied' };

        await prisma.table.update({ where: { id: tableId }, data: { status: 'AVAILABLE', occupiedSince: null } });
        revalidatePath('/waiter');
        revalidatePath('/captain');
        revalidatePath('/dashboard/tables');
        revalidatePath('/cashier');
        await Promise.all([
            triggerPusher(`tenant-${tenantId}-orders`, 'table-status-changed', { tableId, status: 'AVAILABLE', timestamp: Date.now() }),
            triggerPusher(`tenant-${tenantId}-cashier`, 'table-status-changed', { tableId, status: 'AVAILABLE', timestamp: Date.now() }),
        ]);
        return { success: true };
    } catch {
        return { error: 'فشل تحديث الطاولة' };
    }
}

/** Fetch SERVED orders for tables still OCCUPIED (customer eating, waiting to pay) */
export async function getServedOrders() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];

        const branchFilter = await getBranchFilter(tenantId);
        return await prisma.order.findMany({
            where: {
                tenantId,
                ...branchFilter,
                status: 'SERVED',
                billRequested: false,
                tableId: { not: null },
                table: { status: 'OCCUPIED' },
            },
            include: { table: true, items: { include: { menuItem: true } } },
            orderBy: { updatedAt: 'desc' },
        });
    } catch (error) {
        console.error('Failed to fetch served orders', error);
        return [];
    }
}

/** Waiter/Captain requests bill for an order (Table Service mode) */
export async function requestBill(orderId: string) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'WAITER', 'CAPTAIN']);
    requireTenantId(tenantId);
    try {
        const order = await prisma.order.findFirst({ where: { id: orderId, tenantId } });
        if (!order) return { error: 'Order not found or access denied' };

        const updated = await prisma.order.update({
            where: { id: orderId },
            data: { billRequested: true, billRequestedAt: new Date() },
            include: { table: true }
        });

        revalidatePath('/waiter');
        revalidatePath('/captain');
        revalidatePath('/cashier');

        await triggerPusher(`tenant-${tenantId}-cashier`, 'bill-requested', {
            orderId,
            tableNumber: updated.table?.number ?? 'غ/م',
            timestamp: Date.now()
        });

        return { success: true };
    } catch (error) {
        console.error('Failed to request bill', error);
        return { error: 'فشل طلب الحساب' };
    }
}
