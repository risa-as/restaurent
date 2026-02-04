'use server';
/* eslint-disable @typescript-eslint/no-unused-vars */

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { OrderStatus } from '@prisma/client';

export async function getKitchenOrders() {
    try {
        const orders = await prisma.order.findMany({
            where: {
                OR: [
                    { status: { in: ['PENDING', 'PREPARING'] } },
                    { status: 'READY', delivery: null },
                    { status: 'READY', delivery: { status: 'PENDING' } }
                ]
            },
            include: {
                table: true,
                items: {
                    include: {
                        menuItem: {
                            include: {
                                category: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });
        return orders;
    } catch (error) {
        console.error("Failed to fetch kitchen orders", error);
        return [];
    }
}

export async function updateKitchenItemStatus(itemIds: string[], status: OrderStatus) {
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Update the specific items
            await tx.orderItem.updateMany({
                where: { id: { in: itemIds } },
                data: { status }
            });

            // 2. Get the Order ID (assume all items belong to same order for now, or fetch first)
            const firstItem = await tx.orderItem.findFirst({
                where: { id: itemIds[0] },
                select: { orderId: true }
            });

            if (!firstItem) return;

            const orderId = firstItem.orderId;

            // 3. Check ALL items in this order to determine Order Status
            const allItems = await tx.orderItem.findMany({
                where: { orderId: orderId }
            });

            const allReady = allItems.every(i => i.status === 'READY' || i.status === 'SERVED' || i.status === 'COMPLETED');
            const anyPreparing = allItems.some(i => i.status === 'PREPARING' || i.status === 'READY');

            let newOrderStatus: OrderStatus = 'PENDING';
            if (allReady) {
                newOrderStatus = 'READY';
            } else if (anyPreparing) {
                newOrderStatus = 'PREPARING';
            }

            // 4. Update Order Status
            await tx.order.update({
                where: { id: orderId },
                data: { status: newOrderStatus }
            });
        }, {
            timeout: 20000
        });

        revalidatePath('/dashboard/kitchen');
        revalidatePath('/kitchen'); // Also revalidate the public page
        revalidatePath('/dashboard/orders');
        return { success: true };
    } catch (error) {
        console.error("Failed to update kitchen items", error);
        return { error: "Failed to update items" };
    }
}
