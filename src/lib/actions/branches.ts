'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { verifyRole, getCurrentUser } from '@/lib/auth-guard';
import { checkPlanModule } from '@/lib/plan-limits';
import { ServiceMode } from '@prisma/client';
import { cookies } from 'next/headers';
import { BRANCH_COOKIE } from '@/lib/constants';

export async function getBranches() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];

        return prisma.branch.findMany({
            where: { tenantId },
            orderBy: [{ isMainBranch: 'desc' }, { createdAt: 'asc' }],
        });
    } catch {
        return [];
    }
}

export async function createBranch(data: {
    name: string;
    address?: string;
    phone?: string;
    serviceMode?: ServiceMode;
}) {
    const { tenantId } = await verifyRole(['ADMIN']);
    if (!tenantId) return { error: 'غير مصرح' };

    await checkPlanModule(tenantId, 'multiBranch');

    try {
        // Inherit tenant's serviceMode if not explicitly provided
        let effectiveServiceMode = data.serviceMode;
        if (!effectiveServiceMode) {
            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { serviceMode: true },
            });
            effectiveServiceMode = tenant?.serviceMode ?? 'TABLE_SERVICE';
        }

        await prisma.branch.create({
            data: {
                tenantId,
                name: data.name,
                address: data.address,
                phone: data.phone,
                serviceMode: effectiveServiceMode,
                isMainBranch: false,
                isActive: true,
            },
        });
        revalidatePath('/dashboard/settings/branches');
        return { success: true };
    } catch (e: any) {
        if (e?.upgradeRequired) return { error: e.message, upgradeRequired: true };
        return { error: 'فشل إنشاء الفرع' };
    }
}

export async function updateBranch(id: string, data: {
    name?: string;
    address?: string;
    phone?: string;
    serviceMode?: ServiceMode;
}) {
    const { tenantId } = await verifyRole(['ADMIN']);
    try {
        const existing = await prisma.branch.findFirst({ where: { id, tenantId: tenantId ?? undefined } });
        if (!existing) return { error: 'الفرع غير موجود' };

        if (existing.isMainBranch && data.serviceMode && tenantId) {
            await prisma.$transaction([
                prisma.branch.update({ where: { id }, data }),
                prisma.tenant.update({ where: { id: tenantId }, data: { serviceMode: data.serviceMode } }),
            ]);
        } else {
            await prisma.branch.update({ where: { id }, data });
        }
        revalidatePath('/dashboard/settings/branches');
        revalidatePath('/superadmin/tenants');
        return { success: true };
    } catch {
        return { error: 'فشل تحديث الفرع' };
    }
}

export async function toggleBranchActive(id: string) {
    const { tenantId } = await verifyRole(['ADMIN']);
    try {
        const branch = await prisma.branch.findFirst({ where: { id, tenantId: tenantId ?? undefined } });
        if (!branch) return { error: 'الفرع غير موجود' };
        if (branch.isMainBranch) return { error: 'لا يمكن تعطيل الفرع الرئيسي' };

        await prisma.branch.update({ where: { id }, data: { isActive: !branch.isActive } });
        revalidatePath('/dashboard/settings/branches');
        return { success: true };
    } catch {
        return { error: 'فشل تغيير حالة الفرع' };
    }
}

export async function setSelectedBranch(branchId: string) {
    // Only ADMIN/SUPER_ADMIN switch branches via cookie (see getActiveBranchId).
    const { tenantId } = await verifyRole(['ADMIN']);
    if (!tenantId) return { error: 'غير مصرح' };

    // Validate the branch belongs to the caller's tenant before trusting the
    // cookie value — a client could otherwise set an arbitrary branchId. Even
    // though tenantId is independently enforced on every query (a foreign branch
    // would just yield empty results), reject it explicitly to avoid a confusing
    // "no data" state and to keep the cookie trustworthy. (PRELAUNCH-AUDIT أ-2)
    const branch = await prisma.branch.findFirst({
        where: { id: branchId, tenantId },
        select: { id: true },
    });
    if (!branch) return { error: 'الفرع غير موجود' };

    const cookieStore = await cookies();
    cookieStore.set(BRANCH_COOKIE, branchId, {
        path: '/',
        httpOnly: false,
        maxAge: 60 * 60 * 24 * 30, // 30 days
        sameSite: 'lax',
    });
    return { success: true };
}

export async function getSelectedBranchId(): Promise<string | null> {
    try {
        const cookieStore = await cookies();
        return cookieStore.get(BRANCH_COOKIE)?.value ?? null;
    } catch {
        return null;
    }
}
