'use server';
/* eslint-disable @typescript-eslint/no-unused-vars */

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { OrderStatus } from '@prisma/client';

export async function getKitchenOrders() {
    try {
        const orders = await prisma.order.findMany({
            where: {
                status: {
                    in: ['PENDING', 'PREPARING']
                }
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

export async function markOrderIdsReady(id: string) {
    try {
        await prisma.order.update({
            where: { id },
            data: { status: 'READY' }
        });
        revalidatePath('/dashboard/kitchen');
        revalidatePath('/dashboard/orders');
        return { success: true };
    } catch (error) {
        return { error: "Failed to update order" };
    }
}

export async function updateOrderToPreparing(id: string) {
    try {
        await prisma.order.update({
            where: { id },
            data: { status: 'PREPARING' }
        });
        revalidatePath('/dashboard/kitchen');
        revalidatePath('/dashboard/orders'); // Waiters need to see this too
        return { success: true };
    } catch (error) {
        return { error: "Failed to update order" };
    }
}
