'use server';

import { prisma } from '@/lib/prisma';
import { verifyRole } from '@/lib/auth-guard';
import { revalidatePath } from 'next/cache';
import { checkPlanModule } from '@/lib/plan-limits';
import { getActiveBranchId } from '@/lib/utils/branch-filter';

// ── Settings ────────────────────────────────────────────────────────────────

export async function getLoyaltySettings() {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
            loyaltyEnabled: true,
            loyaltyPointsPerThousand: true,
            loyaltyPointValueIqd: true,
            loyaltyMinRedeemPoints: true,
        },
    });
    return tenant ?? {
        loyaltyEnabled: false,
        loyaltyPointsPerThousand: 1,
        loyaltyPointValueIqd: 100,
        loyaltyMinRedeemPoints: 100,
    };
}

export async function updateLoyaltySettings(data: {
    loyaltyEnabled: boolean;
    loyaltyPointsPerThousand: number;
    loyaltyPointValueIqd: number;
    loyaltyMinRedeemPoints: number;
}) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    await checkPlanModule(tenantId, 'loyalty');
    await prisma.tenant.update({
        where: { id: tenantId },
        data,
    });
    revalidatePath('/dashboard/customers');
    return { success: true };
}

// ── Customers ───────────────────────────────────────────────────────────────

export async function getCustomers() {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    await checkPlanModule(tenantId, 'loyalty');
    const branchId = await getActiveBranchId(tenantId);
    return prisma.customer.findMany({
        where: {
            tenantId,
            ...(branchId ? { orders: { some: { branchId } } } : {}),
        },
        orderBy: { totalSpent: 'desc' },
    });
}

export async function deleteCustomer(id: string) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    const customer = await prisma.customer.findUnique({ where: { id }, select: { tenantId: true } });
    if (!customer || customer.tenantId !== tenantId) return { error: 'غير مصرح' };
    await prisma.customer.delete({ where: { id } });
    revalidatePath('/dashboard/customers');
    return { success: true };
}

/**
 * تعديل نقاط عميل — يقبل customerId (من لوحة الإدارة)
 */
export async function adjustCustomerPoints(customerId: string, points: number, operation: 'add' | 'subtract') {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { tenantId: true, totalPoints: true } });
    if (!customer || customer.tenantId !== tenantId) return { error: 'غير مصرح' };

    const newPoints = operation === 'add'
        ? customer.totalPoints + points
        : Math.max(0, customer.totalPoints - points);

    await prisma.customer.update({ where: { id: customerId }, data: { totalPoints: newPoints } });
    revalidatePath('/dashboard/customers');
    return { success: true, newPoints };
}

/**
 * تعديل نقاط عميل بواسطة رقم الهاتف — للاستخدام من الكاشير/نقطة البيع
 */
export async function adjustCustomerPointsByPhone(phone: string, points: number, operation: 'add' | 'subtract') {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'CASHIER']);
    const customer = await prisma.customer.findUnique({
        where: { tenantId_phone: { tenantId, phone } },
        select: { id: true, totalPoints: true, name: true }
    });
    if (!customer) return { error: 'لا يوجد عميل بهذا الرقم' };

    const newPoints = operation === 'add'
        ? customer.totalPoints + points
        : Math.max(0, customer.totalPoints - points);

    await prisma.customer.update({ where: { id: customer.id }, data: { totalPoints: newPoints } });
    revalidatePath('/dashboard/customers');
    return { success: true, newPoints, customerName: customer.name };
}

// ── Used by Cashier/POS ─────────────────────────────────────────────────────

/**
 * جلب بيانات عميل عبر رقم الهاتف — المعرّف الأساسي في نظام الولاء
 */
export async function getCustomerByPhone(phone: string) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'CASHIER', 'CAPTAIN']);

    const [customer, tenant] = await Promise.all([
        prisma.customer.findUnique({
            where: { tenantId_phone: { tenantId, phone } },
        }),
        prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { loyaltyPointValueIqd: true, loyaltyMinRedeemPoints: true },
        }),
    ]);

    if (!customer) return null;
    return {
        ...customer,
        loyaltyPointValueIqd: tenant?.loyaltyPointValueIqd ?? 100,
        loyaltyMinRedeemPoints: tenant?.loyaltyMinRedeemPoints ?? 100,
    };
}

/**
 * استرداد نقاط عميل — التحقق عبر رقم الهاتف ثم خصم النقاط
 * يُعيد قيمة الخصم بالدينار العراقي
 */
export async function redeemPoints(customerId: string, pointsToRedeem: number) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'CASHIER', 'CAPTAIN']);
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer || customer.tenantId !== tenantId) return { error: 'العميل غير موجود' };
    if (customer.totalPoints < pointsToRedeem) return { error: 'رصيد النقاط غير كافٍ' };

    // احسب قيمة النقاط بالدينار من إعدادات المطعم
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { loyaltyPointValueIqd: true, loyaltyMinRedeemPoints: true }
    });
    const minRedeem = tenant?.loyaltyMinRedeemPoints ?? 100;
    if (pointsToRedeem < minRedeem) return { error: `الحد الأدنى للاسترداد ${minRedeem} نقطة` };

    const valueIqd = pointsToRedeem * (tenant?.loyaltyPointValueIqd ?? 100);

    const updated = await prisma.customer.update({
        where: { id: customerId },
        data: { totalPoints: { decrement: pointsToRedeem } },
    });
    return { success: true, newTotalPoints: updated.totalPoints, discountIqd: valueIqd };
}

/**
 * استرداد نقاط عبر رقم الهاتف — للكاشير
 */
export async function redeemPointsByPhone(phone: string, pointsToRedeem: number) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'CASHIER', 'CAPTAIN']);
    const customer = await prisma.customer.findUnique({
        where: { tenantId_phone: { tenantId, phone } },
        select: { id: true, totalPoints: true, name: true }
    });
    if (!customer) return { error: 'لا يوجد عميل بهذا الرقم' };
    if (customer.totalPoints < pointsToRedeem) return { error: `رصيد النقاط غير كافٍ (المتوفر: ${customer.totalPoints})` };

    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { loyaltyPointValueIqd: true, loyaltyMinRedeemPoints: true }
    });
    const minRedeem = tenant?.loyaltyMinRedeemPoints ?? 100;
    if (pointsToRedeem < minRedeem) return { error: `الحد الأدنى للاسترداد ${minRedeem} نقطة` };

    const valueIqd = pointsToRedeem * (tenant?.loyaltyPointValueIqd ?? 100);

    const updated = await prisma.customer.update({
        where: { id: customer.id },
        data: { totalPoints: { decrement: pointsToRedeem } },
    });
    return {
        success: true,
        customerName: customer.name,
        newTotalPoints: updated.totalPoints,
        discountIqd: valueIqd
    };
}
