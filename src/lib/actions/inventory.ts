'use server';
/* eslint-disable @typescript-eslint/no-unused-vars */

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma'; // Ensure this points to your prisma instance
import { rawMaterialSchema, RawMaterialFormValues, transactionSchema, TransactionFormValues } from '@/lib/validations/inventory';
import { redirect } from 'next/navigation';

export async function getRawMaterials(query?: string) {
    try {
        const rawMaterials = await prisma.rawMaterial.findMany({
            where: {
                name: {
                    contains: query,
                    mode: 'insensitive',
                },
            },
            orderBy: {
                updatedAt: 'desc',
            },
        });
        return rawMaterials;
    } catch (error) {
        console.error('Failed to fetch raw materials:', error);
        throw new Error('Failed to fetch raw materials.');
    }
}

export async function createRawMaterial(data: RawMaterialFormValues) {
    const validatedFields = rawMaterialSchema.safeParse(data);

    if (!validatedFields.success) {
        return {
            error: 'Invalid fields',
        };
    }

    try {
        await prisma.rawMaterial.create({
            data: validatedFields.data,
        });
    } catch (error) {
        console.error('Failed to create raw material:', error);
        return {
            error: 'Failed to create raw material.',
        };
    }

    revalidatePath('/dashboard/inventory');
    return { success: true };
}

export async function updateRawMaterial(id: string, data: RawMaterialFormValues) {
    const validatedFields = rawMaterialSchema.safeParse(data);

    if (!validatedFields.success) {
        return {
            error: 'Invalid fields',
        };
    }

    try {
        await prisma.rawMaterial.update({
            where: { id },
            data: validatedFields.data,
        });
    } catch (error) {
        console.error('Failed to update raw material:', error);
        return {
            error: 'Failed to update raw material.',
        };
    }

    revalidatePath('/dashboard/inventory');
    return { success: true };
}

export async function deleteRawMaterial(id: string) {
    try {
        await prisma.rawMaterial.delete({
            where: { id },
        });
    } catch (error) {
        console.error('Failed to delete raw material:', error);
        return {
            error: 'Failed to delete raw material.',
        };
    }

    revalidatePath('/dashboard/inventory');
    return { success: true };
}

export async function createTransaction(data: TransactionFormValues) {
    const validatedFields = transactionSchema.safeParse(data);

    if (!validatedFields.success) {
        return { error: 'Invalid fields' };
    }

    const { materialId, type, quantity, cost, notes } = validatedFields.data;

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Create Transaction Record
            await tx.inventoryTransaction.create({
                data: {
                    materialId,
                    type,
                    quantity,
                    cost,
                    notes,
                },
            });

            // 2. Update Stock Level
            const material = await tx.rawMaterial.findUnique({ where: { id: materialId } });
            if (!material) throw new Error('Material not found');

            let newStock = material.currentStock;

            if (type === 'PURCHASE' || type === 'ADJUSTMENT') {
                newStock += quantity;
            } else if (type === 'USAGE' || type === 'WASTE') {
                newStock -= quantity;
            }

            await tx.rawMaterial.update({
                where: { id: materialId },
                data: { currentStock: newStock },
            });
        });
    } catch (error) {
        console.error('Failed to create transaction:', error);
        return { error: 'Failed to process transaction.' };
    }

    revalidatePath('/dashboard/inventory');
    revalidatePath('/dashboard/inventory/transactions');
    return { success: true };
}

export async function getTransactions() {
    try {
        const transactions = await prisma.inventoryTransaction.findMany({
            include: {
                material: true,
            },
            orderBy: {
                transactionDate: 'desc',
            },
        });
        return transactions;
    } catch (error) {
        console.error('Failed to fetch transactions:', error);
        throw new Error('Failed to fetch transactions');
    }
}
