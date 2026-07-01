'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { verifyRole } from '@/lib/auth-guard';
import { requireTenantId } from '@/lib/utils/require-tenant';

// ─── Modifier Groups ──────────────────────────────────────────────────────────

export async function getModifierGroups(tenantId: string) {
    return prisma.modifierGroup.findMany({
        where: { tenantId },
        include: { options: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { sortOrder: 'asc' },
    });
}

export async function createModifierGroup(data: {
    name: string;
    nameAr?: string;
    nameKu?: string;
    nameEn?: string;
    isRequired?: boolean;
    isVariant?: boolean;
    minSelect?: number;
    maxSelect?: number;
    sortOrder?: number;
    options?: { name: string; nameAr?: string; nameKu?: string; nameEn?: string; priceAdjustment?: number; isDefault?: boolean; sortOrder?: number; rawMaterialId?: string; rawMaterialQty?: number }[];
}) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    requireTenantId(tenantId);
    try {
        const group = await prisma.modifierGroup.create({
            data: {
                name: data.name,
                nameAr: data.nameAr,
                nameKu: data.nameKu,
                nameEn: data.nameEn,
                isRequired: data.isRequired ?? false,
                isVariant: data.isVariant ?? false,
                minSelect: data.minSelect ?? 0,
                maxSelect: data.maxSelect ?? 1,
                sortOrder: data.sortOrder ?? 0,
                tenantId,
                options: data.options
                    ? {
                        create: data.options.map((opt, i) => ({
                            name: opt.name,
                            nameAr: opt.nameAr,
                            nameKu: opt.nameKu,
                            nameEn: opt.nameEn,
                            priceAdjustment: opt.priceAdjustment ?? 0,
                            isDefault: opt.isDefault ?? false,
                            sortOrder: opt.sortOrder ?? i,
                            rawMaterialId: opt.rawMaterialId,
                            rawMaterialQty: opt.rawMaterialQty,
                        })),
                    }
                    : undefined,
            },
            include: { options: true },
        });
        revalidatePath('/dashboard/menu/modifiers');
        return { success: true, group };
    } catch (error) {
        console.error('createModifierGroup failed', error);
        return { error: 'Failed to create modifier group' };
    }
}

export async function updateModifierGroup(
    id: string,
    data: {
        name?: string;
        nameAr?: string;
        nameKu?: string;
        nameEn?: string;
        isRequired?: boolean;
        isVariant?: boolean;
        minSelect?: number;
        maxSelect?: number;
        sortOrder?: number;
    }
) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    requireTenantId(tenantId);
    try {
        const group = await prisma.modifierGroup.update({
            where: { id, tenantId },
            data,
        });
        revalidatePath('/dashboard/menu/modifiers');
        return { success: true, group };
    } catch (error) {
        console.error('updateModifierGroup failed', error);
        return { error: 'Failed to update modifier group' };
    }
}

export async function deleteModifierGroup(id: string) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    requireTenantId(tenantId);
    try {
        await prisma.modifierGroup.delete({ where: { id, tenantId } });
        revalidatePath('/dashboard/menu/modifiers');
        return { success: true };
    } catch (error) {
        console.error('deleteModifierGroup failed', error);
        return { error: 'Failed to delete modifier group' };
    }
}

// ─── Modifier Options ─────────────────────────────────────────────────────────

export async function createModifierOption(data: {
    groupId: string;
    name: string;
    nameAr?: string;
    nameKu?: string;
    nameEn?: string;
    priceAdjustment?: number;
    isDefault?: boolean;
    sortOrder?: number;
    rawMaterialId?: string;
    rawMaterialQty?: number;
}) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    requireTenantId(tenantId);
    try {
        // Verify group belongs to tenant
        const group = await prisma.modifierGroup.findFirst({ where: { id: data.groupId, tenantId } });
        if (!group) return { error: 'Group not found' };

        const option = await prisma.modifierOption.create({
            data: {
                name: data.name,
                nameAr: data.nameAr,
                nameKu: data.nameKu,
                nameEn: data.nameEn,
                priceAdjustment: data.priceAdjustment ?? 0,
                isDefault: data.isDefault ?? false,
                sortOrder: data.sortOrder ?? 0,
                groupId: data.groupId,
                rawMaterialId: data.rawMaterialId,
                rawMaterialQty: data.rawMaterialQty,
            },
        });
        revalidatePath('/dashboard/menu/modifiers');
        return { success: true, option };
    } catch (error) {
        console.error('createModifierOption failed', error);
        return { error: 'Failed to create modifier option' };
    }
}

export async function updateModifierOption(
    id: string,
    data: {
        name?: string;
        nameAr?: string;
        nameKu?: string;
        nameEn?: string;
        priceAdjustment?: number;
        isDefault?: boolean;
        sortOrder?: number;
        rawMaterialId?: string | null;
        rawMaterialQty?: number | null;
    }
) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    requireTenantId(tenantId);
    try {
        // Verify option belongs to this tenant via its group
        const existing = await prisma.modifierOption.findFirst({
            where: { id, group: { tenantId } },
        });
        if (!existing) return { error: 'Option not found or access denied' };

        const option = await prisma.modifierOption.update({ where: { id }, data });
        revalidatePath('/dashboard/menu/modifiers');
        return { success: true, option };
    } catch (error) {
        console.error('updateModifierOption failed', error);
        return { error: 'Failed to update modifier option' };
    }
}

export async function deleteModifierOption(id: string) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    requireTenantId(tenantId);
    try {
        // Verify option belongs to this tenant via its group
        const existing = await prisma.modifierOption.findFirst({
            where: { id, group: { tenantId } },
        });
        if (!existing) return { error: 'Option not found or access denied' };

        await prisma.modifierOption.delete({ where: { id } });
        revalidatePath('/dashboard/menu/modifiers');
        return { success: true };
    } catch (error) {
        console.error('deleteModifierOption failed', error);
        return { error: 'Failed to delete modifier option' };
    }
}

// ─── Item ↔ Group Assignment (T047) ──────────────────────────────────────────

export async function assignModifierGroupToItem(
    menuItemId: string,
    groupId: string,
    sortOrder = 0
) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    requireTenantId(tenantId);
    try {
        const [item, group] = await Promise.all([
            prisma.menuItem.findFirst({ where: { id: menuItemId, tenantId } }),
            prisma.modifierGroup.findFirst({ where: { id: groupId, tenantId } }),
        ]);
        if (!item || !group) return { error: 'Item or group not found' };

        await prisma.menuItemModifierGroup.upsert({
            where: { menuItemId_modifierGroupId: { menuItemId, modifierGroupId: groupId } },
            create: { menuItemId, modifierGroupId: groupId, sortOrder },
            update: { sortOrder },
        });
        revalidatePath('/dashboard/menu');
        return { success: true };
    } catch (error) {
        console.error('assignModifierGroupToItem failed', error);
        return { error: 'Failed to assign modifier group' };
    }
}

export async function removeModifierGroupFromItem(menuItemId: string, groupId: string) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    requireTenantId(tenantId);
    try {
        // Scope the delete to the caller's tenant via the menu item (the junction
        // row has no tenantId of its own) so a forged menuItemId/groupId from
        // another tenant can't detach their associations.
        await prisma.menuItemModifierGroup.deleteMany({
            where: { menuItemId, modifierGroupId: groupId, menuItem: { tenantId } },
        });
        revalidatePath('/dashboard/menu');
        return { success: true };
    } catch (error) {
        console.error('removeModifierGroupFromItem failed', error);
        return { error: 'Failed to remove modifier group' };
    }
}

// ─── Get Item Modifiers (T048) ────────────────────────────────────────────────

export async function getItemModifiers(menuItemId: string) {
    try {
        const links = await prisma.menuItemModifierGroup.findMany({
            where: { menuItemId },
            include: {
                modifierGroup: {
                    include: {
                        options: { orderBy: { sortOrder: 'asc' } },
                    },
                },
            },
            orderBy: { sortOrder: 'asc' },
        });
        return links.map((l) => ({ ...l.modifierGroup, sortOrder: l.sortOrder }));
    } catch (error) {
        console.error('getItemModifiers failed', error);
        return [];
    }
}

// ─── Combined fetch: all groups + attached groups for an item (fast, single round-trip) ──
export async function getModifierDataForItem(menuItemId: string, tenantId: string) {
    try {
        const [allGroups, links] = await Promise.all([
            prisma.modifierGroup.findMany({
                where: { tenantId },
                include: { options: { orderBy: { sortOrder: 'asc' } } },
                orderBy: { sortOrder: 'asc' },
            }),
            prisma.menuItemModifierGroup.findMany({
                where: { menuItemId },
                include: {
                    modifierGroup: {
                        include: { options: { orderBy: { sortOrder: 'asc' } } },
                    },
                },
                orderBy: { sortOrder: 'asc' },
            }),
        ]);
        const attachedGroups = links.map((l) => ({ ...l.modifierGroup, sortOrder: l.sortOrder }));
        return { allGroups, attachedGroups };
    } catch (error) {
        console.error('getModifierDataForItem failed', error);
        return { allGroups: [], attachedGroups: [] };
    }
}
