'use server';

import { prisma } from '@/lib/prisma';
import { verifyRole, getCurrentUser } from '@/lib/auth-guard';
import { requireTenantId } from '@/lib/utils/require-tenant';
import { revalidatePath } from 'next/cache';
import { triggerPusher } from '@/lib/pusher';
import { getOperationalBranchWhere } from '@/lib/utils/branch-filter';

/** الطاولات التي تجاوزت وقت المراجعة ويجب التحقق منها */
export async function getTablesNeedingReview() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];

        const branchWhere = await getOperationalBranchWhere(tenantId);
        const now = new Date();

        const tables = await prisma.table.findMany({
            where: {
                tenantId,
                ...branchWhere,
                status: 'OCCUPIED',
                occupiedSince: { not: null },
            },
        });

        return tables.filter(t => {
            if (!t.occupiedSince || !t.reviewAfter) return false;
            const reviewAt = new Date(t.occupiedSince.getTime() + t.reviewAfter * 60 * 1000);
            return reviewAt <= now;
        });
    } catch {
        return [];
    }
}

/** الزبون غادر — حوّل الطاولة لـ DIRTY وامسح بيانات المراجعة */
export async function markCustomerLeft(tableId: string) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'WAITER', 'CAPTAIN']);
    requireTenantId(tenantId);
    try {
        await prisma.table.update({
            where: { id: tableId },
            data: {
                status: 'DIRTY',
                occupiedSince: null,
                reviewAfter: null,
            },
        });

        revalidatePath('/waiter');
        revalidatePath('/captain/tables');
        revalidatePath('/dashboard/tables');

        await triggerPusher(`tenant-${tenantId}-orders`, 'table-status-changed', {
            tableId,
            status: 'DIRTY',
            timestamp: Date.now(),
        });

        return { success: true };
    } catch (error) {
        console.error('Failed to mark customer left:', error);
        return { error: 'فشل تحديث حالة الطاولة' };
    }
}

/** تمديد وقت المراجعة بدقائق إضافية */
export async function extendTableReview(tableId: string, extraMinutes: number = 10) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'WAITER', 'CAPTAIN']);
    requireTenantId(tenantId);
    try {
        const table = await prisma.table.findFirst({
            where: { id: tableId, tenantId },
            select: { reviewAfter: true },
        });
        if (!table) return { error: 'الطاولة غير موجودة' };

        await prisma.table.update({
            where: { id: tableId },
            data: { reviewAfter: (table.reviewAfter ?? 25) + extraMinutes },
        });

        revalidatePath('/waiter');
        return { success: true };
    } catch (error) {
        console.error('Failed to extend review:', error);
        return { error: 'فشل تمديد وقت المراجعة' };
    }
}
