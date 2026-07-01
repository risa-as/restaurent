'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { unstable_noStore as noStore } from 'next/cache';
import { verifyRole } from '@/lib/auth-guard';
import { getActiveBranchId } from '@/lib/utils/branch-filter';

export async function getUnsettledCashierBills() {
    noStore();
    try {
        const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'ACCOUNTANT']);
        const branchId = await getActiveBranchId(tenantId!);
        const branchWhere = branchId ? { branchId } : {};

        return await prisma.bill.findMany({
            where: {
                tenantId,
                isSettled: false,
                paymentMethod: 'CASH',
                order: {
                    status: { in: ['COMPLETED', 'SERVED'] },
                    delivery: null,
                    ...branchWhere,
                }
            },
            include: {
                order: { include: { waiter: true, table: true } }
            },
            orderBy: { paidAt: 'desc' }
        });
    } catch (error) {
        console.error("Failed to fetch cashier bills", error);
        return [];
    }
}

export async function getUnsettledDeliveryBills() {
    noStore();
    try {
        const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'ACCOUNTANT']);
        const branchId = await getActiveBranchId(tenantId!);
        const branchWhere = branchId ? { branchId } : {};

        return await prisma.bill.findMany({
            where: {
                tenantId,
                isSettled: false,
                paymentMethod: 'CASH',
                order: {
                    delivery: { isCashHandedOver: true },
                    ...branchWhere,
                }
            },
            include: {
                order: {
                    include: { delivery: { include: { driver: true } } }
                }
            },
            orderBy: { paidAt: 'desc' }
        });
    } catch (error) {
        console.error("Failed to fetch delivery bills", error);
        return [];
    }
}

export async function settleBills(billIds: string[]) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'ACCOUNTANT']);
    try {
        await prisma.bill.updateMany({
            where: { id: { in: billIds }, tenantId },
            data: { isSettled: true, settledAt: new Date() }
        });
        revalidatePath('/dashboard/accountant/cashier');
        revalidatePath('/dashboard/accountant/delivery');
        return { success: true };
    } catch (error) {
        console.error("Failed to settle bills", error);
        return { error: "Failed to settle bills" };
    }
}

export async function getSettledCashierBills() {
    noStore();
    try {
        const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'ACCOUNTANT']);
        const branchId = await getActiveBranchId(tenantId!);
        const branchWhere = branchId ? { branchId } : {};

        return await prisma.bill.findMany({
            where: {
                tenantId,
                isSettled: true,
                paymentMethod: 'CASH',
                order: {
                    status: { in: ['COMPLETED', 'SERVED'] },
                    delivery: null,
                    ...branchWhere,
                }
            },
            include: {
                order: { include: { waiter: true, table: true } }
            },
            orderBy: { settledAt: 'desc' },
            take: 100
        });
    } catch (error) {
        console.error("Failed to fetch settled cashier bills", error);
        return [];
    }
}

export async function getSettledDeliveryBills() {
    noStore();
    try {
        const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'ACCOUNTANT']);
        const branchId = await getActiveBranchId(tenantId!);
        const branchWhere = branchId ? { branchId } : {};

        return await prisma.bill.findMany({
            where: {
                tenantId,
                isSettled: true,
                paymentMethod: 'CASH',
                order: {
                    delivery: { isCashHandedOver: true },
                    ...branchWhere,
                }
            },
            include: {
                order: {
                    include: { delivery: { include: { driver: true } } }
                }
            },
            orderBy: { settledAt: 'desc' },
            take: 100
        });
    } catch (error) {
        console.error("Failed to fetch settled delivery bills", error);
        return [];
    }
}
