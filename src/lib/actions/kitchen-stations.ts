'use server';

import { prisma } from '@/lib/prisma';
import { verifyRole, getCurrentUser } from '@/lib/auth-guard';
import { requireTenantId } from '@/lib/utils/require-tenant';
import { revalidatePath } from 'next/cache';
import { triggerPusher } from '@/lib/pusher';
import { getActiveBranchId, resolveCreateBranchId } from '@/lib/utils/branch-filter';

// T157: CRUD for kitchen stations
export async function createStation(data: {
    name: string;
    nameAr?: string;
    colour?: string;
    sortOrder?: number;
}) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    requireTenantId(tenantId);

    try {
        const user = await getCurrentUser();
        const branchId = await resolveCreateBranchId(tenantId, user?.branchId ?? null);

        const station = await prisma.kitchenStation.create({
            data: { ...data, tenantId, branchId }
        });
        revalidatePath('/kitchen');
        revalidatePath('/dashboard/admin');
        return { success: true, id: station.id };
    } catch (error) {
        console.error('Failed to create station:', error);
        return { error: 'فشل في إنشاء المحطة' };
    }
}

export async function updateStation(id: string, data: {
    name?: string;
    nameAr?: string;
    colour?: string;
    sortOrder?: number;
}) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    requireTenantId(tenantId);

    const station = await prisma.kitchenStation.findFirst({ where: { id, tenantId } });
    if (!station) return { error: 'المحطة غير موجودة' };

    await prisma.kitchenStation.update({ where: { id }, data });
    revalidatePath('/kitchen');
    return { success: true };
}

export async function deleteStation(id: string) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    requireTenantId(tenantId);

    const station = await prisma.kitchenStation.findFirst({ where: { id, tenantId } });
    if (!station) return { error: 'المحطة غير موجودة' };

    await prisma.kitchenStation.delete({ where: { id } });
    revalidatePath('/kitchen');
    return { success: true };
}

export async function getStations(branchId?: string | null) {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];

        const resolvedBranchId = branchId !== undefined
            ? branchId
            : await getActiveBranchId(tenantId);

        return await prisma.kitchenStation.findMany({
            where: { tenantId, ...(resolvedBranchId ? { branchId: resolvedBranchId } : {}) },
            include: { menuItems: { include: { menuItem: { select: { id: true, name: true } } } } },
            orderBy: { sortOrder: 'asc' }
        });
    } catch {
        return [];
    }
}

// Assign or unassign a category to/from a kitchen station
export async function assignCategoryToStation(categoryId: string, stationId: string | null) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    requireTenantId(tenantId);

    try {
        // When linking to a station, make sure it's one of THIS tenant's stations
        // (the category itself is already tenant-scoped by the Prisma extension).
        if (stationId) {
            const station = await prisma.kitchenStation.findFirst({
                where: { id: stationId, tenantId }, select: { id: true },
            });
            if (!station) return { error: 'المحطة غير موجودة' };
        }
        await prisma.category.update({
            where: { id: categoryId },
            data: { stationId }
        });
        revalidatePath('/kitchen');
        revalidatePath('/dashboard/admin');
        return { success: true };
    } catch (error) {
        console.error('Failed to assign category to station:', error);
        return { error: 'فشل في ربط القسم بالمحطة' };
    }
}

export async function assignItemToStation(menuItemId: string, stationId: string) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    requireTenantId(tenantId);

    // Both the item and the station must belong to the caller's tenant — the
    // junction row has no tenantId, so without this an admin could wire up
    // another tenant's item/station by guessing IDs.
    const [item, station] = await Promise.all([
        prisma.menuItem.findFirst({ where: { id: menuItemId, tenantId }, select: { id: true } }),
        prisma.kitchenStation.findFirst({ where: { id: stationId, tenantId }, select: { id: true } }),
    ]);
    if (!item || !station) return { error: 'الصنف أو المحطة غير موجود' };

    await prisma.menuItemStation.upsert({
        where: { menuItemId_stationId: { menuItemId, stationId } },
        create: { menuItemId, stationId },
        update: {},
    });
    revalidatePath('/kitchen');
    return { success: true };
}

export async function removeItemFromStation(menuItemId: string, stationId: string) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    requireTenantId(tenantId);

    await prisma.menuItemStation.deleteMany({
        where: { menuItemId, stationId, menuItem: { tenantId } },
    });
    revalidatePath('/kitchen');
    return { success: true };
}

// T158: Get active orders for a station (filtered to station items only)
export async function getStationOrders(stationId: string) {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];

        const branchId = await getActiveBranchId(tenantId);
        const branchFilter = branchId ? { branchId } : {};

        const station = await prisma.kitchenStation.findFirst({
            where: { id: stationId, tenantId },
            include: { menuItems: { select: { menuItemId: true } } }
        });
        if (!station) return [];

        const assignedMenuItemIds = station.menuItems.map(m => m.menuItemId);
        if (assignedMenuItemIds.length === 0) return [];

        const orders = await prisma.order.findMany({
            where: {
                tenantId,
                ...branchFilter,
                status: { in: ['PENDING', 'PREPARING'] },
                items: { some: { menuItemId: { in: assignedMenuItemIds }, status: { not: 'READY' } } }
            },
            include: {
                items: {
                    where: { menuItemId: { in: assignedMenuItemIds } },
                    include: { menuItem: true }
                },
                table: true,
            },
            orderBy: { createdAt: 'asc' }
        });

        return orders;
    } catch {
        return [];
    }
}

// T159: Mark station items as ready; auto-advance order to READY if all items done
export async function markStationItemsReady(orderItemIds: string[]) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'CHEF']);
    requireTenantId(tenantId);

    try {
        // OrderItem has no tenantId and is not auto-scoped — bind to the order's
        // tenant so a CHEF can't flip another tenant's items by guessing IDs.
        await prisma.orderItem.updateMany({
            where: { id: { in: orderItemIds }, order: { tenantId } },
            data: { status: 'READY' }
        });

        // Check each unique order (same tenant scope)
        const items = await prisma.orderItem.findMany({
            where: { id: { in: orderItemIds }, order: { tenantId } },
            select: { orderId: true }
        });
        const orderIds = Array.from(new Set(items.map(i => i.orderId)));

        for (const orderId of orderIds) {
            const allItems = await prisma.orderItem.findMany({
                where: { orderId },
                select: { status: true }
            });

            const allReady = allItems.every(i => i.status === 'READY');
            if (allReady) {
                await prisma.order.update({
                    where: { id: orderId },
                    data: { status: 'READY' }
                });
                const order = await prisma.order.findUnique({
                    where: { id: orderId },
                    select: { tenantId: true, branchId: true }
                });
                if (order?.tenantId) {
                    await triggerPusher(
                        `tenant-${order.tenantId}-orders`,
                        'order-ready',
                        { orderId, timestamp: Date.now() }
                    );
                }
            }
        }

        return { success: true };
    } catch (error) {
        console.error('markStationItemsReady error:', error);
        return { error: 'فشل في تحديث حالة الأصناف' };
    }
}
