'use server';

import { prisma } from '@/lib/prisma';
import { verifyRole, getCurrentUser } from '@/lib/auth-guard';
import { revalidatePath } from 'next/cache';
import { getActiveBranchId, resolveCreateBranchId } from '@/lib/utils/branch-filter';

export async function getSeasonalMenus() {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    const branchId = await getActiveBranchId(tenantId);
    return prisma.seasonalMenu.findMany({
        where: { tenantId, ...(branchId ? { branchId } : {}) },
        include: {
            categories: { include: { category: true } },
            items: { include: { menuItem: { select: { id: true, name: true, nameAr: true, categoryId: true } } } },
            hours: true,
        },
        orderBy: { startDate: 'desc' },
    });
}

export async function createSeasonalMenu(data: {
    name: string;
    startDate: Date;
    endDate: Date;
    categoryIds: string[];
    menuItemIds?: string[];
    hours?: { dayOfWeek?: number | null; openTime: string; closeTime: string }[];
}): Promise<{ success: true; id: string } | { error: string }> {
    try {
        const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
        const branchId = await getActiveBranchId(tenantId);

        const menu = await prisma.seasonalMenu.create({
            data: {
                tenantId,
                branchId: await resolveCreateBranchId(tenantId, branchId),
                name: data.name,
                startDate: data.startDate,
                endDate: data.endDate,
                isActive: false,
                categories: {
                    create: data.categoryIds.map(categoryId => ({ categoryId })),
                },
                items: data.menuItemIds?.length
                    ? { create: data.menuItemIds.map(menuItemId => ({ menuItemId })) }
                    : undefined,
                hours: data.hours
                    ? { create: data.hours.map(h => ({ dayOfWeek: h.dayOfWeek ?? null, openTime: h.openTime, closeTime: h.closeTime })) }
                    : undefined,
            },
        });
        revalidatePath('/dashboard/settings/seasonal');
        return { success: true, id: menu.id };
    } catch (e) {
        console.error('createSeasonalMenu error:', e);
        return { error: 'حدث خطأ أثناء إنشاء القائمة الموسمية' };
    }
}

export async function updateSeasonalMenu(
    id: string,
    data: {
        name?: string;
        startDate?: Date;
        endDate?: Date;
        isActive?: boolean;
        categoryIds?: string[];
        menuItemIds?: string[];
    }
) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    const existing = await prisma.seasonalMenu.findFirst({ where: { id, tenantId } });
    if (!existing) return { error: 'Not found' };

    const { categoryIds, menuItemIds, ...rest } = data;

    await prisma.$transaction(async tx => {
        await tx.seasonalMenu.update({ where: { id }, data: rest });
        if (categoryIds !== undefined) {
            await tx.seasonalMenuCategory.deleteMany({ where: { seasonalMenuId: id } });
            if (categoryIds.length > 0) {
                await tx.seasonalMenuCategory.createMany({
                    data: categoryIds.map(categoryId => ({ seasonalMenuId: id, categoryId })),
                });
            }
        }
        if (menuItemIds !== undefined) {
            await tx.seasonalMenuItem.deleteMany({ where: { seasonalMenuId: id } });
            if (menuItemIds.length > 0) {
                await tx.seasonalMenuItem.createMany({
                    data: menuItemIds.map(menuItemId => ({ seasonalMenuId: id, menuItemId })),
                });
            }
        }
    });
    revalidatePath('/dashboard/settings/seasonal');
    return { success: true };
}

export async function deleteSeasonalMenu(id: string) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    const existing = await prisma.seasonalMenu.findFirst({ where: { id, tenantId } });
    if (!existing) return { error: 'Not found' };
    await prisma.seasonalMenu.delete({ where: { id } });
    revalidatePath('/dashboard/settings/seasonal');
    return { success: true };
}

export async function getActiveSeasonalMenu(branchId?: string | null) {
    const user = await getCurrentUser();
    const tenantId = user?.tenantId;
    if (!tenantId) return null;

    const now = new Date();
    return prisma.seasonalMenu.findFirst({
        where: {
            tenantId,
            ...(branchId ? { branchId } : {}),
            isActive: true,
            startDate: { lte: now },
            endDate: { gte: now },
        },
        include: {
            categories: { select: { categoryId: true } },
            items: { select: { menuItemId: true } },
            hours: true,
        },
    });
}
