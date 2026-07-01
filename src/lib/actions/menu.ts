'use server';
/* eslint-disable @typescript-eslint/no-unused-vars */

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { categorySchema, CategoryFormValues, menuItemSchema, MenuItemFormValues } from '@/lib/validations/menu';
import { verifyRole, getCurrentUser } from '@/lib/auth-guard';
import { checkPlanCount, checkPlanModule } from '@/lib/plan-limits';
import { requireTenantId } from '@/lib/utils/require-tenant';
import { getActiveBranchId, resolveCreateBranchId, getOperationalBranchWhere } from '@/lib/utils/branch-filter';
import { triggerPusher } from '@/lib/pusher';
import { getActiveSeasonalMenu } from '@/lib/actions/seasonal-menus';

// --- Categories ---

export async function getCategories() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];
        const branchId = await getActiveBranchId(tenantId);
        const branchWhere = await getOperationalBranchWhere(tenantId);
        const seasonalMenu = await getActiveSeasonalMenu(branchId);
        const seasonalCategoryIds = seasonalMenu
            ? new Set(seasonalMenu.categories.map((c: { categoryId: string }) => c.categoryId))
            : null;

        const allCategories = await prisma.category.findMany({
            where: { tenantId, ...branchWhere },
            orderBy: { name: 'asc' },
            include: {
                _count: { select: { items: { where: { isDeleted: false } } } }
            }
        });

        return seasonalCategoryIds
            ? allCategories.filter(c => seasonalCategoryIds.has(c.id))
            : allCategories;
    } catch (error) {
        console.error("Failed to fetch categories", error);
        return [];
    }
}

// Fetches all categories for the active branch without seasonal menu filtering.
// Use this in admin settings pages where all categories must be available for selection.
export async function getAdminCategories() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];
        const branchWhere = await getOperationalBranchWhere(tenantId);
        return prisma.category.findMany({
            where: { tenantId, ...branchWhere },
            orderBy: { name: 'asc' },
            include: {
                _count: { select: { items: { where: { isDeleted: false } } } }
            }
        });
    } catch (error) {
        console.error("Failed to fetch admin categories", error);
        return [];
    }
}


export async function createCategory(data: CategoryFormValues) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    requireTenantId(tenantId);
    const validated = categorySchema.safeParse(data);
    if (!validated.success) return { error: "Invalid fields" };

    try {
        await prisma.category.create({
            data: { ...validated.data, tenantId, branchId: await resolveCreateBranchId(tenantId, validated.data.branchId) }
        });
        revalidatePath('/dashboard/menu');
        await triggerPusher(`menu-${tenantId}`, 'menu-updated', {});
        return { success: true };
    } catch (error) {
        console.error("Failed to create category", error);
        return { error: "Failed to create category" };
    }
}

export async function updateCategory(id: string, data: CategoryFormValues) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    requireTenantId(tenantId);
    const validated = categorySchema.safeParse(data);
    if (!validated.success) return { error: "Invalid fields" };

    try {
        const existing = await prisma.category.findFirst({
            where: { id, tenantId }
        });
        if (!existing) return { error: "Category not found or access denied" };

        await prisma.category.update({
            where: { id },
            data: { ...validated.data, branchId: await resolveCreateBranchId(tenantId, validated.data.branchId) }
        });
        revalidatePath('/dashboard/menu');
        await triggerPusher(`menu-${tenantId}`, 'menu-updated', {});
        return { success: true };
    } catch (error) {
        console.error("Failed to update category", error);
        return { error: "Failed to update category" };
    }
}

export async function deleteCategory(id: string) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    requireTenantId(tenantId);
    try {
        const existing = await prisma.category.findFirst({
            where: { id, tenantId }
        });
        if (!existing) return { error: "Category not found or access denied" };

        const itemsCount = await prisma.menuItem.count({
            where: { categoryId: id }
        });

        if (itemsCount > 0) {
            return { error: "لا يمكن حذف القسم لأنه يحتوي على عناصر مرتبطة به" };
        }

        await prisma.category.delete({ where: { id } });
        revalidatePath('/dashboard/menu');
        await triggerPusher(`menu-${tenantId}`, 'menu-updated', {});
        return { success: true };
    } catch (error) {
        console.error("Failed to delete category", error);
        return { error: "Failed to delete category" };
    }
}

// --- Menu Items ---

export async function getMenuItems(query?: string) {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];
        const branchWhere = await getOperationalBranchWhere(tenantId);
        const items = await prisma.menuItem.findMany({
            where: {
                isDeleted: false,
                tenantId,
                ...branchWhere,
                ...(query ? { name: { contains: query, mode: 'insensitive' } } : {}),
            },
            include: {
                category: true,
                recipe: {
                    include: {
                        material: true
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });
        return items;
    } catch (error) {
        console.error("Failed to fetch menu items", error);
        throw new Error("Failed to fetch menu items");
    }
}

export async function createMenuItem(data: MenuItemFormValues) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    requireTenantId(tenantId);
    const validated = menuItemSchema.safeParse(data);
    if (!validated.success) return { error: "Invalid fields" };

    const { recipe, images, ...itemData } = validated.data;

    try {
        await checkPlanCount(tenantId, 'menuItem');

        await prisma.$transaction(async (tx) => {
            const menuItem = await tx.menuItem.create({
                data: {
                    ...itemData,
                    image: images[0] || null,
                    images,
                    tenantId,
                    branchId: await resolveCreateBranchId(tenantId, itemData.branchId),
                }
            });

            if (recipe && recipe.length > 0) {
                await tx.recipeItem.createMany({
                    data: recipe.map(r => ({
                        menuItemId: menuItem.id,
                        materialId: r.materialId,
                        quantity: r.quantity
                    }))
                });
            }
        });

        revalidatePath('/dashboard/menu');
        await triggerPusher(`menu-${tenantId}`, 'menu-updated', {});
        return { success: true };
    } catch (error: any) {
        if (error?.upgradeRequired) return { error: error.message, upgradeRequired: true };
        console.error("Failed to create menu item", error);
        return { error: "Failed to create menu item" };
    }
}

export async function updateMenuItem(id: string, data: MenuItemFormValues) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    requireTenantId(tenantId);
    const validated = menuItemSchema.safeParse(data);
    if (!validated.success) return { error: "Invalid fields" };

    const { recipe, images, ...itemData } = validated.data;

    try {
        const existing = await prisma.menuItem.findFirst({
            where: { id, tenantId }
        });
        if (!existing) return { error: "Menu item not found or access denied" };

        await prisma.$transaction(async (tx) => {
            await tx.menuItem.update({
                where: { id },
                data: {
                    ...itemData,
                    image: images[0] || null,
                    images,
                    branchId: await resolveCreateBranchId(tenantId, itemData.branchId),
                }
            });

            if (recipe) {
                await tx.recipeItem.deleteMany({
                    where: { menuItemId: id }
                });

                if (recipe.length > 0) {
                    await tx.recipeItem.createMany({
                        data: recipe.map(r => ({
                            menuItemId: id,
                            materialId: r.materialId,
                            quantity: r.quantity
                        }))
                    });
                }
            }
        });

        revalidatePath('/dashboard/menu');
        await triggerPusher(`menu-${tenantId}`, 'menu-updated', {});
        return { success: true };
    } catch (error) {
        console.error("Failed to update menu item", error);
        return { error: "Failed to update menu item" };
    }
}

export async function deleteMenuItem(id: string) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    requireTenantId(tenantId);
    try {
        const existing = await prisma.menuItem.findFirst({
            where: { id, tenantId }
        });
        if (!existing) return { error: "Menu item not found or access denied" };

        await prisma.menuItem.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date() }
        });
        revalidatePath('/dashboard/menu');
        await triggerPusher(`menu-${tenantId}`, 'menu-updated', {});
        return { success: true };
    } catch (error) {
        console.error("Failed to delete item", error);
        return { error: "Failed to delete item" };
    }
}

// --- Menu Analysis ---

export async function getMenuAnalysis() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];
        const branchId = await getActiveBranchId(tenantId);
        const branchWhere = branchId
            ? { branchId }
            : {};
        const items = await prisma.menuItem.findMany({
            where: { tenantId, isDeleted: false, ...branchWhere },
            include: {
                recipe: {
                    include: {
                        material: true
                    }
                },
                category: true
            }
        });

        const analysis = items.map(item => {
            const cost = item.recipe.reduce((acc, r) => acc + (r.quantity * r.material.costPerUnit), 0);
            const margin = item.price - cost;
            const marginPct = item.price > 0 ? (margin / item.price) * 100 : 0;
            return { ...item, cost, margin, marginPct };
        });

        return analysis.sort((a, b) => b.marginPct - a.marginPct);
    } catch (error) {
        console.error("Failed to get menu analysis", error);
        return [];
    }
}

// --- Offers ---

import { offerSchema, OfferFormValues } from '@/lib/validations/menu';

export async function getOffers() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];
        const branchId = await getActiveBranchId(tenantId);
        const branchWhere = branchId
            ? { branchId }
            : {};
        return await prisma.offer.findMany({
            where: { tenantId, ...branchWhere },
            include: { menuItems: true },
            orderBy: { endDate: 'desc' }
        });
    } catch (error) {
        console.error("Failed to fetch offers", error);
        return [];
    }
}

export async function createOffer(data: OfferFormValues) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    requireTenantId(tenantId);
    await checkPlanModule(tenantId, 'offers');
    const validated = offerSchema.safeParse(data);
    if (!validated.success) return { error: "Invalid fields" };

    try {
        await prisma.offer.create({
            data: {
                tenantId,
                name: data.name,
                discountPct: data.discountPct,
                startDate: data.startDate,
                endDate: data.endDate,
                isActive: data.isActive,
                branchId: await resolveCreateBranchId(tenantId, data.branchId),
                menuItems: {
                    connect: data.menuItemIds.map(id => ({ id }))
                }
            }
        });
        revalidatePath('/dashboard/menu/offers');
        return { success: true };
    } catch (error) {
        console.error("Failed to create offer", error);
        return { error: "Failed to create offer" };
    }
}

export async function toggleOfferStatus(id: string, isActive: boolean) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    requireTenantId(tenantId);
    try {
        const existing = await prisma.offer.findFirst({ where: { id, tenantId } });
        if (!existing) return { error: "Offer not found or access denied" };
        await prisma.offer.update({
            where: { id },
            data: { isActive }
        });
        revalidatePath('/dashboard/menu/offers');
        return { success: true };
    } catch (error) {
        return { error: "Failed to update offer" };
    }
}

export async function updateOffer(id: string, data: OfferFormValues) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    requireTenantId(tenantId);
    const validated = offerSchema.safeParse(data);
    if (!validated.success) return { error: "Invalid fields" };
    try {
        const existing = await prisma.offer.findFirst({ where: { id, tenantId } });
        if (!existing) return { error: "Offer not found or access denied" };
        await prisma.offer.update({
            where: { id },
            data: {
                name: data.name,
                discountPct: data.discountPct,
                startDate: data.startDate,
                endDate: data.endDate,
                isActive: data.isActive,
                branchId: await resolveCreateBranchId(tenantId, data.branchId),
                menuItems: {
                    set: data.menuItemIds.map(itemId => ({ id: itemId }))
                }
            }
        });
        revalidatePath('/dashboard/menu/offers');
        return { success: true };
    } catch (error) {
        console.error("Failed to update offer", error);
        return { error: "Failed to update offer" };
    }
}

export async function deleteOffer(id: string) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    requireTenantId(tenantId);
    try {
        const existing = await prisma.offer.findFirst({ where: { id, tenantId } });
        if (!existing) return { error: "Offer not found or access denied" };
        await prisma.offer.delete({ where: { id } });
        revalidatePath('/dashboard/menu/offers');
        return { success: true };
    } catch (error) {
        return { error: "Failed to delete offer" };
    }
}
