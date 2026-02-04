'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getCaptainMenu() {
    try {
        const categories = await prisma.category.findMany({
            include: {
                items: {
                    where: { isAvailable: true }
                }
            }
        });

        // Group by type (Eastern, Western, Beverage, Dessert)
        // Ideally we want specific Eastern vs Western tabs. 
        // We'll return the raw categories and let the UI filter.
        return categories;
    } catch (error) {
        console.error("Failed to fetch menu", error);
        return [];
    }
}

export async function getTables() {
    try {
        return await prisma.table.findMany({
            orderBy: { number: 'asc' }
        });
    } catch {
        return [];
    }
}

export async function createCaptainOrder(data: { tableId: string, items: { menuItemId: string, quantity: number, notes?: string }[] }) {
    try {
        await prisma.$transaction(async (tx) => {
            // Calculate total
            let totalAmount = 0;
            const orderItemsData = [];

            for (const item of data.items) {
                const menuItem = await tx.menuItem.findUnique({ where: { id: item.menuItemId } });
                if (!menuItem) throw new Error(`Item ${item.menuItemId} not found`);

                const lineTotal = menuItem.price * item.quantity;
                totalAmount += lineTotal;

                orderItemsData.push({
                    menuItemId: item.menuItemId,
                    quantity: item.quantity,
                    unitPrice: menuItem.price,
                    totalPrice: lineTotal,
                    notes: item.notes
                });
            }

            // Create Order
            await tx.order.create({
                data: {
                    tableId: data.tableId,
                    status: 'PENDING',
                    totalAmount,
                    items: { create: orderItemsData }
                }
            });

            // Update Table Status
            await tx.table.update({
                where: { id: data.tableId },
                data: { status: 'OCCUPIED' }
            });
        }, {
            timeout: 20000
        });

        revalidatePath('/dashboard/kitchen');
        revalidatePath('/dashboard/pos'); // Notify cashier
        revalidatePath('/dashboard/orders');
        return { success: true };
    } catch (error) {
        console.error("Failed to create captain order", error);
        return { error: "Failed to create order" };
    }
}

export async function updateTableStatus(tableId: string, status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'DIRTY') {
    try {
        await prisma.table.update({
            where: { id: tableId },
            data: { status }
        });
        revalidatePath('/captain/tables');
        revalidatePath('/dashboard/pos');
        return { success: true };
    } catch (error) {
        console.error("Failed to update status", error);
        return { error: "Failed to update status" };
    }
}

export async function getCaptainActiveOrders() {
    try {
        return await prisma.order.findMany({
            where: {
                status: {
                    in: ['PENDING', 'PREPARING', 'READY']
                },
                delivery: null // Exclude delivery orders from Captain view
            },
            include: {
                table: true,
                items: {
                    include: {
                        menuItem: {
                            select: {
                                id: true,
                                name: true
                                // Exclude image and other heavy fields
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    } catch (error) {
        console.error("Failed to fetch active orders", error);
        return [];
    }
}

export async function markOrderCompleted(id: string) {
    try {
        // Captain marks order as SERVED (handed to customer).
        // Cashier will then mark it as COMPLETED (Paid).
        await prisma.order.update({
            where: { id },
            data: { status: 'SERVED' }
        });

        revalidatePath('/captain/orders');
        revalidatePath('/captain/history');
        return { success: true };
    } catch (error) {
        console.error("Failed to complete order", error);
        return { error: "Failed to mark order as completed" };
    }
}

export async function getCaptainCompletedOrders() {
    try {
        // Fetch last 50 completed orders to avoid huge list
        return await prisma.order.findMany({
            where: { status: 'COMPLETED' },
            take: 50,
            include: {
                table: true,
                items: {
                    include: {
                        menuItem: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });
    } catch (error) {
        console.error("Failed to fetch history", error);
        return [];
    }
}
