'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { TransactionType } from '@prisma/client';

// --- Raw Materials (Stock) ---

export async function getRawMaterials() {
    try {
        return await prisma.rawMaterial.findMany({
            orderBy: { name: 'asc' }
        });
    } catch (error) {
        return [];
    }
}

export async function createRawMaterial(data: { name: string; unit: string; minStockLevel: number; costPerUnit: number; currentStock: number }) {
    try {
        await prisma.rawMaterial.create({
            data: {
                name: data.name,
                unit: data.unit,
                minStockLevel: data.minStockLevel,
                costPerUnit: data.costPerUnit,
                currentStock: data.currentStock
            }
        });
        revalidatePath('/inventory/stock');
        return { success: true };
    } catch (error) {
        return { error: 'Failed to create material' };
    }
}

export async function updateRawMaterial(id: string, data: any) {
    try {
        await prisma.rawMaterial.update({
            where: { id },
            data
        });
        revalidatePath('/inventory/stock');
        return { success: true };
    } catch (error) {
        return { error: 'Failed to update material' };
    }
}

export async function deleteRawMaterial(id: string) {
    try {
        await prisma.rawMaterial.delete({ where: { id } });
        revalidatePath('/inventory/stock');
        return { success: true };
    } catch (error) {
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
    try {
        // 1. Create Transaction
        await prisma.inventoryTransaction.create({
            data: {
                materialId: data.materialId,
                type: data.type,
                quantity: data.quantity,
                cost: data.cost,
                notes: data.notes
            }
        });

        // 2. Update Stock
        let stockChange = 0;
        if (data.type === 'PURCHASE') {
            stockChange = data.quantity;
        } else if (data.type === 'USAGE' || data.type === 'WASTE') {
            stockChange = -data.quantity;
        } else if (data.type === 'ADJUSTMENT') {
            // Treat as additive adjustment
            stockChange = data.quantity;
        }

        if (stockChange !== 0) {
            await prisma.rawMaterial.update({
                where: { id: data.materialId },
                data: {
                    currentStock: { increment: stockChange }
                }
            });
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
        return await prisma.menuItem.findMany({
            include: {
                recipe: {
                    include: { material: true }
                },
                category: true
            },
            orderBy: { name: 'asc' }
        });
    } catch (error) {
        return [];
    }
}

export async function addRecipeItem(menuItemId: string, materialId: string, quantity: number) {
    try {
        await prisma.recipeItem.create({
            data: {
                menuItemId,
                materialId,
                quantity
            }
        });
        revalidatePath('/kitchen/recipes');
        return { success: true };
    } catch (error) {
        return { error: 'Failed to add recipe item' };
    }
}

export async function removeRecipeItem(id: string) {
    try {
        await prisma.recipeItem.delete({ where: { id } });
        revalidatePath('/kitchen/recipes');
        return { success: true };
    } catch (error) {
        return { error: 'Failed to remove recipe item' };
    }
}
