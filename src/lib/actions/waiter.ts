'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getReadyOrders() {
    try {
        const orders = await prisma.order.findMany({
            where: {
                status: 'READY',
                // Waiter cares about Table orders primarily.
                // Delivery orders are handled by drivers.
                // But sometimes a waiter might package delivery? 
                // Let's stick to Table orders for now or all READY orders if role is fluid.
                // Requirement said "Waiter registers order in Hall", so Table orders.
                tableId: { not: null }
            },
            include: {
                table: true,
                items: {
                    include: {
                        menuItem: true
                    }
                },
                waiter: true
            },
            orderBy: { updatedAt: 'asc' } // Oldest ready first
        });
        return orders;
    } catch (error) {
        console.error("Failed to fetch ready orders", error);
        return [];
    }
}
