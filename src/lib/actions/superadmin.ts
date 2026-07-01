'use server';

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { resend, getEmailFrom } from '@/lib/resend';
import { invalidatePlanCache } from '@/lib/plan-limits';

async function requireSuperAdmin() {
    const session = await auth();
    if (!session || session.user?.role !== 'SUPER_ADMIN') {
        throw new Error('غير مصرح');
    }
    return session.user;
}

async function writeAuditLog(action: string, details: string, userId: string) {
    try {
        await prisma.auditLog.create({ data: { action, details, userId } });
    } catch { /* non-critical */ }
}

// ─── Payment Management ───────────────────────────────────────────────────────

export async function getPendingPayments() {
    await requireSuperAdmin();
    return prisma.manualPayment.findMany({
        include: { tenant: { select: { name: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
    });
}

export async function approvePayment(paymentId: string) {
    const admin = await requireSuperAdmin();

    const payment = await prisma.manualPayment.findUnique({
        where: { id: paymentId },
        include: {
            tenant: {
                include: { users: { where: { role: 'ADMIN', isDeleted: false }, take: 1 } }
            }
        }
    });

    if (!payment) throw new Error('الدفعة غير موجودة');
    if (payment.status !== 'PENDING') throw new Error('الدفعة ليست قيد الانتظار');

    const now = new Date();
    const currentEnd = payment.tenant.currentPeriodEnd
        ? new Date(Math.max(payment.tenant.currentPeriodEnd.getTime(), now.getTime()))
        : now;
    const newEnd = new Date(currentEnd.getTime() + payment.months * 30 * 24 * 60 * 60 * 1000);

    // Auto-assign sequential invoice number
    const maxInvoice = await prisma.manualPayment.aggregate({
        _max: { invoiceNumber: true }
    });
    const nextInvoiceNumber = (maxInvoice._max.invoiceNumber ?? 0) + 1;

    await prisma.$transaction([
        prisma.manualPayment.update({
            where: { id: paymentId },
            data: {
                status: 'APPROVED',
                approvedAt: now,
                approvedById: admin.id,
                invoiceNumber: nextInvoiceNumber,
                periodFrom: now,
                periodTo: newEnd,
            },
        }),
        prisma.tenant.update({
            where: { id: payment.tenantId },
            data: {
                currentPeriodEnd: newEnd,
                subscriptionStatus: 'ACTIVE',
                isActive: true,
                plan: payment.plan,
            },
        }),
    ]);

    await writeAuditLog(
        'PAYMENT_APPROVED',
        `قبول دفعة — ${payment.tenant.name} — ${payment.amount.toLocaleString()} د.ع`,
        admin.id!
    );

    // Send email notification (graceful fallback)
    const adminEmail = payment.tenant.users[0]?.email;
    if (adminEmail && resend) {
        try {
            await resend.emails.send({
                from: getEmailFrom(),
                to: adminEmail,
                subject: 'تم قبول دفعتك ✅',
                html: `<div dir="rtl"><h2>تم قبول دفعتك!</h2><p>تمت الموافقة على دفعتك بمبلغ ${payment.amount.toLocaleString()} د.ع لخطة ${payment.plan}.</p><p>تم تمديد اشتراكك حتى ${newEnd.toLocaleDateString('ar-SA')}.</p></div>`,
            });
        } catch (e) { console.error('Email error:', e); }
    }

    revalidatePath('/superadmin/payments');
    revalidatePath('/dashboard/billing');
}

export async function rejectPayment(paymentId: string, reason: string) {
    const admin = await requireSuperAdmin();

    const payment = await prisma.manualPayment.findUnique({
        where: { id: paymentId },
        include: {
            tenant: {
                include: { users: { where: { role: 'ADMIN', isDeleted: false }, take: 1 } }
            }
        }
    });

    if (!payment) throw new Error('الدفعة غير موجودة');

    await prisma.manualPayment.update({
        where: { id: paymentId },
        data: { status: 'REJECTED', adminNote: reason },
    });

    await writeAuditLog(
        'PAYMENT_REJECTED',
        `رفض دفعة — ${payment.tenant.name} — ${reason}`,
        admin.id!
    );

    const adminEmail = payment.tenant.users[0]?.email;
    if (adminEmail && resend) {
        try {
            await resend.emails.send({
                from: getEmailFrom(),
                to: adminEmail,
                subject: 'تم رفض دفعتك ❌',
                html: `<div dir="rtl"><h2>تم رفض دفعتك</h2><p>للأسف، تم رفض دفعتك بمبلغ ${payment.amount.toLocaleString()} د.ع.</p><p><strong>السبب:</strong> ${reason}</p><p>يرجى التواصل معنا لمزيد من المعلومات.</p></div>`,
            });
        } catch (e) { console.error('Email error:', e); }
    }

    revalidatePath('/superadmin/payments');
    revalidatePath('/dashboard/billing');
}

// ─── Tenant Management ────────────────────────────────────────────────────────

export async function changeTenantPlan(tenantId: string, plan: 'TRIAL' | 'BASIC' | 'PRO' | 'ENTERPRISE') {
    const admin = await requireSuperAdmin();

    const tenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: { plan },
    });

    await writeAuditLog('PLAN_CHANGED', `تغيير خطة ${tenant.name} إلى ${plan}`, admin.id!);
    revalidatePath('/superadmin/tenants');
}

export async function manuallyExtendTenant(tenantId: string, months: number, amount: number = 0) {
    const admin = await requireSuperAdmin();

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new Error('المطعم غير موجود');

    const now = new Date();
    const base = tenant.currentPeriodEnd && tenant.currentPeriodEnd > now
        ? tenant.currentPeriodEnd
        : now;
    const newEnd = new Date(base.getTime() + months * 30 * 24 * 60 * 60 * 1000);

    const maxInvoice = await prisma.manualPayment.aggregate({
        _max: { invoiceNumber: true }
    });
    const nextInvoiceNumber = (maxInvoice._max.invoiceNumber ?? 0) + 1;

    await prisma.$transaction([
        prisma.tenant.update({
            where: { id: tenantId },
            data: { currentPeriodEnd: newEnd, subscriptionStatus: 'ACTIVE', isActive: true },
        }),
        prisma.manualPayment.create({
            data: {
                tenantId,
                amount,
                method: 'OTHER',
                plan: tenant.plan as any,
                months,
                status: 'APPROVED',
                approvedAt: now,
                approvedById: admin.id,
                invoiceNumber: nextInvoiceNumber,
                periodFrom: now,
                periodTo: newEnd,
                receiptNote: 'تمديد يدوي من السوبر أدمن',
                paidAt: now,
            },
        }),
    ]);

    await writeAuditLog('MANUAL_EXTEND', `تمديد ${tenant.name} بـ ${months} شهر حتى ${newEnd.toLocaleDateString('ar-SA')}`, admin.id!);
    revalidatePath('/superadmin/tenants');
    revalidatePath('/superadmin/billing');
    return { success: true };
}

export async function extendTenantTrial(tenantId: string, days: number) {
    const admin = await requireSuperAdmin();

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new Error('المطعم غير موجود');

    const base = tenant.trialEndsAt && tenant.trialEndsAt > new Date()
        ? tenant.trialEndsAt
        : new Date();
    const newDate = new Date(base.getTime() + days * 24 * 60 * 60 * 1000);

    await prisma.tenant.update({
        where: { id: tenantId },
        data: { trialEndsAt: newDate },
    });

    await writeAuditLog('TRIAL_EXTENDED', `تمديد تجربة ${tenant.name} بـ ${days} يوم`, admin.id!);
    revalidatePath('/superadmin/tenants');
}

export async function sendEmailToTenantAdmin(tenantId: string, subject: string, message: string) {
    const _admin = await requireSuperAdmin();

    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: { users: { where: { role: 'ADMIN', isDeleted: false }, take: 1 } }
    });

    if (!tenant) throw new Error('المطعم غير موجود');
    const adminEmail = tenant.users[0]?.email;
    if (!adminEmail) throw new Error('لا يوجد بريد إلكتروني للمدير');

    if (resend) {
        await resend.emails.send({
            from: getEmailFrom(),
            to: adminEmail,
            subject,
            html: `<div dir="rtl"><p>${message.replace(/\n/g, '<br>')}</p></div>`,
        });
    }

    revalidatePath('/superadmin/tenants');
}

export async function toggleTenantStatus(tenantId: string, isActive: boolean) {
    const admin = await requireSuperAdmin();

    const tenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: { isActive },
    });

    await writeAuditLog(
        isActive ? 'TENANT_ACTIVATED' : 'TENANT_SUSPENDED',
        `${isActive ? 'تفعيل' : 'إيقاف'} ${tenant.name}`,
        admin.id!
    );
    revalidatePath('/superadmin/tenants');
}

// ─── Plan Pricing ─────────────────────────────────────────────────────────────

export async function updatePlanPricing(formData: FormData) {
    const admin = await requireSuperAdmin();

    const data = {
        pricingBasic: parseInt(formData.get('pricingBasic') as string) || 50000,
        pricingPro: parseInt(formData.get('pricingPro') as string) || 100000,
        pricingEnterprise: parseInt(formData.get('pricingEnterprise') as string) || 200000,
    };

    await prisma.platformSettings.upsert({
        where: { id: 'singleton' },
        create: { id: 'singleton', ...data },
        update: data,
    });

    await writeAuditLog('PRICING_UPDATED', `تحديث أسعار الخطط: BASIC=${data.pricingBasic} PRO=${data.pricingPro} ENT=${data.pricingEnterprise}`, admin.id!);
    revalidatePath('/superadmin/plans');
    revalidatePath('/dashboard/billing');
}

export async function getPlanPricing() {
    const settings = await prisma.platformSettings.upsert({
        where: { id: 'singleton' },
        create: { id: 'singleton' },
        update: {},
        select: { pricingBasic: true, pricingPro: true, pricingEnterprise: true },
    });
    return settings;
}

// ─── Platform Settings ────────────────────────────────────────────────────────

export async function updatePlatformSettings(formData: FormData) {
    const admin = await requireSuperAdmin();

    const data = {
        bankName: (formData.get('bankName') as string) || '',
        bankAccount: (formData.get('bankAccount') as string) || '',
        bankAccountName: (formData.get('bankAccountName') as string) || '',
        bankIban: (formData.get('bankIban') as string) || '',
        zainCashNumber: (formData.get('zainCashNumber') as string) || '',
        supportPhone: (formData.get('supportPhone') as string) || '',
        welcomeMessage: (formData.get('welcomeMessage') as string) || '',
        trialDurationDays: parseInt(formData.get('trialDurationDays') as string) || 14,
        gracePeriodDays: parseInt(formData.get('gracePeriodDays') as string) || 3,
        maintenanceMode: formData.get('maintenanceMode') === 'true',
        usdToIqdRate: parseInt(formData.get('usdToIqdRate') as string) || 1310,
    };

    await prisma.platformSettings.upsert({
        where: { id: 'singleton' },
        create: { id: 'singleton', ...data },
        update: data,
    });

    await writeAuditLog('SETTINGS_UPDATED', 'تحديث إعدادات المنصة', admin.id!);
    revalidatePath('/superadmin/settings');
    revalidatePath('/dashboard/billing');
}

// ─── Super Admin 2FA Label Email ─────────────────────────────────────────────

export async function updateTwoFactorEmail(email: string) {
    const user = await requireSuperAdmin();
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        return { error: 'بريد إلكتروني غير صالح' };
    }
    await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorEmail: trimmed },
    });
    revalidatePath('/superadmin/settings');
    return { success: true };
}

export async function getTwoFactorEmail() {
    const user = await requireSuperAdmin();
    const record = await prisma.user.findUnique({
        where: { id: user.id },
        select: { twoFactorEmail: true, email: true },
    });
    return { twoFactorEmail: record?.twoFactorEmail ?? '', loginEmail: record?.email ?? '' };
}

export async function getPlatformSettingsForAdmin() {
    await requireSuperAdmin();
    return prisma.platformSettings.upsert({
        where: { id: 'singleton' },
        create: { id: 'singleton' },
        update: {},
    });
}

// ─── Super Admin Billing Dashboard ───────────────────────────────────────────

export async function getSuperAdminBillingDashboard() {
    await requireSuperAdmin();

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [tenants, pendingRequests, approvedThisMonth] = await Promise.all([
        prisma.tenant.findMany({
            where: { isActive: true },
            select: {
                id: true, name: true, plan: true, subscriptionStatus: true,
                currentPeriodEnd: true, trialEndsAt: true,
                manualPayments: {
                    where: { status: 'PENDING' },
                    select: { id: true },
                    take: 1,
                },
            },
        }),
        prisma.manualPayment.findMany({
            where: { status: 'PENDING' },
            include: { tenant: { select: { name: true, plan: true } } },
            orderBy: { createdAt: 'asc' },
        }),
        prisma.manualPayment.aggregate({
            where: { status: 'APPROVED', approvedAt: { gte: startOfMonth } },
            _sum: { amount: true },
        }),
    ]);

    const settings = await prisma.platformSettings.upsert({
        where: { id: 'singleton' },
        create: { id: 'singleton' },
        update: {},
        select: { pricingBasic: true, pricingPro: true, pricingEnterprise: true },
    });

    const planPriceMap: Record<string, number> = {
        BASIC: settings.pricingBasic,
        PRO: settings.pricingPro,
        ENTERPRISE: settings.pricingEnterprise,
    };

    const activePlanTenants = tenants.filter(t => t.subscriptionStatus === 'ACTIVE');
    const mrr = activePlanTenants.reduce((sum, t) => sum + (planPriceMap[t.plan] || 0), 0);

    const expiryDate = (t: typeof tenants[0]) =>
        t.subscriptionStatus === 'TRIAL' ? t.trialEndsAt : t.currentPeriodEnd;

    const expiringTenants = tenants.filter(t => {
        const exp = expiryDate(t);
        return exp && exp > now && exp <= sevenDaysFromNow;
    });

    const planBreakdown = Object.entries(
        tenants.reduce((acc: Record<string, number>, t) => {
            acc[t.plan] = (acc[t.plan] || 0) + 1;
            return acc;
        }, {})
    ).map(([plan, count]) => ({ plan, count }));

    return {
        mrr,
        mrrThisMonth: approvedThisMonth._sum.amount || 0,
        totalActiveTenants: activePlanTenants.length,
        totalTenants: tenants.length,
        pendingRequestsCount: pendingRequests.length,
        pendingRequests,
        expiringTenants: expiringTenants.map(t => ({
            id: t.id,
            name: t.name,
            plan: t.plan,
            expiresAt: expiryDate(t),
            hasPendingRequest: t.manualPayments.length > 0,
        })),
        planBreakdown,
    };
}

// ─── Revenue Analytics ────────────────────────────────────────────────────────

export async function getRevenueAnalytics() {
    await requireSuperAdmin();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const _sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [approvedPayments, totalTenants] = await Promise.all([
        prisma.manualPayment.findMany({
            where: { status: 'APPROVED' },
            orderBy: { createdAt: 'asc' },
        }),
        prisma.tenant.count({ where: { isActive: true } }),
    ]);

    const currentMonthPayments = approvedPayments.filter(p => p.createdAt >= startOfMonth);
    const mrr = currentMonthPayments.reduce((sum, p) => sum + p.amount / p.months, 0);
    const arr = mrr * 12;
    const totalRevenue = approvedPayments.reduce((sum, p) => sum + p.amount, 0);
    const avgPerRestaurant = totalTenants > 0 ? totalRevenue / totalTenants : 0;

    // Monthly breakdown (last 6 months)
    const monthlyData: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const monthRevenue = approvedPayments
            .filter(p => p.createdAt >= monthStart && p.createdAt <= monthEnd)
            .reduce((sum, p) => sum + p.amount, 0);
        monthlyData.push({
            month: monthStart.toLocaleDateString('ar-SA', { month: 'short', year: '2-digit' }),
            revenue: monthRevenue,
        });
    }

    // Method breakdown
    const bankTotal = approvedPayments
        .filter(p => p.method === 'BANK_TRANSFER')
        .reduce((sum, p) => sum + p.amount, 0);
    const zainCashTotal = approvedPayments
        .filter(p => p.method === 'ZAIN_CASH')
        .reduce((sum, p) => sum + p.amount, 0);
    const otherTotal = approvedPayments
        .filter(p => p.method === 'OTHER')
        .reduce((sum, p) => sum + p.amount, 0);

    return { mrr, arr, totalRevenue, avgPerRestaurant, monthlyData, bankTotal, zainCashTotal, otherTotal };
}

// ─── Dashboard Analytics ──────────────────────────────────────────────────────

export async function getDashboardAnalytics() {
    await requireSuperAdmin();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const tenants = await prisma.tenant.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true },
    });

    // Build daily counts for last 30 days
    const dailyMap: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setDate(d.getDate() - (29 - i));
        d.setHours(0, 0, 0, 0);
        dailyMap[d.toISOString().split('T')[0]] = 0;
    }

    tenants.forEach(t => {
        const key = t.createdAt.toISOString().split('T')[0];
        if (dailyMap[key] !== undefined) dailyMap[key]++;
    });

    const registrationData = Object.entries(dailyMap).map(([date, count]) => ({
        date: new Date(date).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' }),
        count,
    }));

    // Conversion rate: tenants with ACTIVE status / total non-TRIAL tenants
    const [activeTenants, totalNonTrial] = await Promise.all([
        prisma.tenant.count({ where: { subscriptionStatus: 'ACTIVE' } }),
        prisma.tenant.count({ where: { subscriptionStatus: { not: 'TRIAL' } } }),
    ]);
    const conversionRate = totalNonTrial > 0 ? Math.round((activeTenants / totalNonTrial) * 100) : 0;

    return { registrationData, conversionRate };
}

// ─── Tenant Detail ────────────────────────────────────────────────────────────

export async function getTenantDetail(id: string) {
    await requireSuperAdmin();

    const tenant = await prisma.tenant.findUnique({
        where: { id },
        include: {
            users: { where: { isDeleted: false } },
            manualPayments: {
                orderBy: { createdAt: 'desc' },
                include: { approvedBy: { select: { name: true } } },
            },
            _count: { select: { orders: true, menuItems: true } },
        },
    });

    if (!tenant) return null;

    const [totalRevenue, todayOrders] = await Promise.all([
        prisma.bill.aggregate({
            where: { order: { tenantId: id } },
            _sum: { amount: true },
        }),
        prisma.order.count({
            where: {
                tenantId: id,
                createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
            },
        }),
    ]);

    return { tenant, totalRevenue: totalRevenue._sum.amount || 0, todayOrders };
}

// ─── Announcements ────────────────────────────────────────────────────────────

export async function createAnnouncement(formData: FormData) {
    const admin = await requireSuperAdmin();

    const title = formData.get('title') as string;
    const body = formData.get('body') as string;
    const type = (formData.get('type') as 'INFO' | 'WARNING' | 'UPDATE') || 'INFO';
    const targetPlan = (formData.get('targetPlan') as string) || null;
    const expiresAtStr = formData.get('expiresAt') as string;

    if (!title || !body) throw new Error('العنوان والمحتوى مطلوبان');

    await prisma.announcement.create({
        data: {
            title,
            body,
            type,
            targetPlan: (targetPlan as any) || null,
            expiresAt: expiresAtStr ? new Date(expiresAtStr) : null,
            createdById: admin.id,
        },
    });

    await writeAuditLog('ANNOUNCEMENT_CREATED', `إنشاء إعلان: ${title}`, admin.id!);
    revalidatePath('/superadmin/announcements');
}

export async function getAnnouncements() {
    await requireSuperAdmin();
    return prisma.announcement.findMany({
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { name: true } } },
    });
}

export async function toggleAnnouncement(id: string, isActive: boolean) {
    const admin = await requireSuperAdmin();
    await prisma.announcement.update({ where: { id }, data: { isActive } });
    await writeAuditLog('ANNOUNCEMENT_TOGGLED', `${isActive ? 'تفعيل' : 'تعطيل'} إعلان`, admin.id!);
    revalidatePath('/superadmin/announcements');
}

export async function deleteAnnouncement(id: string) {
    const admin = await requireSuperAdmin();
    const ann = await prisma.announcement.delete({ where: { id } });
    await writeAuditLog('ANNOUNCEMENT_DELETED', `حذف إعلان: ${ann.title}`, admin.id!);
    revalidatePath('/superadmin/announcements');
}

export async function getActiveAnnouncementsForTenant(plan: string) {
    const now = new Date();
    return prisma.announcement.findMany({
        where: {
            isActive: true,
            AND: [
                { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
                { OR: [{ targetPlan: null }, { targetPlan: plan as any }] },
            ],
        },
        orderBy: { createdAt: 'desc' },
    });
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

export async function getAuditLogs(filters?: { dateFrom?: string; dateTo?: string; page?: number }) {
    await requireSuperAdmin();

    const where: any = {};
    if (filters?.dateFrom) where.createdAt = { ...where.createdAt, gte: new Date(filters.dateFrom) };
    if (filters?.dateTo) {
        const end = new Date(filters.dateTo);
        end.setHours(23, 59, 59, 999);
        where.createdAt = { ...where.createdAt, lte: end };
    }

    const page = filters?.page || 1;
    const take = 50;
    const skip = (page - 1) * take;

    const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take,
            skip,
            include: { user: { select: { name: true, email: true } } },
        }),
        prisma.auditLog.count({ where }),
    ]);

    return { logs, total, page, totalPages: Math.ceil(total / take) };
}


export async function toggleMultiBranch(tenantId: string) {
    await requireSuperAdmin();
    try {
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { multiBranchEnabled: true, name: true } });
        if (!tenant) return { error: 'المطعم غير موجود' };

        const newValue = !tenant.multiBranchEnabled;

        // When enabling multi-branch, ensure a main branch exists and re-home any
        // legacy NULL-branch data onto it so nothing is orphaned once branch
        // filtering kicks in.
        if (newValue) {
            let mainBranchId: string | null = null;
            const existingMain = await prisma.branch.findFirst({
                where: { tenantId, isMainBranch: true },
                select: { id: true },
            });
            if (existingMain) {
                mainBranchId = existingMain.id;
            } else {
                const tenantFull = await prisma.tenant.findUnique({
                    where: { id: tenantId },
                    select: { serviceMode: true },
                });
                const created = await prisma.branch.create({
                    data: {
                        tenantId,
                        name: tenant.name,
                        isMainBranch: true,
                        isActive: true,
                        serviceMode: tenantFull?.serviceMode ?? 'TABLE_SERVICE',
                    },
                });
                mainBranchId = created.id;
            }

            if (mainBranchId) {
                // Re-home every branch-scoped model's legacy NULL-branch rows onto the
                // main branch so nothing is orphaned once branch filtering kicks in.
                await prisma.$transaction([
                    prisma.category.updateMany({ where: { tenantId, branchId: null }, data: { branchId: mainBranchId } }),
                    prisma.menuItem.updateMany({ where: { tenantId, branchId: null }, data: { branchId: mainBranchId } }),
                    prisma.rawMaterial.updateMany({ where: { tenantId, branchId: null }, data: { branchId: mainBranchId } }),
                    prisma.offer.updateMany({ where: { tenantId, branchId: null }, data: { branchId: mainBranchId } }),
                    prisma.supplier.updateMany({ where: { tenantId, branchId: null }, data: { branchId: mainBranchId } }),
                    prisma.table.updateMany({ where: { tenantId, branchId: null }, data: { branchId: mainBranchId } }),
                    prisma.reservation.updateMany({ where: { tenantId, branchId: null }, data: { branchId: mainBranchId } }),
                    prisma.kitchenStation.updateMany({ where: { tenantId, branchId: null }, data: { branchId: mainBranchId } }),
                    prisma.seasonalMenu.updateMany({ where: { tenantId, branchId: null }, data: { branchId: mainBranchId } }),
                    prisma.purchaseOrder.updateMany({ where: { tenantId, branchId: null }, data: { branchId: mainBranchId } }),
                    prisma.inventoryBatch.updateMany({ where: { tenantId, branchId: null }, data: { branchId: mainBranchId } }),
                    prisma.expense.updateMany({ where: { tenantId, branchId: null }, data: { branchId: mainBranchId } }),
                    prisma.dailyClose.updateMany({ where: { tenantId, branchId: null }, data: { branchId: mainBranchId } }),
                    prisma.order.updateMany({ where: { tenantId, branchId: null }, data: { branchId: mainBranchId } }),
                    prisma.cashierShift.updateMany({ where: { tenantId, branchId: null }, data: { branchId: mainBranchId } }),
                ]);
            }
        }

        await prisma.tenant.update({ where: { id: tenantId }, data: { multiBranchEnabled: newValue } });
        revalidatePath('/superadmin/tenants');
        revalidatePath(`/superadmin/tenants/${tenantId}`);
        return { success: true, multiBranchEnabled: newValue };
    } catch {
        return { error: 'فشل تغيير إعداد الأفرع' };
    }
}

const OVERRIDABLE_MODULES = [
    'delivery', 'inventory', 'loyalty', 'qrMenu', 'offers', 'reservations',
    'advancedReports', 'customBranding', 'multiBranch', 'analytics',
] as const;

/**
 * Grant or revoke a single feature for one tenant, beyond its plan.
 * value: true = force-enable, false = force-disable, null = remove override (use plan default).
 */
export async function setTenantFeatureOverride(tenantId: string, module: string, value: boolean | null) {
    await requireSuperAdmin();
    if (!OVERRIDABLE_MODULES.includes(module as any)) return { error: 'وحدة غير معروفة' };

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { featureOverrides: true } });
    if (!tenant) return { error: 'المطعم غير موجود' };

    const ov = tenant.featureOverrides;
    const current: Record<string, boolean> =
        ov && typeof ov === 'object' && !Array.isArray(ov) ? { ...(ov as Record<string, boolean>) } : {};

    if (value === null) delete current[module];
    else current[module] = value;

    await prisma.tenant.update({
        where: { id: tenantId },
        data: { featureOverrides: Object.keys(current).length ? current : Prisma.JsonNull },
    });

    revalidatePath(`/superadmin/tenants/${tenantId}`);
    return { success: true, overrides: current };
}

// ─── Plan feature/limit editing (per-plan defaults) ──────────────────────────

export async function getPlanConfigs() {
    await requireSuperAdmin();
    const rows = await prisma.planConfig.findMany();
    const map: Record<string, unknown> = {};
    for (const r of rows) map[r.plan] = r;
    return map;
}

export async function updatePlanConfig(
    plan: string,
    data: {
        modules?: Record<string, boolean>;
        maxOrdersPerMonth?: number | null;
        maxMenuItems?: number | null;
        maxStaffAccounts?: number | null;
    },
) {
    await requireSuperAdmin();
    if (!['TRIAL', 'BASIC', 'PRO', 'ENTERPRISE'].includes(plan)) return { error: 'خطة غير معروفة' };

    const updateData: Record<string, unknown> = {};
    if (data.modules) updateData.modules = data.modules;
    if ('maxOrdersPerMonth' in data) updateData.maxOrdersPerMonth = data.maxOrdersPerMonth;
    if ('maxMenuItems' in data) updateData.maxMenuItems = data.maxMenuItems;
    if ('maxStaffAccounts' in data) updateData.maxStaffAccounts = data.maxStaffAccounts;

    // Upsert so it works even if a row is missing
    await prisma.planConfig.upsert({
        where: { plan: plan as any },
        update: updateData,
        create: {
            plan: plan as any,
            modules: data.modules ?? {},
            maxOrdersPerMonth: data.maxOrdersPerMonth ?? null,
            maxMenuItems: data.maxMenuItems ?? null,
            maxStaffAccounts: data.maxStaffAccounts ?? null,
        },
    });

    invalidatePlanCache(); // effective immediately across the app
    revalidatePath('/superadmin/plans');
    return { success: true };
}

export async function updateTenantAiLimit(tenantId: string, limit: number) {
    const admin = await requireSuperAdmin();
    const safeLimit = Math.max(0, Math.floor(limit));
    const tenant = await prisma.tenant.update({
        where: { id: tenantId },
        data: { aiDailyLimit: safeLimit },
    });
    await writeAuditLog(
        'AI_LIMIT_UPDATED',
        `تحديث الحد اليومي للمساعد الذكي لـ ${tenant.name} إلى ${safeLimit === 0 ? 'غير محدود' : safeLimit}`,
        admin.id!,
    );
    revalidatePath(`/superadmin/tenants/${tenantId}`);
    return { success: true };
}

export async function changeTenantServiceMode(tenantId: string, serviceMode: 'TABLE_SERVICE' | 'QUICK_SERVICE') {
    await requireSuperAdmin();
    try {
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { multiBranchEnabled: true },
        });
        // When multi-branch is enabled, branches have independent service modes — only update the tenant default
        // When single-branch, cascade to all branches to stay in sync
        if (tenant?.multiBranchEnabled) {
            await prisma.tenant.update({ where: { id: tenantId }, data: { serviceMode } });
        } else {
            await prisma.$transaction([
                prisma.tenant.update({ where: { id: tenantId }, data: { serviceMode } }),
                prisma.branch.updateMany({ where: { tenantId }, data: { serviceMode } }),
            ]);
        }
        revalidatePath('/superadmin/tenants');
        revalidatePath(`/superadmin/tenants/${tenantId}`);
        return { success: true };
    } catch {
        return { error: 'فشل تغيير نمط الخدمة' };
    }
}

// ─── Create Tenant ────────────────────────────────────────────────────────────

export async function createTenantBySuperAdmin(formData: FormData) {
    await requireSuperAdmin();

    const name = (formData.get('name') as string)?.trim();
    const slug = (formData.get('slug') as string)?.trim().toLowerCase();
    const adminName = (formData.get('adminName') as string)?.trim();
    const adminEmail = (formData.get('adminEmail') as string)?.trim().toLowerCase();
    const adminPassword = (formData.get('adminPassword') as string);
    const serviceMode = (formData.get('serviceMode') as string) || 'TABLE_SERVICE';
    const plan = (formData.get('plan') as string) || 'TRIAL';
    const aiDailyLimit = Math.max(0, parseInt(formData.get('aiDailyLimit') as string) || 0);

    if (!name || !slug || !adminName || !adminEmail || !adminPassword) {
        return { error: 'جميع الحقول المطلوبة يجب ملؤها' };
    }
    if (adminPassword.length < 6) {
        return { error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' };
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
        return { error: 'معرف المطعم يقبل الأحرف الإنجليزية الصغيرة والأرقام والشرطة فقط' };
    }

    const [existingSlug, existingEmail] = await Promise.all([
        prisma.tenant.findUnique({ where: { slug } }),
        prisma.user.findUnique({ where: { email: adminEmail } }),
    ]);

    if (existingSlug) return { error: 'معرف المطعم (slug) مستخدم مسبقاً' };
    if (existingEmail) return { error: 'البريد الإلكتروني مستخدم مسبقاً' };

    const { hash } = await import('bcryptjs');
    const passwordHash = await hash(adminPassword, 12);

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 14);

    try {
        const tenant = await prisma.tenant.create({
            data: {
                name,
                slug,
                serviceMode: serviceMode as any,
                plan: plan as any,
                subscriptionStatus: plan === 'TRIAL' ? 'TRIAL' : 'ACTIVE',
                trialEndsAt: plan === 'TRIAL' ? trialEndsAt : null,
                isActive: true,
                aiDailyLimit,
                users: {
                    create: {
                        name: adminName,
                        email: adminEmail,
                        password: passwordHash,
                        role: 'ADMIN',
                    },
                },
                // Always provision a main branch so every record carries a real
                // branchId from day one — no NULL-branch data, and enabling
                // multi-branch later needs no migration.
                branches: {
                    create: {
                        name,
                        isMainBranch: true,
                        isActive: true,
                        serviceMode: serviceMode as any,
                    },
                },
            },
        });

        revalidatePath('/superadmin/tenants');
        return { success: true, tenantId: tenant.id };
    } catch (e: any) {
        return { error: e.message || 'فشل إنشاء الحساب' };
    }
}
