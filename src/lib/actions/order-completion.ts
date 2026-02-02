import { Prisma } from '@prisma/client';

export async function completeOrderTransaction(
    tx: Prisma.TransactionClient,
    orderId: string
) {
    // 1. Fetch Order with necessary details
    const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
            items: {
                include: {
                    menuItem: {
                        include: {
                            recipe: {
                                include: {
                                    material: true
                                }
                            }
                        }
                    }
                }
            }
        }
    });

    if (!order) throw new Error(`Order ${orderId} not found`);
    if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
        // Already processed
        return;
    }

    // 2. Deduct Inventory (Raw Materials)
    for (const item of order.items) {
        // For each item in the order
        for (const recipeItem of item.menuItem.recipe) {
            // Deduct material for each recipe ingredient
            // Total deduction = recipe quantity * order item quantity
            const deductionAmount = recipeItem.quantity * item.quantity;

            await tx.rawMaterial.update({
                where: { id: recipeItem.materialId },
                data: {
                    currentStock: {
                        decrement: deductionAmount
                    }
                }
            });

            // Optional: Log inventory transaction
            await tx.inventoryTransaction.create({
                data: {
                    type: 'USAGE',
                    quantity: deductionAmount,
                    materialId: recipeItem.materialId,
                    notes: `Order #${order.orderNumber} usage`
                }
            });
        }
    }

    // 3. Create Bill (Revenue)
    await tx.bill.create({
        data: {
            orderId: order.id,
            amount: order.totalAmount, // Assuming totalAmount is final
            paymentMethod: 'CASH', // Default to CASH for now, or pass as arg
            paidAt: new Date()
        }
    });

    // 4. Update Order Status
    await tx.order.update({
        where: { id: order.id },
        data: { status: 'COMPLETED' }
    });
}
