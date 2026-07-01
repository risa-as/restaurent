'use server';
/* eslint-disable @typescript-eslint/no-unused-vars */

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { TableStatus } from '@prisma/client';
import { tableSchema, TableFormValues } from '@/lib/validations/tables';
import { completeOrderTransaction } from './order-completion';
import { verifyRole, getCurrentUser } from '@/lib/auth-guard';
import { requireTenantId } from '@/lib/utils/require-tenant';
import { getBranchFilter, getActiveBranchId, resolveCreateBranchId, getOperationalBranchWhere } from '@/lib/utils/branch-filter';
import { triggerPusher } from '@/lib/pusher';
import { unstable_noStore as noStore } from 'next/cache';

export async function getTables() {
    noStore();
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];

        const whereClause = { tenantId, ...(await getOperationalBranchWhere(tenantId)) };

        return await prisma.table.findMany({
            where: whereClause,
            orderBy: { number: 'asc' },
            include: {
                orders: {
                    where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
                    include: { items: { include: { menuItem: true } } },
                    take: 1
                }
            }
        });
    } catch (error) {
        console.error("Failed to fetch tables", error);
        return [];
    }
}

export async function createTable(data: TableFormValues) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'CAPTAIN']);
    requireTenantId(tenantId);
    const validated = tableSchema.safeParse(data);
    if (!validated.success) return { error: "بيانات غير صالحة" };

    try {
        // Assign table to the active branch so it appears correctly in multi-branch setups
        const branchId = await resolveCreateBranchId(tenantId!, await getActiveBranchId(tenantId!));
        await prisma.table.create({
            data: { ...validated.data, tenantId, branchId }
        });
        revalidatePath('/dashboard/tables');
        return { success: true };
    } catch {
        return { error: "فشل إنشاء الطاولة. ربما الرقم مكرر في هذا الفرع." };
    }
}

export async function updateTablePosition(id: string, x: number, y: number) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'CAPTAIN']);
    requireTenantId(tenantId);
    try {
        const branchFilter = await getBranchFilter(tenantId);
        const existing = await prisma.table.findFirst({ where: { id, tenantId, ...branchFilter } });
        if (!existing) return { error: "Table not found or access denied" };

        await prisma.table.update({ where: { id }, data: { x, y } });
        revalidatePath('/dashboard/tables');
        return { success: true };
    } catch (_error) {
        return { error: "فشل نقل الطاولة" };
    }
}

export async function updateTableStatus(id: string, status: TableStatus) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'CAPTAIN', 'WAITER']);
    requireTenantId(tenantId);
    try {
        const branchFilter = await getBranchFilter(tenantId);
        const existing = await prisma.table.findFirst({ where: { id, tenantId, ...branchFilter } });
        if (!existing) return { error: "Table not found or access denied" };

        const clearTimers = status === 'DIRTY' || status === 'AVAILABLE';
        await prisma.$transaction(async (tx) => {
            await tx.table.update({
                where: { id },
                data: { status, ...(clearTimers ? { occupiedSince: null } : {}) },
            });

            if (clearTimers) {
                const activeOrders = await tx.order.findMany({
                    where: { tableId: id, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
                    select: { id: true }
                });
                for (const order of activeOrders) {
                    await completeOrderTransaction(tx, order.id);
                }
            }
        }, { timeout: 15000 });

        // إرسال Pusher event لجميع تغييرات الحالة فورياً
        if (status === 'DIRTY') {
            await triggerPusher(`tenant-${tenantId}-orders`, 'table-dirty', { tableId: id, timestamp: Date.now() });
        }
        // table-status-changed يُحدّث dropdown الطاولات على شاشة الكابتن
        await triggerPusher(`tenant-${tenantId}-orders`, 'table-status-changed', {
            tableId: id,
            status,
            timestamp: Date.now()
        });

        revalidatePath('/dashboard/tables');
        revalidatePath('/dashboard/pos');
        revalidatePath('/captain');
        revalidatePath('/captain/tables');
        return { success: true };
    } catch (error) {
        console.error("Failed to update table status:", error);
        return { error: "فشل تحديث الحالة" };
    }
}

export async function updateTableCapacity(id: string, capacity: number) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'CAPTAIN']);
    requireTenantId(tenantId);
    try {
        const branchFilter = await getBranchFilter(tenantId);
        const existing = await prisma.table.findFirst({ where: { id, tenantId, ...branchFilter } });
        if (!existing) return { error: "Table not found or access denied" };

        await prisma.table.update({ where: { id }, data: { capacity } });
        revalidatePath('/dashboard/tables');
        return { success: true };
    } catch (_error) {
        return { error: "فشل تحديث السعة" };
    }
}

export async function bulkCreateTables({
    count, capacity, prefix, startFrom,
}: {
    count: number;
    capacity: number;
    prefix: string;
    startFrom: number;
}) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'CAPTAIN']);
    requireTenantId(tenantId);

    if (count < 1 || count > 200) return { error: 'عدد الطاولات يجب أن يكون بين 1 و 200' };
    if (capacity < 1 || capacity > 50) return { error: 'السعة يجب أن تكون بين 1 و 50' };

    const branchId = await resolveCreateBranchId(tenantId!, await getActiveBranchId(tenantId!));
    const cols = Math.ceil(Math.sqrt(count));

    const data = Array.from({ length: count }, (_, i) => ({
        number: `${prefix.trim()} ${startFrom + i}`,
        capacity,
        x: 50 + (i % cols) * 130,
        y: 50 + Math.floor(i / cols) * 130,
        tenantId: tenantId!,
        ...(branchId ? { branchId } : {}),
    }));

    try {
        const result = await prisma.table.createMany({ data, skipDuplicates: true });
        revalidatePath('/dashboard/tables');
        return { success: true, created: result.count, skipped: count - result.count };
    } catch {
        return { error: 'فشل إنشاء الطاولات' };
    }
}

export async function deleteTable(id: string) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    requireTenantId(tenantId);
    try {
        const branchFilter = await getBranchFilter(tenantId);
        const existing = await prisma.table.findFirst({ where: { id, tenantId, ...branchFilter } });
        if (!existing) return { error: "Table not found or access denied" };

        await prisma.table.delete({ where: { id } });
        revalidatePath('/dashboard/tables');
        return { success: true };
    } catch (_error) {
        return { error: "فشل حذف الطاولة" };
    }
}
