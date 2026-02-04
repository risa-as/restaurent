'use server';
/* eslint-disable @typescript-eslint/no-unused-vars */

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { TableStatus } from '@prisma/client';
import { tableSchema, TableFormValues } from '@/lib/validations/tables';
import { completeOrderTransaction } from './order-completion';


import { unstable_noStore as noStore } from 'next/cache';

export async function getTables() {
    noStore();
    try {
        return await prisma.table.findMany({
            orderBy: { number: 'asc' },
            include: {
                orders: {
                    where: {
                        status: { notIn: ['COMPLETED', 'CANCELLED'] }
                    },
                    include: {
                        items: {
                            include: {
                                menuItem: true
                            }
                        }
                    },
                    take: 1 // Assuming one active order per table for now
                }
            }
        });
    } catch (error) {
        console.error("Failed to fetch tables", error);
        return [];
    }
}

export async function createTable(data: TableFormValues) {
    const validated = tableSchema.safeParse(data);
    if (!validated.success) return { error: "بيانات غير صالحة" };

    try {
        await prisma.table.create({
            data: validated.data
        });
        revalidatePath('/dashboard/tables');
        return { success: true };
    } catch (error) {
        // Check for unique constraint violation on 'number'
        return { error: "فشل إنشاء الطاولة. ربما الرقم مكرر." };
    }
}

export async function updateTablePosition(id: string, x: number, y: number) {
    try {
        await prisma.table.update({
            where: { id },
            data: { x, y }
        });
        revalidatePath('/dashboard/tables');
        return { success: true };
    } catch (_error) {
        return { error: "فشل نقل الطاولة" };
    }
}

export async function updateTableStatus(id: string, status: TableStatus) {
    try {
        await prisma.$transaction(async (tx) => {
            // Update table status
            await tx.table.update({
                where: { id },
                data: { status }
            });

            // If table is being cleaned or made available, complete pending orders
            if (status === 'DIRTY' || status === 'AVAILABLE') {
                const activeOrders = await tx.order.findMany({
                    where: {
                        tableId: id,
                        status: { notIn: ['COMPLETED', 'CANCELLED'] }
                    },
                    select: { id: true }
                });

                for (const order of activeOrders) {
                    await completeOrderTransaction(tx, order.id);
                }
            }
        }, {
            timeout: 15000
        });

        revalidatePath('/dashboard/tables');
        revalidatePath('/dashboard/pos');
        return { success: true };
    } catch (error) {
        console.error("Failed to update table status:", error);
        return { error: "فشل تحديث الحالة" };
    }
}

export async function updateTableCapacity(id: string, capacity: number) {
    try {
        await prisma.table.update({
            where: { id },
            data: { capacity }
        });
        revalidatePath('/dashboard/tables');
        return { success: true };
    } catch (_error) {
        return { error: "فشل تحديث السعة" };
    }
}

export async function deleteTable(id: string) {
    try {
        await prisma.table.delete({ where: { id } });
        revalidatePath('/dashboard/tables');
        return { success: true };
    } catch (_error) {
        return { error: "فشل حذف الطاولة" };
    }
}
