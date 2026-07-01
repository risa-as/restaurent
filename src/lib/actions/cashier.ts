'use server';

import { prisma } from '@/lib/prisma';
import { verifyRole, getCurrentUser } from '@/lib/auth-guard';
import { revalidatePath } from 'next/cache';
import { withAudit } from '@/lib/audit';
import { triggerPusher } from '@/lib/pusher';
import { PaymentMethod } from '@prisma/client';
import { requireTenantId } from '@/lib/utils/require-tenant';
import { getOperationalBranchWhere } from '@/lib/utils/branch-filter';
import { deductOrderStock } from '@/lib/actions/order-completion';

// Fetch orders that are READY (prepared by kitchen, ready for cashier to hand out)
export async function getCashierOrders() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];

        const branchFilter = await getOperationalBranchWhere(tenantId);
        const orders = await prisma.order.findMany({
            where: {
                tenantId,
                ...branchFilter,
                status: 'READY'
            },
            include: {
                items: {
                    include: { menuItem: true }
                },
                table: true,
                delivery: {
                    include: { driver: true }
                },
                bills: { select: { id: true } }
            },
            orderBy: { createdAt: 'asc' }
        });
        return orders;
    } catch (error) {
        console.error('Failed to fetch cashier orders:', error);
        return [];
    }
}

// Fetch all orders created today for the cashier history tab
export async function getCashierHistory() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];

        const branchFilter = await getOperationalBranchWhere(tenantId);

        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        const orders = await prisma.order.findMany({
            where: {
                tenantId,
                ...branchFilter,
                createdAt: { gte: startOfToday },
            },
            include: {
                items: {
                    include: { menuItem: true }
                },
                table: true,
                delivery: {
                    include: { driver: true }
                },
                bills: true
            },
            orderBy: { createdAt: 'desc' },
            take: 200
        });
        return orders;
    } catch (error) {
        console.error('Failed to fetch cashier history:', error);
        return [];
    }
}

// Mark an order as paid/completed — only for READY orders from the kitchen (TABLE_SERVICE flow)
export async function markOrderAsPaid(orderId: string, paymentMethod: PaymentMethod = PaymentMethod.CASH, shiftId?: string) {
    const { userId, tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'CASHIER']);
    requireTenantId(tenantId);
    try {
        await withAudit(
            { tenantId, userId },
            'MARK_ORDER_PAID',
            'Order',
            orderId,
            async () => {
                await prisma.$transaction(async (tx) => {
                    const order = await tx.order.findFirst({
                        where: { id: orderId, tenantId },
                        select: { tableId: true, totalAmount: true, status: true }
                    });

                    if (!order) throw new Error('Order not found');
                    if (order.status !== 'READY') throw new Error('لا يمكن تحصيل الفاتورة — الطلب لم يُجهَّز بعد');

                    // ✅ Deduct stock (recipe + modifiers) via FIFO
                    await deductOrderStock(tx, orderId);

                    await tx.order.update({
                        where: { id: orderId },
                        data: { status: 'COMPLETED' }
                    });

                    // Only create a bill and update shift if not already billed (auto-payment in createOrder)
                    const existingBill = await tx.bill.findFirst({ where: { orderId } });
                    if (!existingBill) {
                        await tx.bill.create({
                            data: { orderId, tenantId, amount: order.totalAmount, paymentMethod, shiftId: shiftId ?? null }
                        });

                        if (shiftId) {
                            const isCash = paymentMethod === PaymentMethod.CASH;
                            const isCard = paymentMethod === PaymentMethod.CARD;
                            // updateMany with tenantId — prevents attributing a sale
                            // to another tenant's shift via a forged shiftId.
                            await tx.cashierShift.updateMany({
                                where: { id: shiftId, tenantId },
                                data: {
                                    totalSales: { increment: order.totalAmount },
                                    totalCash: isCash ? { increment: order.totalAmount } : undefined,
                                    totalCard: isCard ? { increment: order.totalAmount } : undefined,
                                }
                            });
                        }
                    }

                    if (order.tableId) {
                        await tx.table.update({ where: { id: order.tableId }, data: { status: 'DIRTY', occupiedSince: null } });
                    }
                }, { timeout: 30000 });
            },
            () => prisma.order.findUnique({ where: { id: orderId }, select: { status: true, totalAmount: true } })
        );

        await triggerPusher(`tenant-${tenantId}-cashier`, 'bill-settled', { orderId, timestamp: Date.now() });

        revalidatePath('/cashier');
        revalidatePath('/dashboard/tables');
        revalidatePath('/kitchen');
        revalidatePath('/inventory/stock');
        return { success: true };
    } catch (error) {
        console.error('Failed to mark order as paid:', error);
        const message = error instanceof Error ? error.message : 'فشل في إتمام عملية الدفع';
        return { error: message };
    }
}

// طلبات QR التي طُلبت فيها الفاتورة ولم تُسوَّ بعد (QUICK_SERVICE)
export async function getQrPendingBills() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];

        const branchFilter = await getOperationalBranchWhere(tenantId);
        return await prisma.order.findMany({
            where: {
                tenantId,
                ...branchFilter,
                billRequested: true,
                qrSessionToken: { not: null },
                status: { notIn: ['COMPLETED', 'CANCELLED'] },
            },
            include: {
                table: true,
                items: {
                    include: {
                        menuItem: {
                            include: {
                                offers: {
                                    where: {
                                        isActive: true,
                                        startDate: { lte: new Date() },
                                        endDate: { gte: new Date() },
                                    },
                                },
                            },
                        },
                    },
                },
            },
            orderBy: { billRequestedAt: 'asc' },
        });
    } catch (error) {
        console.error('Failed to get QR pending bills:', error);
        return [];
    }
}

export async function getPendingBills() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];

        const branchFilter = await getOperationalBranchWhere(tenantId);
        const orders = await prisma.order.findMany({
            where: {
                tenantId,
                ...branchFilter,
                billRequested: true,
                status: { notIn: ['COMPLETED', 'CANCELLED'] }
            },
            include: {
                table: true,
                items: {
                    include: {
                        menuItem: {
                            include: {
                                offers: {
                                    where: {
                                        isActive: true,
                                        startDate: { lte: new Date() },
                                        endDate: { gte: new Date() }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { billRequestedAt: 'asc' }
        });
        return orders;
    } catch (error) {
        console.error('Failed to get pending bills:', error);
        return [];
    }
}

// Fetch all active (non-completed) table orders — for cashier "all orders" view
export async function getActiveTableOrders() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];

        const branchFilter = await getOperationalBranchWhere(tenantId);
        const orders = await prisma.order.findMany({
            where: {
                tenantId,
                ...branchFilter,
                status: { notIn: ['COMPLETED', 'CANCELLED'] },
                tableId: { not: null },
            },
            include: {
                table: true,
                items: {
                    include: {
                        menuItem: {
                            include: {
                                offers: {
                                    where: {
                                        isActive: true,
                                        startDate: { lte: new Date() },
                                        endDate: { gte: new Date() }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });
        return orders;
    } catch (error) {
        console.error('Failed to get active table orders:', error);
        return [];
    }
}


export async function settleTableBill(orderId: string, paymentMethod: string, shiftId?: string) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'CASHIER']);
    requireTenantId(tenantId);
    try {
        // Validate order is not still being prepared before settling
        const orderCheck = await prisma.order.findFirst({
            where: { id: orderId, tenantId },
            select: { status: true }
        });
        if (!orderCheck) return { error: 'الطلب غير موجود' };
        if (orderCheck.status === 'PENDING' || orderCheck.status === 'PREPARING') {
            return { error: 'لا يمكن تسوية الفاتورة — الطلب لا يزال قيد التحضير في المطبخ' };
        }

        await prisma.$transaction(async (tx) => {
            const order = await tx.order.findFirst({
                where: { id: orderId, tenantId },
                select: {
                    tableId: true, customerId: true, totalAmount: true,
                    items: {
                        include: {
                            menuItem: {
                                include: {
                                    offers: {
                                        where: {
                                            isActive: true,
                                            startDate: { lte: new Date() },
                                            endDate: { gte: new Date() }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            });

            if (!order) throw new Error('Order not found');

            // ✅ Deduct stock (recipe + modifiers) via FIFO
            await deductOrderStock(tx, orderId);

            // Recalculate final amount from items + active offers
            let finalAmount = 0;
            for (const item of order.items) {
                let unitPrice = item.menuItem.price;
                if (item.menuItem.offers.length > 0) {
                    const bestOffer = item.menuItem.offers.reduce((prev, curr) =>
                        curr.discountPct > prev.discountPct ? curr : prev
                    );
                    unitPrice = unitPrice * (1 - bestOffer.discountPct / 100);
                }
                finalAmount += unitPrice * item.quantity;
            }

            await tx.order.update({
                where: { id: orderId },
                data: { status: 'COMPLETED' }
            });

            await tx.bill.create({
                data: {
                    orderId,
                    tenantId,
                    amount: finalAmount,
                    paymentMethod: paymentMethod as PaymentMethod,
                    shiftId: shiftId ?? null,
                }
            });

            // Accumulate shift totals
            if (shiftId) {
                const isCash = paymentMethod === 'CASH';
                const isCard = paymentMethod === 'CARD';
                // updateMany with tenantId — prevents forging another tenant's shiftId.
                await tx.cashierShift.updateMany({
                    where: { id: shiftId, tenantId },
                    data: {
                        totalSales: { increment: finalAmount },
                        totalCash: isCash ? { increment: finalAmount } : undefined,
                        totalCard: isCard ? { increment: finalAmount } : undefined,
                    }
                });
            }

            if (order.customerId) {
                // جلب إعدادات الولاء لحساب النقاط بشكل صحيح
                const tenant = await tx.tenant.findUnique({
                    where: { id: tenantId },
                    select: { loyaltyEnabled: true, loyaltyPointsPerThousand: true }
                });
                if (tenant?.loyaltyEnabled) {
                    const rate = tenant.loyaltyPointsPerThousand ?? 1;
                    const pointsEarned = Math.floor((finalAmount / 1000) * rate);
                    await tx.customer.update({
                        where: { id: order.customerId },
                        data: {
                            totalPoints: { increment: pointsEarned },
                            totalSpent: { increment: finalAmount },
                            lastVisitAt: new Date()
                        }
                    });
                } else {
                    // Loyalty disabled — فقط حدّث الإنفاق وتاريخ الزيارة
                    await tx.customer.update({
                        where: { id: order.customerId },
                        data: {
                            totalSpent: { increment: finalAmount },
                            lastVisitAt: new Date()
                        }
                    });
                }
            }

            if (order.tableId) {
                await tx.table.update({
                    where: { id: order.tableId },
                    data: { status: 'DIRTY', occupiedSince: null },
                });
            }
        }, { timeout: 30000 });

        revalidatePath('/cashier');
        revalidatePath('/waiter');
        revalidatePath('/dashboard/tables');
        revalidatePath('/inventory/stock');

        // Fire the 3 notifications in parallel — awaiting them sequentially added
        // up to ~3 round-trips of latency to the action's return (and thus the UI).
        await Promise.all([
            triggerPusher(`tenant-${tenantId}-cashier`, 'bill-settled', { orderId, timestamp: Date.now() }),
            triggerPusher(`tenant-${tenantId}-orders`, 'table-dirty', { orderId, timestamp: Date.now() }),
            triggerPusher(`tenant-${tenantId}-customer`, 'order-completed', { orderId, timestamp: Date.now() }),
        ]);

        return { success: true };
    } catch (error) {
        console.error("Error settling bill:", error);
        return { error: "فشل في تسوية الفاتورة" };
    }
}

export async function getOrderForReceipt(orderId: string) {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return null;

        const order = await prisma.order.findFirst({
            where: { id: orderId, tenantId },
            include: {
                items: {
                    include: { menuItem: true }
                },
                table: true,
                delivery: {
                    include: { driver: true }
                },
                bills: true
            }
        });
        return order;
    } catch (error) {
        console.error("Error fetching order for receipt:", error);
        return null;
    }
}
