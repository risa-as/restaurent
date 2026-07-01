'use server';
/* eslint-disable @typescript-eslint/no-unused-vars */

import { prisma } from '@/lib/prisma';
import { subDays, format, startOfMonth, endOfMonth } from 'date-fns';
import { ar } from 'date-fns/locale';
import { getCurrentUser, verifyRole } from '@/lib/auth-guard';
import { startOfDay } from 'date-fns';
import { getActiveBranchId, getShiftBranchWhere } from '@/lib/utils/branch-filter';

export async function getDashboardStats() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return {
            revenueToday: 0, activeOrders: 0, lowStockCount: 0, totalRevenue: 0,
            tableStats: { available: 0, occupied: 0, reserved: 0, dirty: 0, total: 0 },
            deliveryStats: { pending: 0, assigned: 0, onTheWay: 0, pickedUp: 0 },
        };

        const today = startOfDay(new Date());
        const branchId = await getActiveBranchId(tenantId);
        const orderBranchWhere = branchId ? { branchId } : {};
        const tableBranchWhere = branchId ? { branchId } : {};
        // Bill doesn't have branchId directly — filter via its order relation
        const billBranchWhere = branchId ? { order: { branchId } } : {};

        const [revenueToday, activeOrders, totalRevenue, tableGroups, deliveryGroups, allMaterials] = await Promise.all([
            prisma.bill.aggregate({
                _sum: { amount: true },
                where: { tenantId, paidAt: { gte: today }, ...billBranchWhere }
            }),
            prisma.order.count({
                where: { tenantId, status: { notIn: ['COMPLETED', 'CANCELLED', 'SERVED'] }, ...orderBranchWhere }
            }),
            prisma.bill.aggregate({
                _sum: { amount: true },
                where: { tenantId, ...billBranchWhere }
            }),
            prisma.table.groupBy({
                by: ['status'],
                _count: { id: true },
                where: { tenantId, ...tableBranchWhere }
            }),
            prisma.delivery.groupBy({
                by: ['status'],
                _count: { id: true },
                where: {
                    status: { notIn: ['DELIVERED', 'CANCELLED', 'RETURNED'] },
                    order: { tenantId, ...orderBranchWhere }
                }
            }),
            prisma.rawMaterial.findMany({
                where: { tenantId, isDeleted: false },
                select: { currentStock: true, minStockLevel: true }
            }),
        ]);

        const lowStockCount = allMaterials.filter(m => m.currentStock <= m.minStockLevel).length;

        const tableStats = {
            available: tableGroups.find(g => g.status === 'AVAILABLE')?._count.id ?? 0,
            occupied: tableGroups.find(g => g.status === 'OCCUPIED')?._count.id ?? 0,
            reserved: tableGroups.find(g => g.status === 'RESERVED')?._count.id ?? 0,
            dirty: tableGroups.find(g => g.status === 'DIRTY')?._count.id ?? 0,
            total: tableGroups.reduce((s, g) => s + g._count.id, 0),
        };

        const deliveryStats = {
            pending: deliveryGroups.find(g => g.status === 'PENDING')?._count.id ?? 0,
            assigned: deliveryGroups.find(g => g.status === 'ASSIGNED')?._count.id ?? 0,
            onTheWay: deliveryGroups.find(g => g.status === 'ON_THE_WAY')?._count.id ?? 0,
        };

        return {
            revenueToday: revenueToday._sum.amount || 0,
            activeOrders,
            lowStockCount,
            totalRevenue: totalRevenue._sum.amount || 0,
            tableStats,
            deliveryStats,
        };
    } catch (_error) {
        return {
            revenueToday: 0, activeOrders: 0, lowStockCount: 0, totalRevenue: 0,
            tableStats: { available: 0, occupied: 0, reserved: 0, dirty: 0, total: 0 },
            deliveryStats: { pending: 0, assigned: 0, onTheWay: 0, pickedUp: 0 },
        };
    }
}

export async function getSalesTrends(): Promise<{ date: string; revenue: number }[]> {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];

        const branchId = await getActiveBranchId(tenantId);
        const billBranchWhere = branchId ? { order: { branchId } } : {};

        const startDate = subDays(new Date(), 30);
        const bills = await prisma.bill.findMany({
            where: { tenantId, paidAt: { gte: startDate }, ...billBranchWhere },
            orderBy: { paidAt: 'asc' }
        });

        const grouped = bills.reduce((acc: Record<string, number>, bill) => {
            const dateStr = format(bill.paidAt, 'MM/dd', { locale: ar });
            acc[dateStr] = (acc[dateStr] || 0) + bill.amount;
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(grouped).map(([date, revenue]) => ({ date, revenue: revenue as number }));
    } catch (_error) {
        return [];
    }
}

export async function getTopSellingItems() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];

        const branchId = await getActiveBranchId(tenantId);
        const orderBranchWhere = branchId ? { branchId } : {};

        const grouped = await prisma.orderItem.groupBy({
            by: ['menuItemId'],
            _sum: { quantity: true },
            where: { order: { tenantId, ...orderBranchWhere } },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 5
        });

        const menuItemIds = grouped.map(g => g.menuItemId);
        const menuItems = await prisma.menuItem.findMany({
            where: { id: { in: menuItemIds } },
            select: { id: true, name: true, image: true }
        });
        const itemMap = Object.fromEntries(menuItems.map(m => [m.id, m]));

        return grouped.map(g => ({
            name: itemMap[g.menuItemId]?.name || 'غير معروف',
            quantity: g._sum.quantity || 0,
            image: itemMap[g.menuItemId]?.image,
        }));
    } catch {
        return [];
    }
}

export async function getEmployeePerformance() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];

        const branchId = await getActiveBranchId(tenantId);
        const orderBranchWhere = branchId ? { branchId } : {};

        const grouped = await prisma.order.groupBy({
            by: ['waiterId'],
            _count: { id: true },
            _sum: { totalAmount: true },
            where: { tenantId, status: 'COMPLETED', waiterId: { not: null }, ...orderBranchWhere },
            orderBy: { _count: { id: 'desc' } },
            take: 5
        });

        const waiterIds = grouped.map(g => g.waiterId).filter(Boolean) as string[];
        const users = await prisma.user.findMany({
            where: { id: { in: waiterIds } },
            select: { id: true, name: true, role: true }
        });
        const userMap = Object.fromEntries(users.map(u => [u.id, u]));

        return grouped
            .filter(g => g.waiterId)
            .map(g => ({
                name: userMap[g.waiterId!]?.name || 'غير معروف',
                role: userMap[g.waiterId!]?.role,
                orders: g._count.id,
                revenue: g._sum.totalAmount || 0
            }));
    } catch (_error) {
        return [];
    }
}

export async function getInventoryStats() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return { totalInventoryValue: 0, lowStockCount: 0, totalItems: 0 };

        const materials = await prisma.rawMaterial.findMany({ where: { tenantId } });
        const value = materials.reduce((acc, m) => acc + (m.currentStock * m.costPerUnit), 0);
        const lowStock = materials.filter(m => m.currentStock <= m.minStockLevel).length;
        return { totalInventoryValue: value, lowStockCount: lowStock, totalItems: materials.length };
    } catch (_error) {
        return { totalInventoryValue: 0, lowStockCount: 0, totalItems: 0 };
    }
}

export async function getLowStockItems() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];
        const materials = await prisma.rawMaterial.findMany({ where: { tenantId } });
        return materials.filter(m => m.currentStock <= m.minStockLevel);
    } catch (_error) {
        return [];
    }
}

// ── P&L Monthly Report ────────────────────────────────────────────────────────
export async function getPLReport(year: number, month: number) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'ACCOUNTANT']);
    if (!tenantId) throw new Error('Unauthorized');

    const start = startOfMonth(new Date(year, month - 1));
    const end = endOfMonth(start);
    const branchId = await getActiveBranchId(tenantId);
    const billBranchWhere = branchId ? { order: { branchId } } : {};
    const expenseBranchWhere = branchId ? { branchId } : {};

    const [bills, expenses, settings, tenant] = await Promise.all([
        prisma.bill.findMany({
            where: { tenantId, paidAt: { gte: start, lte: end }, ...billBranchWhere },
            include: {
                order: {
                    include: {
                        items: {
                            include: {
                                menuItem: { include: { category: true, recipe: { include: { material: true } } } },
                            },
                        },
                    },
                },
            },
        }),
        prisma.expense.findMany({
            where: { tenantId, date: { gte: start, lte: end }, ...expenseBranchWhere },
            orderBy: { category: 'asc' },
        }),
        prisma.systemSetting.findFirst(),
        prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    ]);

    const revenue = bills.reduce((s, b) => s + b.amount, 0);
    const cashRevenue = bills.filter(b => b.paymentMethod === 'CASH').reduce((s, b) => s + b.amount, 0);
    const cardRevenue = bills.filter(b => b.paymentMethod === 'CARD').reduce((s, b) => s + b.amount, 0);

    const seenOrderIds = new Set<string>();
    let cogs = 0;
    for (const bill of bills) {
        if (seenOrderIds.has(bill.orderId)) continue;
        seenOrderIds.add(bill.orderId);
        for (const item of (bill.order as any).items) {
            let cost = item.cost ?? 0;
            if (cost === 0 && item.menuItem?.recipe?.length > 0) {
                cost = item.menuItem.recipe.reduce((acc: number, r: any) =>
                    acc + (r.quantity * (r.material?.costPerUnit ?? 0)), 0) * item.quantity;
            }
            cogs += cost;
        }
    }

    const grossProfit = revenue - cogs;
    const expByCat: Record<string, number> = {};
    for (const exp of expenses) expByCat[exp.category] = (expByCat[exp.category] || 0) + exp.amount;
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const taxRate = settings?.taxRate ?? 0;
    const taxAmount = taxRate > 0 ? Math.round(revenue * (taxRate / 100)) : 0;

    return {
        restaurantName: tenant?.name ?? 'المطعم',
        period: { year, month, label: format(start, 'MMMM yyyy') },
        revenue, cashRevenue, cardRevenue,
        cogs, grossProfit,
        grossMarginPct: revenue > 0 ? Math.round((grossProfit / revenue) * 100) : 0,
        expensesByCategory: Object.entries(expByCat).map(([category, amount]) => ({ category, amount })),
        totalExpenses, taxRate, taxAmount,
        netProfit: grossProfit - totalExpenses,
        transactionCount: seenOrderIds.size,
    };
}
export type PLReport = Awaited<ReturnType<typeof getPLReport>>;

// ── Shift Discrepancy Detection ───────────────────────────────────────────────
export async function getShiftDiscrepancies(from: Date, to: Date) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'ACCOUNTANT']);
    if (!tenantId) throw new Error('Unauthorized');

    const branchWhere = await getShiftBranchWhere(tenantId);

    const shifts = await prisma.cashierShift.findMany({
        where: { tenantId, ...branchWhere, openedAt: { gte: from, lte: to } },
        include: {
            cashier: { select: { name: true, email: true } },
            bills: { select: { amount: true, paymentMethod: true } },
        },
        orderBy: { openedAt: 'desc' },
    });

    return shifts.map(shift => {
        const actualTotal = shift.bills.reduce((s, b) => s + b.amount, 0);
        const actualCash = shift.bills.filter(b => b.paymentMethod === 'CASH').reduce((s, b) => s + b.amount, 0);
        const actualCard = shift.bills.filter(b => b.paymentMethod === 'CARD').reduce((s, b) => s + b.amount, 0);
        const salesDiscrepancy = Math.round((actualTotal - shift.totalSales) * 100) / 100;
        const cashDiscrepancy = Math.round((actualCash - shift.totalCash) * 100) / 100;
        return {
            id: shift.id, openedAt: shift.openedAt, closedAt: shift.closedAt,
            cashierName: shift.cashier.name ?? shift.cashier.email,
            recordedTotal: shift.totalSales, recordedCash: shift.totalCash, recordedCard: shift.totalCard,
            actualTotal, actualCash, actualCard,
            salesDiscrepancy, cashDiscrepancy,
            physicalVariance: shift.cashVariance ?? null,
            openingCash: shift.openingCash,
            expectedCash: shift.expectedCash,
            closingCashEntered: shift.closingCashEntered,
            hasSystemDiscrepancy: Math.abs(salesDiscrepancy) > 0.01 || Math.abs(cashDiscrepancy) > 0.01,
            hasPhysicalDiscrepancy: shift.cashVariance !== null && Math.abs(shift.cashVariance) > 0.01,
        };
    });
}
export type ShiftDiscrepancy = Awaited<ReturnType<typeof getShiftDiscrepancies>>[number];

// ── Monthly Tax Report ────────────────────────────────────────────────────────
export async function getTaxReport(from: Date, to: Date) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'ACCOUNTANT']);
    if (!tenantId) throw new Error('Unauthorized');

    const [settings, branchId, tenant] = await Promise.all([
        prisma.systemSetting.findFirst(),
        getActiveBranchId(tenantId),
        prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    ]);

    const taxRate = settings?.taxRate ?? 0;
    const billBranchWhere = branchId ? { order: { branchId } } : {};
    const bills = await prisma.bill.findMany({
        where: { tenantId, paidAt: { gte: from, lte: to }, ...billBranchWhere },
        select: { amount: true, paidAt: true, paymentMethod: true },
    });

    const monthlyMap: Record<string, { revenue: number; cash: number; card: number; count: number }> = {};
    for (const bill of bills) {
        const key = format(bill.paidAt, 'yyyy-MM');
        if (!monthlyMap[key]) monthlyMap[key] = { revenue: 0, cash: 0, card: 0, count: 0 };
        monthlyMap[key].revenue += bill.amount;
        monthlyMap[key].count += 1;
        if (bill.paymentMethod === 'CASH') monthlyMap[key].cash += bill.amount;
        if (bill.paymentMethod === 'CARD') monthlyMap[key].card += bill.amount;
    }

    const rows = Object.entries(monthlyMap).map(([month, data]) => ({
        month, label: format(new Date(month + '-01'), 'MMMM yyyy'),
        revenue: Math.round(data.revenue), cash: Math.round(data.cash), card: Math.round(data.card),
        transactionCount: data.count,
        taxAmount: taxRate > 0 ? Math.round(data.revenue * (taxRate / 100)) : 0,
        netAfterTax: Math.round(data.revenue - (taxRate > 0 ? data.revenue * (taxRate / 100) : 0)),
    })).sort((a, b) => a.month.localeCompare(b.month));

    return {
        restaurantName: tenant?.name ?? 'المطعم',
        taxRate, rows, from, to,
        totals: {
            revenue: rows.reduce((s, r) => s + r.revenue, 0),
            taxAmount: rows.reduce((s, r) => s + r.taxAmount, 0),
            transactionCount: rows.reduce((s, r) => s + r.transactionCount, 0),
        },
    };
}
export type TaxReport = Awaited<ReturnType<typeof getTaxReport>>;

export async function getMostUsedItems() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];

        const usage = await prisma.inventoryTransaction.groupBy({
            by: ['materialId'],
            _sum: { quantity: true },
            where: { type: 'USAGE', material: { tenantId } },
            orderBy: { _sum: { quantity: 'desc' } },
            take: 5
        });

        const materialIds = usage.map(u => u.materialId);
        const materials = await prisma.rawMaterial.findMany({
            where: { id: { in: materialIds } },
            select: { id: true, name: true, unit: true }
        });
        const matMap = Object.fromEntries(materials.map(m => [m.id, m]));

        return usage.map(u => ({
            name: matMap[u.materialId]?.name || 'غير معروف',
            quantity: u._sum.quantity || 0,
            unit: matMap[u.materialId]?.unit || ''
        }));
    } catch (_error) {
        return [];
    }
}
