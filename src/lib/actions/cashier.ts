
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { OrderStatus } from '@prisma/client';

export async function getCashierOrders() {
    try {
        const orders = await prisma.order.findMany({
            where: {
                status: 'READY',
            },
            include: {
                items: {
                    include: {
                        menuItem: true,
                    },
                },
                table: true,
                delivery: {
                    include: {
                        driver: true,
                    }
                }
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });
        return orders;
    } catch (error) {
        console.error('Failed to fetch cashier orders:', error);
        throw new Error('Failed to fetch orders');
    }
}

export async function markOrderAsPaid(orderId: string) {
    try {
        await prisma.order.update({
            where: { id: orderId },
            data: {
                status: 'COMPLETED',
            },
        });
        revalidatePath('/dashboard/cashier');
        revalidatePath('/dashboard/orders');
    } catch (error) {
        console.error('Failed to mark order as paid:', error);
        throw new Error('Failed to update order status');
    }
}
