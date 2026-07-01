'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { verifyRole, getCurrentUser } from '@/lib/auth-guard';
import { requireTenantId } from '@/lib/utils/require-tenant';
import { getActiveBranchId, resolveCreateBranchId } from '@/lib/utils/branch-filter';

export async function getSuppliers() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];

        const branchId = await getActiveBranchId(tenantId);
        return await prisma.supplier.findMany({
            where: { tenantId, isDeleted: false, ...(branchId ? { branchId } : {}) },
            orderBy: { name: 'asc' },
        });
    } catch {
        return [];
    }
}

// جلب الموردين مع إحصائيات الطلبات والديون
export async function getSuppliersWithStats() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];

        const branchId = await getActiveBranchId(tenantId);
        const branchWhere = branchId ? { branchId } : {};

        const suppliers = await prisma.supplier.findMany({
            where: { tenantId, isDeleted: false, ...(branchId ? { branchId } : {}) },
            orderBy: { name: 'asc' },
            include: {
                purchaseOrders: {
                    where: { tenantId, ...branchWhere },
                    select: {
                        id: true,
                        poNumber: true,
                        status: true,
                        totalCost: true,
                        paidAmount: true,
                        paymentType: true,
                        paymentStatus: true,
                        dueDate: true,
                        createdAt: true,
                    }
                }
            }
        });

        return suppliers.map(s => {
            const activeOrders = s.purchaseOrders.filter(o => o.status !== 'CANCELLED');
            const totalPurchased = activeOrders.reduce((sum, o) => sum + o.totalCost, 0);
            const totalDebt = activeOrders
                .filter(o => o.paymentType === 'DEFERRED' && o.paymentStatus !== 'PAID')
                .reduce((sum, o) => sum + (o.totalCost - o.paidAmount), 0);
            const ordersCount = activeOrders.length;

            return {
                ...s,
                totalPurchased,
                totalDebt,
                ordersCount,
            };
        });
    } catch {
        return [];
    }
}

// جلب تفاصيل مورد واحد مع كل طلباته
export async function getSupplierWithOrders(supplierId: string) {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return null;

        const branchId = await getActiveBranchId(tenantId);
        const branchWhere = branchId ? { branchId } : {};

        return await prisma.supplier.findFirst({
            where: { id: supplierId, tenantId, isDeleted: false },
            include: {
                purchaseOrders: {
                    where: { tenantId, ...branchWhere },
                    include: {
                        items: { include: { material: { select: { name: true, unit: true } } } },
                        payments: true,
                    },
                    orderBy: { createdAt: 'desc' }
                }
            }
        });
    } catch {
        return null;
    }
}

export async function createSupplier(data: {
    name: string;
    contact?: string;
    phone?: string;
    email?: string;
    address?: string;
}) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'STORE_MANAGER']);
    requireTenantId(tenantId);

    const branchId = await getActiveBranchId(tenantId);

    try {
        await prisma.supplier.create({
            data: {
                name: data.name,
                contact: data.contact || null,
                phone: data.phone || null,
                email: data.email || null,
                address: data.address || null,
                isActive: true,
                tenantId,
                branchId: await resolveCreateBranchId(tenantId, branchId),
            },
        });

        revalidatePath('/inventory/suppliers');
        return { success: true };
    } catch (error) {
        console.error('createSupplier error:', error);
        return { error: 'فشل في إنشاء المورد' };
    }
}

export async function updateSupplier(
    id: string,
    data: { name?: string; contact?: string; phone?: string; email?: string; address?: string }
) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'STORE_MANAGER']);
    requireTenantId(tenantId);

    try {
        const existing = await prisma.supplier.findFirst({ where: { id, tenantId } });
        if (!existing) return { error: 'المورد غير موجود' };

        await prisma.supplier.update({ where: { id }, data });
        revalidatePath('/inventory/suppliers');
        return { success: true };
    } catch (error) {
        console.error('updateSupplier error:', error);
        return { error: 'فشل في تحديث المورد' };
    }
}

export async function toggleSupplierStatus(id: string, isActive: boolean) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'STORE_MANAGER']);
    requireTenantId(tenantId);

    try {
        const existing = await prisma.supplier.findFirst({ where: { id, tenantId } });
        if (!existing) return { error: 'المورد غير موجود' };

        await prisma.supplier.update({ where: { id }, data: { isActive } });
        revalidatePath('/inventory/suppliers');
        return { success: true };
    } catch (error) {
        console.error('toggleSupplierStatus error:', error);
        return { error: 'فشل في تغيير حالة المورد' };
    }
}

export async function deleteSupplier(id: string) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'STORE_MANAGER']);
    requireTenantId(tenantId);

    try {
        const existing = await prisma.supplier.findFirst({ where: { id, tenantId } });
        if (!existing) return { error: 'المورد غير موجود' };

        await prisma.supplier.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date() },
        });

        revalidatePath('/inventory/suppliers');
        return { success: true };
    } catch (error) {
        console.error('deleteSupplier error:', error);
        return { error: 'فشل في حذف المورد' };
    }
}
