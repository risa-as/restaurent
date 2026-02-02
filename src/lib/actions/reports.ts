'use server';
/* eslint-disable @typescript-eslint/no-unused-vars */

import { prisma } from '@/lib/prisma';
import { startOfDay, subDays, format, startOfMonth, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';

export async function getDashboardStats() {
    try {
        const today = startOfDay(new Date());

        const [revenueToday, activeOrders, lowStock, totalRevenue] = await Promise.all([
            prisma.bill.aggregate({
                _sum: { amount: true },
                where: { paidAt: { gte: today } }
            }),
            prisma.order.count({
                where: { status: { notIn: ['COMPLETED', 'CANCELLED', 'SERVED'] } }
            }),
            prisma.rawMaterial.count({
                where: { currentStock: { lte: 5 } } // Assuming 5 is a generic threshold, or use per-item if possible. 
                // schema: minStockLevel Float @default(5)
                // Need raw query or iterate? Prisma cant compare two columns easily in 'where' for all DBs?
                // actually prisma supports usage of field reference in where? No, not easily without rawQuery in simple findMany.
                // Let's just fetch all and filter or just count rigid threshold for MVP efficiency.
                // Or better:
            }),
            prisma.bill.aggregate({
                _sum: { amount: true }
            })
        ]);

        // Proper Low Stock Count
        // To be accurate we should compare currentStock <= minStockLevel.
        const allMaterials = await prisma.rawMaterial.findMany({
            select: { currentStock: true, minStockLevel: true }
        });
        const lowStockCount = allMaterials.filter(m => m.currentStock <= m.minStockLevel).length;

        return {
            revenueToday: revenueToday._sum.amount || 0,
            activeOrders,
            lowStockCount,
            totalRevenue: totalRevenue._sum.amount || 0
        };
    } catch (_error) {
        return { revenueToday: 0, activeOrders: 0, lowStockCount: 0, totalRevenue: 0 };
    }
}

export async function getSalesTrends(): Promise<{ date: string; revenue: number }[]> {
    try {
        // Last 30 days
        const startDate = subDays(new Date(), 30);

        const bills = await prisma.bill.findMany({
            where: { paidAt: { gte: startDate } },
            orderBy: { paidAt: 'asc' }
        });

        // Group by Date
        const grouped = bills.reduce((acc: Record<string, number>, bill: any) => {
            const dateStr = format(bill.paidAt, 'MM/dd', { locale: ar });
            acc[dateStr] = (acc[dateStr] || 0) + bill.amount;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(grouped).map(([date, revenue]) => ({
            date,
            revenue: revenue as number
        }));
    } catch (_error) {
        return [];
    }
}

export async function getTopSellingItems() {
    try {
        // Group OrderItems by MenuItemId
        // Prisma doesn't support 'groupBy' with relations perfectly for order counts in one go combined with details.
        // We can use groupBy on OrderItem
        const grouped = await prisma.orderItem.groupBy({
            by: ['menuItemId'],
            _sum: { quantity: true },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 5
        });

        // Hydrate names
        const items = await Promise.all(grouped.map(async (g) => {
            const menuItem = await prisma.menuItem.findUnique({
                where: { id: g.menuItemId },
                select: { name: true, image: true }
            });
            return {
                name: menuItem?.name || 'غير معروف',
                quantity: g._sum.quantity || 0,
                image: menuItem?.image
            };
        }));

        return items;
    } catch (error) {
        return [];
    }
}

export async function getEmployeePerformance() {
    try {
        // Count orders served by waiter
        // Note: Our schema has `waiterId` on Order.
        const grouped = await prisma.order.groupBy({
            by: ['waiterId'],
            _count: { id: true },
            _sum: { totalAmount: true },
            where: {
                status: 'COMPLETED',
                waiterId: { not: null }
            },
            orderBy: { _count: { id: 'desc' } },
            take: 5
        });

        const employees = await Promise.all(grouped.map(async (g) => {
            if (!g.waiterId) return null;
            const user = await prisma.user.findUnique({
                where: { id: g.waiterId },
                select: { name: true, role: true }
            });
            return {
                name: user?.name || 'غير معروف',
                role: user?.role,
                orders: g._count.id,
                revenue: g._sum.totalAmount || 0
            };
        }));

        return employees.filter(Boolean); // Remove nulls
    } catch (_error) {
        return [];
    }
}

export async function getInventoryStats() {
    try {
        const totalValue = await prisma.rawMaterial.aggregate({
            _sum: {
                // Assuming value = currentStock * costPerUnit. 
                // Aggregate doesn't support multiplication directly.
                // We need to fetch and calculate.
            }
        });

        const materials = await prisma.rawMaterial.findMany();
        const value = materials.reduce((acc, m) => acc + (m.currentStock * m.costPerUnit), 0);

        const lowStock = materials.filter(m => m.currentStock <= m.minStockLevel).length;

        return {
            totalInventoryValue: value,
            lowStockCount: lowStock,
            totalItems: materials.length
        };
    } catch (_error) {
        return { totalInventoryValue: 0, lowStockCount: 0, totalItems: 0 };
    }
}

export async function getLowStockItems() {
    try {
        const materials = await prisma.rawMaterial.findMany({
            where: {
                // Can't do field comparison in where easily. Fetch all and filter or use rawQuery.
                // For MVP, fetch all.
            }
        });
        return materials.filter(m => m.currentStock <= m.minStockLevel);
    } catch (_error) {
        return [];
    }
}

export async function getMostUsedItems() {
    try {
        // Based on recipe usage in completed orders?
        // Or just raw material transactions of type 'USAGE'?
        // Let's use transactions if available.
        const usage = await prisma.inventoryTransaction.groupBy({
            by: ['materialId'],
            _sum: { quantity: true },
            where: { type: 'USAGE' },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 5
        });

        const items = await Promise.all(usage.map(async (u) => {
            const material = await prisma.rawMaterial.findUnique({
                where: { id: u.materialId },
                select: { name: true, unit: true }
            });
            return {
                name: material?.name || 'غير معروف',
                quantity: u._sum.quantity || 0,
                unit: material?.unit || ''
            };
        }));

        return items;
    } catch (_error) {
        return [];
    }
}
