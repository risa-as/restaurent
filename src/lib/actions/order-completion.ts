import { Prisma } from '@prisma/client';
import { consumeStock } from '@/lib/inventory-fifo';

/**
 * Deduct stock for a given order (recipe + modifier raw materials).
 * Call this inside a $transaction whenever an order is settled/completed.
 * Safe to call multiple times — skips if order is already COMPLETED/CANCELLED.
 */
export async function deductOrderStock(
    tx: Prisma.TransactionClient,
    orderId: string
) {
    const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
            items: {
                include: {
                    menuItem: {
                        include: {
                            recipe: {
                                include: { material: true }
                            }
                        }
                    },
                    modifiers: {
                        include: {
                            modifierOption: {
                                select: { rawMaterialId: true, rawMaterialQty: true }
                            }
                        }
                    }
                }
            }
        }
    });

    if (!order) throw new Error(`Order ${orderId} not found`);
    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') return;

    // 1. Validate stock availability BEFORE deducting
    const materialRequirements: Map<string, { name: string; required: number; available: number }> = new Map();

    for (const item of order.items) {
        for (const recipeItem of item.menuItem.recipe) {
            const needed = recipeItem.quantity * item.quantity;
            const existing = materialRequirements.get(recipeItem.materialId);
            if (existing) {
                existing.required += needed;
            } else {
                materialRequirements.set(recipeItem.materialId, {
                    name: recipeItem.material.name,
                    required: needed,
                    available: recipeItem.material.currentStock,
                });
            }
        }
        for (const mod of item.modifiers) {
            const { rawMaterialId, rawMaterialQty } = mod.modifierOption;
            if (!rawMaterialId || !rawMaterialQty) continue;
            const needed = rawMaterialQty * item.quantity;
            const existing = materialRequirements.get(rawMaterialId);
            if (existing) {
                existing.required += needed;
            } else {
                const material = await tx.rawMaterial.findUnique({
                    where: { id: rawMaterialId },
                    select: { name: true, currentStock: true }
                });
                if (material) {
                    materialRequirements.set(rawMaterialId, {
                        name: material.name,
                        required: needed,
                        available: material.currentStock,
                    });
                }
            }
        }
    }

    const insufficient = Array.from(materialRequirements.entries())
        .filter(([, m]) => m.required > m.available)
        .map(([, m]) => `${m.name}: مطلوب ${m.required} / متوفر ${m.available}`);

    if (insufficient.length > 0) {
        throw new Error(`مخزون غير كافٍ:\n${insufficient.join('\n')}`);
    }

    // 2. Deduct via FIFO + collect all inventory transactions
    const tenantId = order.tenantId ?? '';
    const branchId = order.branchId ?? null;
    const inventoryTxRecords: Prisma.InventoryTransactionCreateManyInput[] = [];

    for (const item of order.items) {
        for (const recipeItem of item.menuItem.recipe) {
            const deductionAmount = recipeItem.quantity * item.quantity;
            await consumeStock(tx, recipeItem.materialId, deductionAmount, tenantId, branchId);
            inventoryTxRecords.push({
                type: 'USAGE',
                quantity: deductionAmount,
                materialId: recipeItem.materialId,
                notes: `Order #${order.orderNumber} usage`
            });
        }

        for (const mod of item.modifiers) {
            const { rawMaterialId, rawMaterialQty } = mod.modifierOption;
            if (!rawMaterialId || !rawMaterialQty) continue;
            const deductionAmount = rawMaterialQty * item.quantity;
            await consumeStock(tx, rawMaterialId, deductionAmount, tenantId, branchId);
            inventoryTxRecords.push({
                type: 'USAGE',
                quantity: deductionAmount,
                materialId: rawMaterialId,
                notes: `Order #${order.orderNumber} modifier usage`
            });
        }
    }

    // Single batch insert for all inventory transactions
    if (inventoryTxRecords.length > 0) {
        await tx.inventoryTransaction.createMany({ data: inventoryTxRecords });
    }
}

/**
 * Full order completion: stock deduction + bill + status change.
 * Used by tables.ts and other non-cashier flows.
 */
export async function completeOrderTransaction(
    tx: Prisma.TransactionClient,
    orderId: string
) {
    const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { bills: { select: { id: true } } }
    });
    if (!order) throw new Error(`Order ${orderId} not found`);
    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') return;

    // Deduct stock
    await deductOrderStock(tx, orderId);

    // Create Bill if none exists
    if (order.bills.length === 0) {
        await tx.bill.create({
            data: {
                orderId: order.id,
                ...(order.tenantId ? { tenantId: order.tenantId } : {}),
                amount: order.totalAmount,
                paymentMethod: 'CASH',
                paidAt: new Date()
            }
        });
    }

    // Update status
    await tx.order.update({
        where: { id: order.id },
        data: { status: 'COMPLETED' }
    });
}

