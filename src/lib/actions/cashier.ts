
'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { OrderStatus } from '@prisma/client';

export async function getCashierOrders() {
    try {
        const orders = await prisma.order.findMany({
            where: {
                status: {
                    in: ['SERVED']
                },
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
                },
                bills: true // Include bills to filter in memory
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });

        // Filter out paid orders (those with bills) AND delivery orders (handled by Delivery Manager)
        return orders.filter(order => order.bills.length === 0 && !order.delivery);
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
        revalidatePath('/cashier');
        revalidatePath('/dashboard/orders');
    } catch (error) {
        console.error('Failed to mark order as paid:', error);
        throw new Error('Failed to update order status');
    }
}

export async function getCashierHistory() {
    try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const orders = await prisma.order.findMany({
            where: {
                createdAt: {
                    gte: startOfDay,
                },
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
                createdAt: 'desc',
            },
        });
        return orders;
    } catch (error) {
        console.error('Failed to fetch cashier history:', error);
        return [];
    }
}

export async function getOrderForReceipt(orderId: string) {
    try {
        const order = await prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    include: {
                        menuItem: true
                    }
                },
                table: true,
                delivery: {
                    include: {
                        driver: true
                    }
                },
                bills: true
            }
        });
        return order;
    } catch (error) {
        console.error("Failed to fetch order for receipt", error);
        return null;
    }
}
