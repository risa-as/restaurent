'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { RawMaterial, TransactionType } from '@prisma/client';
import { verifyRole, getCurrentUser } from '@/lib/auth-guard';
import { requireTenantId } from '@/lib/utils/require-tenant';
import { getActiveBranchId, resolveCreateBranchId, getOperationalBranchWhere } from '@/lib/utils/branch-filter';
import { withAudit } from '@/lib/audit';

// --- Raw Materials (Stock) ---

export async function getRawMaterials() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];
        const branchId = await getActiveBranchId(tenantId);
        const branchWhere = branchId ? { branchId } : {};
        return await prisma.rawMaterial.findMany({
            where: { tenantId, isDeleted: false, ...branchWhere },
            orderBy: { name: 'asc' }
        });
    } catch {
        return [];
    }
}

export async function createRawMaterial(data: { name: string; unit: string; minStockLevel: number; costPerUnit: number; currentStock: number; branchId?: string | null }) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'STORE_MANAGER']);
    requireTenantId(tenantId);
    try {
        const { branchId, ...rest } = data;
        await prisma.rawMaterial.create({
            data: { ...rest, tenantId, branchId: await resolveCreateBranchId(tenantId, branchId) }
        });
        revalidatePath('/inventory/stock');
        return { success: true };
    } catch {
        return { error: 'Failed to create material' };
    }
}

export async function updateRawMaterial(id: string, data: Partial<RawMaterial>) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'STORE_MANAGER']);
    requireTenantId(tenantId);
    try {
        const existing = await prisma.rawMaterial.findFirst({ where: { id, tenantId } });
        if (!existing) return { error: 'Material not found or access denied' };

        await prisma.rawMaterial.update({ where: { id }, data });
        revalidatePath('/inventory/stock');
        return { success: true };
    } catch {
        return { error: 'Failed to update material' };
    }
}

export async function deleteRawMaterial(id: string) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'STORE_MANAGER']);
    requireTenantId(tenantId);
    try {
        const existing = await prisma.rawMaterial.findFirst({ where: { id, tenantId } });
        if (!existing) return { error: 'Material not found or access denied' };

        await prisma.rawMaterial.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date() }
        });
        revalidatePath('/inventory/stock');
        return { success: true };
    } catch {
        return { error: 'Failed to delete material' };
    }
}

// --- Transactions ---

export async function createTransaction(data: {
    materialId: string;
    type: TransactionType;
    quantity: number;
    cost?: number;
    notes?: string;
}) {
    const { userId, tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'STORE_MANAGER']);
    requireTenantId(tenantId);
    try {
        const material = await prisma.rawMaterial.findFirst({ where: { id: data.materialId, tenantId } });
        if (!material) return { error: 'Material not found or access denied' };

        const doTransaction = async () => {
            await prisma.inventoryTransaction.create({
                data: {
                    materialId: data.materialId,
                    type: data.type,
                    quantity: data.quantity,
                    cost: data.cost,
                    notes: data.notes
                }
            });

            let stockChange = 0;
            if (data.type === 'PURCHASE') stockChange = data.quantity;
            else if (data.type === 'USAGE' || data.type === 'WASTE') stockChange = -data.quantity;
            else if (data.type === 'ADJUSTMENT') stockChange = data.quantity;

            if (stockChange !== 0) {
                await prisma.rawMaterial.update({
                    where: { id: data.materialId },
                    data: { currentStock: { increment: stockChange } }
                });
            }
        };

        // Audit WASTE and ADJUSTMENT transactions
        if (data.type === 'WASTE' || data.type === 'ADJUSTMENT') {
            await withAudit(
                { tenantId, userId },
                `INVENTORY_${data.type}`,
                'RawMaterial',
                data.materialId,
                doTransaction,
                () => prisma.rawMaterial.findUnique({ where: { id: data.materialId } })
            );
        } else {
            await doTransaction();
        }

        revalidatePath('/inventory/stock');
        return { success: true };
    } catch (error) {
        console.error("Transaction Error:", error);
        return { error: 'Failed to create transaction' };
    }
}

// --- Recipes ---

export async function getRecipes() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];
        const branchWhere = await getOperationalBranchWhere(tenantId);
        return await prisma.menuItem.findMany({
            where: { tenantId, ...branchWhere },
            include: { recipe: { include: { material: true } }, category: true },
            orderBy: { name: 'asc' }
        });
    } catch {
        return [];
    }
}

export async function addRecipeItem(menuItemId: string, materialId: string, quantity: number) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'STORE_MANAGER']);
    requireTenantId(tenantId);
    try {
        const menuItem = await prisma.menuItem.findFirst({ where: { id: menuItemId, tenantId } });
        if (!menuItem) return { error: 'Menu item not found or access denied' };

        await prisma.recipeItem.create({ data: { menuItemId, materialId, quantity } });
        revalidatePath('/kitchen/recipes');
        return { success: true };
    } catch {
        return { error: 'Failed to add recipe item' };
    }
}

export async function removeRecipeItem(id: string) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'STORE_MANAGER']);
    requireTenantId(tenantId);
    try {
        // Verify recipe item belongs to this tenant via its menu item
        const existing = await prisma.recipeItem.findFirst({
            where: { id, menuItem: { tenantId } },
        });
        if (!existing) return { error: 'Recipe item not found or access denied' };

        await prisma.recipeItem.delete({ where: { id } });
        revalidatePath('/kitchen/recipes');
        return { success: true };
    } catch {
        return { error: 'Failed to remove recipe item' };
    }
}
