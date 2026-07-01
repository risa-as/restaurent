'use server';

import { prisma } from '@/lib/prisma';
import { verifyRole, getCurrentUser } from '@/lib/auth-guard';
import { requireTenantId } from '@/lib/utils/require-tenant';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { withAudit } from '@/lib/audit';
import { getActiveBranchId, getShiftBranchWhere } from '@/lib/utils/branch-filter';

const SHIFT_COOKIE = 'current_shift';

// T113: Open a new cashier shift
export async function openShift(openingCash: number) {
    const { userId, tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'CASHIER']);
    requireTenantId(tenantId);

    try {
        // Prevent opening a second shift if one is already open
        const existing = await prisma.cashierShift.findFirst({
            where: { cashierId: userId, tenantId, closedAt: null }
        });
        if (existing) return { error: 'يوجد وردية مفتوحة بالفعل', shiftId: existing.id };

        const branchId = await getActiveBranchId(tenantId);

        const shift = await withAudit(
            { tenantId, userId },
            'SHIFT_OPEN',
            'CashierShift',
            userId,
            () => prisma.cashierShift.create({
                data: { cashierId: userId, tenantId, branchId, openingCash }
            })
        );

        // Store shift ID in a cookie. 18h covers long/overnight shifts; the
        // createOrder fallback (by cashierId) still attributes sales correctly
        // even if this expires while the shift is open.
        const cookieStore = await cookies();
        cookieStore.set(SHIFT_COOKIE, shift.id, {
            httpOnly: true,
            path: '/',
            maxAge: 18 * 60 * 60,
            sameSite: 'lax',
        });

        revalidatePath('/cashier');
        return { success: true, shiftId: shift.id };
    } catch (error) {
        console.error('openShift error:', error);
        return { error: 'فشل في فتح الوردية' };
    }
}

// T114: Close a shift with physical cash count
export async function closeShift(shiftId: string, physicalCashCount: number) {
    const { userId, tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'CASHIER']);
    requireTenantId(tenantId);

    try {
        const shift = await prisma.cashierShift.findFirst({
            where: { id: shiftId, tenantId }
        });
        if (!shift) return { error: 'الوردية غير موجودة' };
        if (shift.closedAt) return { error: 'الوردية مغلقة مسبقاً' };

        const expectedCash = shift.openingCash + shift.totalCash;
        const cashVariance = physicalCashCount - expectedCash;

        await withAudit(
            { tenantId, userId },
            'SHIFT_CLOSE',
            'CashierShift',
            shiftId,
            () => prisma.cashierShift.update({
                where: { id: shiftId },
                data: { closedAt: new Date(), closingCashEntered: physicalCashCount, expectedCash, cashVariance }
            }),
            () => prisma.cashierShift.findUnique({ where: { id: shiftId } })
        );

        // Clear the cookie
        const cookieStore = await cookies();
        cookieStore.delete(SHIFT_COOKIE);

        revalidatePath('/cashier');
        revalidatePath('/dashboard/accountant/cashier');
        return { success: true, expectedCash, cashVariance };
    } catch (error) {
        console.error('closeShift error:', error);
        return { error: 'فشل في إغلاق الوردية' };
    }
}

// T115: Get the current open shift for the calling cashier
export async function getCurrentShift() {
    try {
        const user = await getCurrentUser();
        if (!user?.tenantId) return null;

        const cookieStore = await cookies();
        const shiftId = cookieStore.get(SHIFT_COOKIE)?.value;

        if (shiftId) {
            const shift = await prisma.cashierShift.findFirst({
                where: { id: shiftId, tenantId: user.tenantId, closedAt: null }
            });
            if (shift) return shift;
        }

        // Fallback: look up by cashierId.
        // NOTE: getCurrentUser() returns `userId`, not `id`. Using `user.id`
        // here was undefined, which Prisma treats as "no filter" — so it
        // returned ANY open shift in the tenant (another cashier's shift).
        return await prisma.cashierShift.findFirst({
            where: { cashierId: user.userId, tenantId: user.tenantId, closedAt: null },
            orderBy: { openedAt: 'desc' }
        });
    } catch (error) {
        console.error('getCurrentShift error:', error);
        return null;
    }
}

// T115 (cont): Get shift history for a branch
export async function getShiftHistory(from: Date, to: Date) {
    try {
        const user = await getCurrentUser();
        if (!user?.tenantId) return [];

        const branchWhere = await getShiftBranchWhere(user.tenantId);

        return await prisma.cashierShift.findMany({
            where: {
                tenantId: user.tenantId,
                openedAt: { gte: from, lte: to },
                ...branchWhere,
            },
            include: {
                cashier: { select: { name: true, email: true } },
            },
            orderBy: { openedAt: 'desc' }
        });
    } catch (error) {
        console.error('getShiftHistory error:', error);
        return [];
    }
}
