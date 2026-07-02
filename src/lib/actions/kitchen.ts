'use server';
/* eslint-disable @typescript-eslint/no-unused-vars */

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { OrderStatus } from '@prisma/client';
import { verifyRole, getCurrentUser } from '@/lib/auth-guard';
import { triggerPusher } from '@/lib/pusher';
import { getBranchFilter } from '@/lib/utils/branch-filter';
import { requireTenantId } from '@/lib/utils/require-tenant';

export async function getKitchenOrders() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];

        const branchFilter = await getBranchFilter(tenantId);

        // select (not include) — the board only renders these fields; the full
        // include shipped every MenuItem/Category column in the JSON on every
        // poll, several times the payload for zero extra information.
        const orders = await prisma.order.findMany({
            where: {
                tenantId,
                ...branchFilter,
                OR: [
                    { status: { in: ['PENDING', 'PREPARING'] } },
                    { status: 'READY', delivery: null },
                    { status: 'READY', delivery: { status: 'PENDING' } }
                ]
            },
            select: {
                id: true,
                orderNumber: true,
                status: true,
                note: true,
                createdAt: true,
                tableId: true,
                table: { select: { id: true, number: true } },
                items: {
                    select: {
                        id: true,
                        quantity: true,
                        status: true,
                        notes: true,
                        menuItem: {
                            select: {
                                id: true,
                                name: true,
                                nameAr: true,
                                category: { select: { id: true, name: true } },
                            },
                        },
                        modifiers: {
                            select: {
                                id: true,
                                modifierOption: { select: { name: true, nameAr: true } },
                            },
                        },
                    },
                },
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
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'CHEF']);
    // OrderItem has no tenantId column and is NOT auto-scoped by the Prisma
    // extension — scope every item operation via its order's tenant or a CHEF
    // could mutate another tenant's order items by guessing IDs (cross-tenant IDOR).
    requireTenantId(tenantId);
    try {
        let finalOrderStatus: OrderStatus = 'PENDING' as OrderStatus;
        let resolvedOrderId: string | null = null;

        await prisma.$transaction(async (tx) => {
            // 1. Update the specific items — scoped to the caller's tenant via the order
            await tx.orderItem.updateMany({
                where: { id: { in: itemIds }, order: { tenantId } },
                data: { status }
            });

            // 2. Get the Order ID (also tenant-scoped)
            const firstItem = await tx.orderItem.findFirst({
                where: { id: itemIds[0], order: { tenantId } },
                select: { orderId: true }
            });

            if (!firstItem) return;

            const orderId = firstItem.orderId;
            resolvedOrderId = orderId;

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

            finalOrderStatus = newOrderStatus;

            // 4. Update Order Status
            await tx.order.update({
                where: { id: orderId },
                data: { status: newOrderStatus }
            });
        }, {
            timeout: 20000
        });

        revalidatePath('/dashboard/kitchen');
        revalidatePath('/kitchen');
        revalidatePath('/dashboard/orders');
        revalidatePath('/waiter');

        // Always notify kitchen board (for real-time refresh)
        await triggerPusher(`tenant-${tenantId}-kitchen`, 'order-updated', { timestamp: Date.now() });

        // Only notify captain when order is fully READY — NOT when just PREPARING
        if (finalOrderStatus === 'READY') {
            // Fetch the order's branchId so captain can filter by their own branch
            const readyOrder = resolvedOrderId
                ? await prisma.order.findFirst({ where: { id: resolvedOrderId }, select: { branchId: true } })
                : null;
            await triggerPusher(`tenant-${tenantId}-orders`, 'order-ready', {
                branchId: readyOrder?.branchId ?? null,
                timestamp: Date.now()
            });
        }

        return { success: true };
    } catch (error) {
        console.error("Failed to update kitchen items", error);
        return { error: "Failed to update items" };
    }
}

