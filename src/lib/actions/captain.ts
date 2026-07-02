'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { verifyRole, getCurrentUser } from '@/lib/auth-guard';
import { checkPlanCount } from '@/lib/plan-limits';
import { requireTenantId } from '@/lib/utils/require-tenant';
import { getBranchFilter, getOperationalBranchWhere } from '@/lib/utils/branch-filter';
import { withAudit } from '@/lib/audit';
import { TalabatClient } from '@/lib/talabat';
import { triggerPusher } from '@/lib/pusher';
import { deductOrderStock } from '@/lib/actions/order-completion';

export async function getCaptainMenu() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];

        // Branch isolation: a specific active branch → only that branch; otherwise
        // active-branch-or-null (never leaks disabled/other branches — matches
        // getMenuItems/getCategories). The old `branchId ? {branchId} : {}` fallback
        // showed every branch's + legacy NULL categories (duplicate category chips).
        const branchWhere = await getOperationalBranchWhere(tenantId);

        const categories = await prisma.category.findMany({
            where: { tenantId, ...branchWhere },
            include: {
                items: {
                    where: { isAvailable: true, isDeleted: false, tenantId, ...branchWhere },
                    include: {
                        offers: {
                            where: {
                                isActive: true,
                                startDate: { lte: new Date() },
                                endDate: { gte: new Date() },
                            },
                            select: { id: true, name: true, discountPct: true }
                        },
                        _count: { select: { modifierGroups: true } }
                    }
                }
            }
        });
        return categories;
    } catch (error) {
        console.error("Failed to fetch menu", error);
        return [];
    }
}

export async function getTables() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];
        const whereClause = { tenantId, ...(await getOperationalBranchWhere(tenantId)) };
        return await prisma.table.findMany({
            where: whereClause,
            include: {
                orders: {
                    where: { status: { in: ['PENDING', 'PREPARING', 'READY'] } },
                    orderBy: { createdAt: 'asc' },
                    take: 1,
                    select: { id: true, createdAt: true, status: true, qrSessionToken: true },
                },
                _count: {
                    select: {
                        orders: {
                            where: {
                                status: 'SERVED',
                                billRequested: true,
                                qrSessionToken: { not: null },
                            },
                        },
                    },
                },
            },
            orderBy: { number: 'asc' },
        });
    } catch {
        return [];
    }
}

export async function createCaptainOrder(data: {
    tableId: string;
    serviceMode: string;
    items: {
        menuItemId: string;
        quantity: number;
        notes?: string;
        modifiers?: { modifierOptionId: string }[];
    }[];
}) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'CAPTAIN', 'WAITER']);
    requireTenantId(tenantId);
    try {
        await checkPlanCount(tenantId, 'monthlyOrder');

        const branchFilter = await getBranchFilter(tenantId);

        // Verify the table belongs to this tenant
        const table = await prisma.table.findFirst({
            where: { id: data.tableId, tenantId }
        });
        if (!table) return { error: "Table not found or access denied" };

        const now = new Date();

        await prisma.$transaction(async (tx) => {
            let totalAmount = 0;
            const orderItemsData = [];

            for (const item of data.items) {
                const menuItem = await tx.menuItem.findFirst({
                    where: { id: item.menuItemId, tenantId },
                    include: {
                        offers: {
                            where: { isActive: true, startDate: { lte: now }, endDate: { gte: now } },
                            select: { discountPct: true },
                            take: 1
                        },
                        modifierGroups: {
                            include: { modifierGroup: { select: { id: true, isRequired: true, minSelect: true } } }
                        }
                    }
                });
                if (!menuItem) throw new Error(`Item ${item.menuItemId} not found`);

                // Validate required modifier groups
                const selectedOptionIds = (item.modifiers ?? []).map(m => m.modifierOptionId);
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

                // Resolve modifier options and their prices
                let modifierTotal = 0;
                const modifierRecords: { modifierOptionId: string; appliedPrice: number }[] = [];
                if (item.modifiers && item.modifiers.length > 0) {
                    const options = await tx.modifierOption.findMany({
                        where: { id: { in: selectedOptionIds }, group: { tenantId } },
                        select: { id: true, priceAdjustment: true }
                    });
                    for (const opt of options) {
                        modifierTotal += opt.priceAdjustment;
                        modifierRecords.push({ modifierOptionId: opt.id, appliedPrice: opt.priceAdjustment });
                    }
                }

                const bestOffer = menuItem.offers[0];
                const basePrice = bestOffer
                    ? menuItem.price * (1 - bestOffer.discountPct / 100)
                    : menuItem.price;
                const effectivePrice = basePrice + modifierTotal;
                const lineTotal = effectivePrice * item.quantity;
                totalAmount += lineTotal;

                orderItemsData.push({
                    menuItemId: item.menuItemId,
                    quantity: item.quantity,
                    unitPrice: effectivePrice,
                    totalPrice: lineTotal,
                    notes: item.notes,
                    modifiers: modifierRecords.length > 0
                        ? { create: modifierRecords }
                        : undefined,
                });
            }

            await tx.order.create({
                data: {
                    tableId: data.tableId,
                    ...branchFilter,
                    status: 'PENDING',
                    totalAmount,
                    tenantId,
                    items: { create: orderItemsData }
                }
            });

            await tx.table.update({
                where: { id: data.tableId },
                data: { status: 'OCCUPIED' }
            });
        }, {
            timeout: 20000
        });

        revalidatePath('/dashboard/kitchen');
        revalidatePath('/dashboard/pos');
        revalidatePath('/dashboard/orders');
        return { success: true };
    } catch (error: any) {
        if (error?.upgradeRequired) return { error: error.message, upgradeRequired: true };
        console.error("Failed to create captain order", error);
        return { error: "Failed to create order" };
    }
}

export async function updateTableStatus(tableId: string, status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'DIRTY') {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'CAPTAIN', 'WAITER']);
    requireTenantId(tenantId);
    try {
        const table = await prisma.table.findFirst({
            where: { id: tableId, tenantId }
        });
        if (!table) return { error: "Table not found or access denied" };

        const clearTimers = status === 'AVAILABLE' || status === 'DIRTY';
        await prisma.table.update({
            where: { id: tableId },
            data: {
                status,
                ...(clearTimers ? { occupiedSince: null } : {}),
            },
        });

        // إرسال event لتحديث الطاولات فورياً على جميع الأجهزة
        const { triggerPusher } = await import('@/lib/pusher');
        await triggerPusher(`tenant-${tenantId}-orders`, 'table-status-changed', {
            tableId,
            status,
            timestamp: Date.now()
        });

        revalidatePath('/captain/tables');
        revalidatePath('/captain');
        revalidatePath('/dashboard/pos');
        return { success: true };
    } catch (error) {
        console.error("Failed to update status", error);
        return { error: "Failed to update status" };

    }
}

export async function getCaptainActiveOrders() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];
        const branchFilter = await getBranchFilter(tenantId);
        return await prisma.order.findMany({
            where: {
                tenantId,
                ...branchFilter,
                status: { in: ['PENDING', 'PREPARING', 'READY'] },
                delivery: null,
            },
            include: {
                table: true,
                items: {
                    include: {
                        menuItem: {
                            select: { id: true, name: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    } catch (error) {
        console.error("Failed to fetch active orders", error);
        return [];
    }
}

export async function markOrderCompleted(id: string) {
    const { userId, tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'CAPTAIN', 'WAITER']);
    requireTenantId(tenantId);
    try {
        const [order, tenant] = await Promise.all([
            prisma.order.findFirst({
                where: { id, tenantId },
                select: { id: true, tableId: true, totalAmount: true, qrSessionToken: true, branchId: true },
            }),
            prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { serviceMode: true },
            }),
        ]);
        if (!order) return { error: "Order not found or access denied" };

        // Read service mode from the order's branch; fall back to tenant default
        let effectiveServiceMode = tenant?.serviceMode;
        if (order.branchId) {
            const branch = await prisma.branch.findUnique({
                where: { id: order.branchId },
                select: { serviceMode: true },
            });
            if (branch) effectiveServiceMode = branch.serviceMode;
        }

        // طلبات QR دائماً تمر بالكاشير — الزبون لم يدفع بعد
        const isQuickService = effectiveServiceMode === 'QUICK_SERVICE' && !order.qrSessionToken;

        if (isQuickService) {
            // QUICK_SERVICE: الدفع تم مسبقاً — أكمل الطلب تلقائياً عند التسليم
            const systemSettings = await prisma.systemSetting.findFirst();
            const reviewAfterMinutes = systemSettings?.tableReviewMinutes ?? 25;

            await withAudit(
                { tenantId, userId },
                'MARK_ORDER_SERVED',
                'Order',
                id,
                async () => {
                    await prisma.$transaction(async (tx) => {
                        await deductOrderStock(tx, id);
                        await tx.order.update({ where: { id }, data: { status: 'COMPLETED' } });
                        await (tx as any).bill.create({
                            data: {
                                orderId: id,
                                tenantId,
                                amount: order.totalAmount,
                                paymentMethod: 'CASH',
                            },
                        });
                        if (order.tableId) {
                            // أبقِ الطاولة OCCUPIED — الزبون لا يزال يأكل
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
                },
                () => prisma.order.findUnique({ where: { id }, select: { status: true } })
            );

            await Promise.all([
                triggerPusher(`tenant-${tenantId}-orders`, 'order-served', { orderId: id, timestamp: Date.now() }),
                triggerPusher(`tenant-${tenantId}-cashier`, 'bill-settled', { orderId: id, timestamp: Date.now() }),
                triggerPusher(`tenant-${tenantId}-kitchen`, 'order-updated', { timestamp: Date.now() }),
                triggerPusher(`tenant-${tenantId}-customer`, 'order-completed', { orderId: id, timestamp: Date.now() }),
            ]);
        } else {
            // TABLE_SERVICE: انقل لـ SERVED فقط، الكاشير يُكمل الدفع لاحقاً
            await withAudit(
                { tenantId, userId },
                'MARK_ORDER_SERVED',
                'Order',
                id,
                async () => {
                    await prisma.$transaction(async (tx) => {
                        await tx.order.update({ where: { id }, data: { status: 'SERVED' } });

                        // Start Phase 2 timer when all active orders for this table are served
                        if (order.tableId) {
                            const remainingActive = await tx.order.count({
                                where: {
                                    tableId: order.tableId,
                                    status: { in: ['PENDING', 'PREPARING', 'READY'] },
                                    id: { not: id },
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
                },
                () => prisma.order.findUnique({ where: { id }, select: { status: true } })
            );

            await Promise.all([
                triggerPusher(`tenant-${tenantId}-orders`, 'order-served', { orderId: id, timestamp: Date.now() }),
                triggerPusher(`tenant-${tenantId}-kitchen`, 'order-updated', { timestamp: Date.now() }),
            ]);
        }

        // Sync status to Talabat if linked (non-fatal)
        try {
            const talabatOrder = await prisma.talabatOrder.findUnique({ where: { orderId: id } });
            if (talabatOrder && tenantId) {
                const talabatConfig = await prisma.talabatConfig.findFirst({
                    where: { tenantId, branchId: order.branchId ?? null, isEnabled: true }
                });
                if (talabatConfig) {
                    const client = new TalabatClient(talabatConfig);
                    await client.updateOrderStatus(talabatOrder.talabatOrderId, 'COMPLETED');
                }
            }
        } catch (talabatErr) {
            console.error('Talabat sync error (non-fatal):', talabatErr);
        }

        revalidatePath('/captain/orders');
        revalidatePath('/captain/history');
        revalidatePath('/waiter');
        revalidatePath('/cashier');
        revalidatePath('/dashboard/tables');
        revalidatePath('/inventory/stock');
        return { success: true };
    } catch (error) {
        console.error("Failed to complete order", error);
        return { error: "Failed to mark order as completed" };
    }
}

export async function requestOrderVoid(orderId: string, reason?: string) {
    const { userId, tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'CAPTAIN', 'CASHIER', 'WAITER']);
    requireTenantId(tenantId);

    const order = await prisma.order.findFirst({
        where: { id: orderId, tenantId },
        select: { id: true, status: true, voidRequest: { select: { id: true } } },
    });
    if (!order) return { error: 'الطلب غير موجود' };
    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
        return { error: 'لا يمكن طلب إلغاء طلب مكتمل أو ملغى' };
    }
    if (order.voidRequest) return { error: 'طلب الإلغاء مقدم مسبقاً بانتظار الموافقة' };

    const voidReq = await prisma.voidRequest.create({
        data: {
            orderId,
            requestedById: userId,
            tenantId,
            reason: reason?.trim() || null,
        },
    });

    // Notify managers via Pusher
    try {
        const { triggerPusher } = await import('@/lib/pusher');
        const branchId = order ? (await prisma.order.findUnique({ where: { id: orderId }, select: { branchId: true } }))?.branchId : null;
        await triggerPusher(`manager-${branchId ?? tenantId}`, 'void-requested', { voidRequestId: voidReq.id, orderId });
    } catch { /* non-fatal */ }

    return { success: true, requiresApproval: true, voidRequestId: voidReq.id };
}

export async function getCaptainCompletedOrders() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];
        const branchFilter = await getBranchFilter(tenantId);
        return await prisma.order.findMany({
            where: {
                tenantId,
                ...branchFilter,
                status: 'COMPLETED',
            },
            take: 50,
            include: {
                table: true,
                items: {
                    include: {
                        menuItem: {
                            select: { id: true, name: true }
                        }
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });
    } catch (error) {
        console.error("Failed to fetch history", error);
        return [];
    }
}
