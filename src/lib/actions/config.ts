'use server';

import { prisma } from '@/lib/prisma';
import { ServiceMode } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { verifyRole, getCurrentUser } from '@/lib/auth-guard';

/**
 * جلب إعدادات نظام الخدمة الخاص بالـ tenant الحالي
 * يقرأ من Tenant.serviceMode (يحدده السوبر أدمن)
 */
export async function getRestaurantConfig() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;

        if (tenantId) {
            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { id: true, serviceMode: true }
            });
            if (tenant) {
                return { id: tenant.id, serviceMode: tenant.serviceMode };
            }
        }

        // Fallback للـ RestaurantConfig القديم (للتوافقية)
        let config = await prisma.restaurantConfig.findFirst();
        if (!config) {
            config = await prisma.restaurantConfig.create({
                data: { serviceMode: 'TABLE_SERVICE' }
            });
        }
        return config;

    } catch (error) {
        console.error('Failed to get restaurant config:', error);
        return { id: 'fallback', serviceMode: 'TABLE_SERVICE' as ServiceMode };
    }
}

const ADMIN_ROLES = ['ADMIN', 'MANAGER', 'SUPER_ADMIN'];

/**
 * جلب نظام الخدمة الفعّال — يأخذ بعين الاعتبار الفرع المحدد (multi-branch)
 * - الموظفون: يستخدمون serviceMode الفرع المعيّن لهم (branchId من JWT)
 * - الأدمن: يستخدمون serviceMode الفرع المختار من الكوكي
 * - بدون multi-branch: يستخدمون serviceMode المطعم
 */
export async function getEffectiveServiceMode(): Promise<ServiceMode> {
    try {
        const { auth } = await import('@/lib/auth');
        const session = await auth();
        const tenantId = (session?.user as any)?.tenantId;
        const role = session?.user?.role as string;

        if (!tenantId) return 'TABLE_SERVICE' as ServiceMode;

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { serviceMode: true, multiBranchEnabled: true }
        });

        if (!tenant) return 'TABLE_SERVICE' as ServiceMode;

        if (tenant.multiBranchEnabled) {
            let selectedBranchId: string | null = null;

            if (!ADMIN_ROLES.includes(role)) {
                // Employees: use their assigned branch from JWT
                selectedBranchId = (session?.user as any)?.branchId ?? null;
            } else {
                // Admins/Managers: use the cookie-selected branch
                const { cookies } = await import('next/headers');
                const cookieStore = await cookies();
                selectedBranchId = cookieStore.get('selected_branch_id')?.value ?? null;
            }

            if (selectedBranchId) {
                const branch = await prisma.branch.findFirst({
                    where: { id: selectedBranchId, tenantId, isActive: true },
                    select: { serviceMode: true }
                });
                if (branch) return branch.serviceMode;
            }
        }

        return tenant.serviceMode;
    } catch {
        return 'TABLE_SERVICE' as ServiceMode;
    }
}

/**
 * تحديث نظام الخدمة للـ tenant الحالي (من صفحة الإعدادات)
 */
export async function updateServiceMode(mode: ServiceMode) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);

    try {
        if (tenantId) {
            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { multiBranchEnabled: true },
            });
            // Only cascade to branches when multi-branch is disabled (single-branch mode)
            // When multi-branch is enabled, each branch manages its own service mode independently
            if (tenant?.multiBranchEnabled) {
                await prisma.tenant.update({ where: { id: tenantId }, data: { serviceMode: mode } });
            } else {
                await prisma.$transaction([
                    prisma.tenant.update({ where: { id: tenantId }, data: { serviceMode: mode } }),
                    prisma.branch.updateMany({ where: { tenantId }, data: { serviceMode: mode } }),
                ]);
            }
        } else {
            // Fallback للـ RestaurantConfig القديم
            const config = await prisma.restaurantConfig.findFirst();
            if (config) {
                await prisma.restaurantConfig.update({
                    where: { id: config.id },
                    data: { serviceMode: mode }
                });
            } else {
                await prisma.restaurantConfig.create({
                    data: { serviceMode: mode }
                });
            }
        }

        revalidatePath('/', 'layout');
        return { success: true };
    } catch (error) {
        console.error('Failed to update service mode:', error);
        return { error: 'فشل تحديث نظام الخدمة' };
    }
}

/**
 * تحديث نظام الخدمة لأي مطعم — يستخدمه السوبر أدمن فقط
 */
export async function updateTenantServiceMode(tenantId: string, mode: ServiceMode) {
    await verifyRole(['SUPER_ADMIN']);
    try {
        await prisma.tenant.update({
            where: { id: tenantId },
            data: { serviceMode: mode }
        });
        revalidatePath('/superadmin/tenants');
        return { success: true };
    } catch (error) {
        console.error('Failed to update tenant service mode:', error);
        return { error: 'فشل تحديث نظام خدمة المطعم' };
    }
}
