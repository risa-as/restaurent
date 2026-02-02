
'use server';
/* eslint-disable @typescript-eslint/no-unused-vars */

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { OrderStatus } from '@prisma/client';

export async function getActiveOrders() {
    try {
        const orders = await prisma.order.findMany({
            where: {
                status: {
                    notIn: ['COMPLETED', 'CANCELLED']
                }
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
            orderBy: { createdAt: 'asc' }
        });
        return orders;
    } catch (error) {
        console.error("Failed to fetch active orders", error);
        return [];
    }
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
    try {
        await prisma.order.update({
            where: { id },
            data: { status }
        });

        // If completed or cancelled, we might want to free the table?
        // Usually "Served" != "Completed" (Paid).
        // Paid logic involves payment system.
        // For now, let's keep table occupied until explicit checkout (Phase 5.3).

        revalidatePath('/dashboard/orders');
        return { success: true };
    } catch (error) {
        return { error: "Failed to update order status" };
    }
}

export async function getOrderDetails(id: string) {
    try {
        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                table: true,
                items: {
                    include: {
                        menuItem: true
                    }
                },
                waiter: true,
                delivery: {
                    include: {
                        driver: true
                    }
                }
            }
        });
        return order;
    } catch (error) {
        console.error("Failed to fetch order details", error);
        return null;
    }
}

export async function getCompletedOrders() {
    try {
        const orders = await prisma.order.findMany({
            where: {
                status: {
                    in: ['COMPLETED', 'CANCELLED']
                }
            },
            include: {
                table: true,
                items: {
                    include: {
                        menuItem: true
                    }
                },
                waiter: true,
                delivery: true
            },
            orderBy: { createdAt: 'desc' }
        });
        return orders;
    } catch (error) {
        console.error("Failed to fetch completed orders", error);
        return [];
    }
}
