'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { PaymentMethod } from '@prisma/client';
import { verifyRole } from '@/lib/auth-guard';
import { requireTenantId } from '@/lib/utils/require-tenant';

export async function checkoutOrder(orderId: string, paymentMethod: PaymentMethod, amount: number) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'CASHIER']);
    requireTenantId(tenantId);
    try {
        // Verify order belongs to this tenant before processing payment
        const order = await prisma.order.findFirst({ where: { id: orderId, tenantId } });
        if (!order) return { error: 'Order not found or access denied' };

        await prisma.$transaction(async (tx) => {
            // 1. Create Bill
            await tx.bill.create({
                data: {
                    orderId,
                    amount,
                    paymentMethod,
                    tenantId,
                }
            });

            // 2. Complete Order
            const updatedOrder = await tx.order.update({
                where: { id: orderId, tenantId },
                data: { status: 'COMPLETED' }
            });

            // 3. Free Table (if applicable)
            if (updatedOrder.tableId) {
                await tx.table.update({
                    where: { id: updatedOrder.tableId },
                    data: { status: 'AVAILABLE', occupiedSince: null },
                });
            }
        });

        revalidatePath('/dashboard/orders');
        revalidatePath('/dashboard/tables');
        return { success: true };
    } catch (error) {
        console.error("Failed to checkout", error);
        return { error: "Failed to process payment" };
    }
}
