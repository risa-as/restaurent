'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { getTenantContext } from '@/lib/tenant';
import { revalidatePath } from 'next/cache';

export async function getPlatformSettings() {
    const settings = await prisma.platformSettings.upsert({
        where: { id: 'singleton' },
        create: { id: 'singleton' },
        update: {},
    });
    return settings;
}

export async function getBillingInfo() {
    const session = await auth();
    if (!session) throw new Error('Unauthorized');

    const context = await getTenantContext();
    if (!context) throw new Error('No tenant context');

    const [tenant, settings, pendingRequest, latestRejection] = await Promise.all([
        prisma.tenant.findUnique({ where: { id: context.id } }),
        getPlatformSettings(),
        prisma.manualPayment.findFirst({
            where: { tenantId: context.id, status: 'PENDING' }
        }),
        prisma.manualPayment.findFirst({
            where: { tenantId: context.id, status: 'REJECTED' },
            orderBy: { createdAt: 'desc' }
        }),
    ]);

    return { tenant, settings, pendingRequest, latestRejection, supportPhone: settings.supportPhone };
}

export async function submitUpgradeRequest(plan: string, months: number, receiptUrl?: string, receiptNote?: string) {
    const session = await auth();
    if (!session) throw new Error('غير مصرح');

    const context = await getTenantContext();
    if (!context) throw new Error('لا يوجد سياق مطعم');

    // Check for existing pending request
    const existing = await prisma.manualPayment.findFirst({
        where: { tenantId: context.id, status: 'PENDING' }
    });
    if (existing) throw new Error('يوجد طلب ترقية معلق بالفعل، يرجى انتظار مراجعته');

    const settings = await getPlatformSettings();
    const PLAN_PRICES: Record<string, number> = {
        BASIC: settings.pricingBasic,
        PRO: settings.pricingPro,
        ENTERPRISE: settings.pricingEnterprise,
    };
    const amount = (PLAN_PRICES[plan] || 0) * months;

    await prisma.manualPayment.create({
        data: {
            tenantId: context.id,
            amount,
            method: 'BANK_TRANSFER',
            plan: plan as 'BASIC' | 'PRO' | 'ENTERPRISE',
            months,
            receiptUrl: receiptUrl || null,
            receiptNote: receiptNote || null,
            paidAt: new Date(),
        },
    });

    revalidatePath('/dashboard/billing');
}

export async function submitPayment(formData: FormData) {
    const session = await auth();
    if (!session) throw new Error('غير مصرح');

    const context = await getTenantContext();
    if (!context) throw new Error('لا يوجد سياق مطعم');

    const amount = parseFloat(formData.get('amount') as string);
    const method = formData.get('method') as 'BANK_TRANSFER' | 'ZAIN_CASH' | 'OTHER';
    const plan = formData.get('plan') as 'BASIC' | 'PRO' | 'ENTERPRISE';
    const months = parseInt(formData.get('months') as string) || 1;
    const receiptUrl = (formData.get('receiptUrl') as string) || null;
    const receiptNote = (formData.get('receiptNote') as string) || null;

    if (!amount || amount <= 0) throw new Error('المبلغ غير صحيح');
    if (!method) throw new Error('طريقة الدفع مطلوبة');
    if (!plan) throw new Error('الخطة مطلوبة');

    await prisma.manualPayment.create({
        data: {
            tenantId: context.id,
            amount,
            method,
            plan,
            months,
            receiptUrl,
            receiptNote,
            paidAt: new Date(),
        },
    });

    revalidatePath('/dashboard/billing');
}

export async function getPaymentHistory() {
    const session = await auth();
    if (!session) throw new Error('Unauthorized');

    const context = await getTenantContext();
    if (!context) throw new Error('No tenant context');

    return prisma.manualPayment.findMany({
        where: { tenantId: context.id },
        orderBy: { createdAt: 'desc' },
    });
}
