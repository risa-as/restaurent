'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { OrderStatus } from '@prisma/client';
import { verifyRole } from '@/lib/auth-guard';

export async function getActiveOrders() {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'WAITER', 'CAPTAIN', 'CASHIER', 'CHEF']);
    try {
        const orders = await prisma.order.findMany({
            where: {
                tenantId,
                status: { notIn: ['COMPLETED', 'CANCELLED'] },
            },
            include: {
                table: true,
                items: { include: { menuItem: true } },
                waiter: true,
            },
            orderBy: { createdAt: 'asc' },
        });
        return orders;
    } catch (error) {
        console.error('Failed to fetch active orders', error);
        return [];
    }
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'WAITER', 'CAPTAIN', 'CASHIER', 'CHEF']);
    try {
        await prisma.order.update({
            where: { id, tenantId },
            data: { status },
        });
        revalidatePath('/dashboard/orders');
        return { success: true };
    } catch {
        return { error: 'Failed to update order status' };
    }
}

export async function getOrderDetails(id: string) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'WAITER', 'CAPTAIN', 'CASHIER', 'CHEF']);
    try {
        const order = await prisma.order.findUnique({
            where: { id, tenantId },
            include: {
                table: true,
                items: { include: { menuItem: true } },
                waiter: true,
                delivery: { include: { driver: true } },
            },
        });
        return order;
    } catch (error) {
        console.error('Failed to fetch order details', error);
        return null;
    }
}

export async function getCompletedOrders() {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'CASHIER', 'ACCOUNTANT']);
    try {
        const orders = await prisma.order.findMany({
            where: {
                tenantId,
                status: { in: ['COMPLETED', 'CANCELLED'] },
            },
            include: {
                table: true,
                items: { include: { menuItem: true } },
                waiter: true,
                delivery: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return orders;
    } catch (error) {
        console.error('Failed to fetch completed orders', error);
        return [];
    }
}
