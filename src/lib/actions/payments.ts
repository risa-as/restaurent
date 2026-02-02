'use server';
/* eslint-disable @typescript-eslint/no-unused-vars */

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { PaymentMethod } from '@prisma/client';

export async function checkoutOrder(orderId: string, paymentMethod: PaymentMethod, amount: number) {
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Create Bill
            await tx.bill.create({
                data: {
                    orderId,
                    amount,
                    paymentMethod
                }
            });

            // 2. Complete Order
            const order = await tx.order.update({
                where: { id: orderId },
                data: { status: 'COMPLETED' }
            });

            // 3. Free Table (if applicable)
            if (order.tableId) {
                await tx.table.update({
                    where: { id: order.tableId },
                    data: { status: 'AVAILABLE' } // Or 'DIRTY' if using that flow
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
