'use server';

import { prisma } from '@/lib/prisma';
import { unstable_noStore as noStore, revalidatePath } from 'next/cache';
import { Expense } from '@prisma/client';
import { verifyRole, getCurrentUser } from '@/lib/auth-guard';
import { withAudit } from '@/lib/audit';
import { requireTenantId } from '@/lib/utils/require-tenant';
import { getActiveBranchId, resolveCreateBranchId } from '@/lib/utils/branch-filter';

export interface FinancialStats {
    revenue: number;
    transactionCount: number;
    cogs: number;
    expenses: number;
    netProfit: number;
    expenseList: Expense[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    orderList: any[];
    salesByDate: { date: string; amount: number }[];
    salesByCategory: { name: string; value: number }[];
}

export interface DailyClosePreview {
    totalSales: number;
    totalCash: number;
    totalCard: number;
    totalCogs: number;
    totalExpenses: number;
    netProfit: number;
    openOrdersCount: number;
    openShiftsCount: number;
    branchId: string | null;
    alreadyClosed: boolean;
}

// ── shared helper: calculate COGS from bill list ─────────────────────────────
function calcCogsFromBills(bills: any[]): number {
    const seen = new Set<string>();
    let cogs = 0;
    for (const bill of bills) {
        if (seen.has(bill.orderId)) continue;
        seen.add(bill.orderId);
        for (const item of bill.order?.items ?? []) {
            let cost = item.cost ?? 0;
            if (cost === 0 && item.menuItem?.recipe?.length > 0) {
                cost = item.menuItem.recipe.reduce((acc: number, r: any) =>
                    acc + (r.quantity * (r.material?.costPerUnit ?? 0)), 0
                ) * item.quantity;
            }
            cogs += cost;
        }
    }
    return cogs;
}

// ── include clause reused in preview + performDailyClose ─────────────────────
const billCogsInclude = {
    order: {
        include: {
            items: {
                include: {
                    menuItem: {
                        include: {
                            recipe: { include: { material: true } },
                        },
                    },
                },
            },
        },
    },
} as const;

export async function getFinancialStats(from: Date, to: Date): Promise<FinancialStats> {
    noStore();

    const startDate = new Date(from);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(to);
    endDate.setHours(23, 59, 59, 999);

    const empty: FinancialStats = {
        revenue: 0, transactionCount: 0, cogs: 0, expenses: 0, netProfit: 0,
        expenseList: [], orderList: [], salesByDate: [], salesByCategory: []
    };

    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return empty;

        const branchId = await getActiveBranchId(tenantId);
        const billBranchWhere = branchId ? { order: { branchId } } : {};
        const expenseBranchWhere = branchId ? { branchId } : {};

        const [bills, expenses] = await Promise.all([
            prisma.bill.findMany({
                where: { tenantId, paidAt: { gte: startDate, lte: endDate }, ...billBranchWhere },
                include: {
                    order: {
                        include: {
                            items: {
                                include: {
                                    menuItem: {
                                        include: {
                                            category: true,
                                            recipe: { include: { material: true } }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                orderBy: { paidAt: 'desc' }
            }),
            prisma.expense.findMany({
                where: { date: { gte: startDate, lte: endDate }, tenantId, ...expenseBranchWhere },
                orderBy: { date: 'desc' }
            }),
        ]);

        let revenue = 0;
        let cogs = 0;
        const categorySales: Record<string, number> = {};
        const dateSales: Record<string, number> = {};
        const seenOrderIds = new Set<string>();

        for (const bill of bills) {
            revenue += bill.amount;
            const dateKey = bill.paidAt.toISOString().split('T')[0];
            dateSales[dateKey] = (dateSales[dateKey] || 0) + bill.amount;

            if (!seenOrderIds.has(bill.orderId)) {
                seenOrderIds.add(bill.orderId);
                for (const item of bill.order.items) {
                    let itemCost = item.cost;
                    if (itemCost === 0 && (item.menuItem as any).recipe?.length > 0) {
                        itemCost = (item.menuItem as any).recipe.reduce((acc: number, r: any) =>
                            acc + (r.quantity * (r.material?.costPerUnit || 0)), 0
                        ) * item.quantity;
                    }
                    cogs += itemCost;
                    const catName = item.menuItem.category.name;
                    categorySales[catName] = (categorySales[catName] || 0) + item.totalPrice;
                }
            }
        }

        const orders = bills
            .filter((b, i, arr) => arr.findIndex(x => x.orderId === b.orderId) === i)
            .map(b => b.order);

        const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);
        const salesByDate = Object.entries(dateSales)
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date));
        const salesByCategory = Object.entries(categorySales).map(([name, value]) => ({ name, value }));

        return {
            revenue, transactionCount: orders.length, cogs, expenses: totalExpenses,
            netProfit: revenue - cogs - totalExpenses,
            expenseList: expenses, orderList: orders, salesByDate, salesByCategory
        };
    } catch (error) {
        console.error('Failed to fetch financial stats', error);
        return empty;
    }
}

export async function getFinancialSummary() {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return await getFinancialStats(start, end);
}

// Returns current period stats + previous period stats (same duration, shifted back)
export async function getFinancialComparison(from: Date, to: Date): Promise<{
    current: FinancialStats;
    previous: FinancialStats;
}> {
    const durationMs = to.getTime() - from.getTime();
    const prevTo = new Date(from.getTime() - 1);
    const prevFrom = new Date(prevTo.getTime() - durationMs);

    const [current, previous] = await Promise.all([
        getFinancialStats(from, to),
        getFinancialStats(prevFrom, prevTo),
    ]);
    return { current, previous };
}

// ── Preview: calculates today's numbers WITHOUT saving ────────────────────────
export async function getDailyClosePreview(): Promise<DailyClosePreview> {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'ACCOUNTANT']);
    requireTenantId(tenantId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const branchId = await getActiveBranchId(tenantId!);
    const billBranchWhere = branchId ? { order: { branchId } } : {};
    const expenseBranchWhere = branchId ? { branchId } : {};
    const orderBranchWhere = branchId ? { branchId } : {};

    const empty: DailyClosePreview = {
        totalSales: 0, totalCash: 0, totalCard: 0, totalCogs: 0,
        totalExpenses: 0, netProfit: 0,
        openOrdersCount: 0, openShiftsCount: 0,
        branchId, alreadyClosed: false,
    };

    try {
        const [bills, expenses, openOrdersCount, openShiftsCount, existing] = await Promise.all([
            prisma.bill.findMany({
                where: { tenantId, paidAt: { gte: today, lt: tomorrow }, ...billBranchWhere },
                include: billCogsInclude,
            }),
            prisma.expense.findMany({
                where: { tenantId, date: { gte: today, lt: tomorrow }, ...expenseBranchWhere },
            }),
            prisma.order.count({
                where: {
                    tenantId,
                    status: { in: ['PENDING', 'PREPARING', 'READY', 'SERVED'] },
                    ...orderBranchWhere,
                },
            }),
            prisma.cashierShift.count({
                where: { tenantId, closedAt: null },
            }),
            prisma.dailyClose.findFirst({
                where: { tenantId, branchId: branchId ?? null, date: { gte: today, lt: tomorrow } },
            }),
        ]);

        const totalSales = bills.reduce((s, b) => s + b.amount, 0);
        const totalCash = bills.filter(b => b.paymentMethod === 'CASH').reduce((s, b) => s + b.amount, 0);
        const totalCard = bills.filter(b => b.paymentMethod === 'CARD').reduce((s, b) => s + b.amount, 0);
        const totalCogs = calcCogsFromBills(bills);
        const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);

        return {
            totalSales, totalCash, totalCard, totalCogs, totalExpenses,
            netProfit: totalSales - totalCogs - totalExpenses,
            openOrdersCount, openShiftsCount,
            branchId, alreadyClosed: !!existing,
        };
    } catch (error) {
        console.error('getDailyClosePreview error:', error);
        return empty;
    }
}

export async function getTodayDailyClose() {
    const user = await getCurrentUser();
    const tenantId = user?.tenantId;
    if (!tenantId) return null;

    const branchId = await getActiveBranchId(tenantId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return prisma.dailyClose.findFirst({
        where: { tenantId, branchId: branchId ?? null, date: { gte: today, lt: tomorrow } },
        include: { closedBy: { select: { name: true } } },
    });
}

export async function getRecentDailyCloses(limit = 7) {
    const user = await getCurrentUser();
    const tenantId = user?.tenantId;
    if (!tenantId) return [];

    const branchId = await getActiveBranchId(tenantId);

    return prisma.dailyClose.findMany({
        where: { tenantId, branchId: branchId ?? null },
        orderBy: { date: 'desc' },
        take: limit,
        include: { closedBy: { select: { name: true } } },
    });
}

export async function performDailyClose(notes?: string) {
    const { userId, tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'ACCOUNTANT']);
    requireTenantId(tenantId);

    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const branchId = await getActiveBranchId(tenantId!);
        const billBranchWhere = branchId ? { order: { branchId } } : {};
        const expenseBranchWhere = branchId ? { branchId } : {};

        // Uniqueness guard (code-level since @@unique was removed)
        const existing = await prisma.dailyClose.findFirst({
            where: { tenantId, branchId: branchId ?? null, date: { gte: today, lt: tomorrow } },
        });
        if (existing) return { error: 'تم إغلاق اليوم مسبقاً' };

        const [bills, expenses] = await Promise.all([
            prisma.bill.findMany({
                where: { tenantId, paidAt: { gte: today, lt: tomorrow }, ...billBranchWhere },
                include: billCogsInclude,
            }),
            prisma.expense.findMany({
                where: { tenantId, date: { gte: today, lt: tomorrow }, ...expenseBranchWhere },
            }),
        ]);

        const totalSales = bills.reduce((s, b) => s + b.amount, 0);
        const totalCash = bills.filter(b => b.paymentMethod === 'CASH').reduce((s, b) => s + b.amount, 0);
        const totalCard = bills.filter(b => b.paymentMethod === 'CARD').reduce((s, b) => s + b.amount, 0);
        const totalCogs = calcCogsFromBills(bills);
        const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
        const netProfit = totalSales - totalCogs - totalExpenses;

        await prisma.dailyClose.create({
            data: {
                date: today,
                totalSales, totalCash, totalCard, totalCogs, totalExpenses, netProfit,
                closedById: userId,
                tenantId,
                branchId: branchId ?? null,
                notes: notes?.trim() || null,
            },
        });

        revalidatePath('/dashboard/finance');
        revalidatePath('/dashboard/accountant/finance');
        return { success: true };
    } catch (error) {
        console.error('Daily close error:', error);
        return { error: 'فشل في الإغلاق اليومي' };
    }
}

export async function addExpense(data: { description: string; amount: number; category: string; date: Date }) {
    const { userId, tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'ACCOUNTANT']);
    requireTenantId(tenantId);
    try {
        const branchId = await getActiveBranchId(tenantId!);
        const result = await withAudit(
            { tenantId, userId },
            'ADD_EXPENSE',
            'Expense',
            'new',
            async () => {
                return prisma.expense.create({
                    data: { ...data, recordedById: userId, tenantId, branchId: await resolveCreateBranchId(tenantId!, branchId) }
                });
            }
        );
        revalidatePath('/dashboard/finance');
        return { success: true, id: result.id };
    } catch {
        return { error: 'Failed to add expense' };
    }
}

export async function deleteExpense(id: string) {
    const { userId, tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    requireTenantId(tenantId);
    try {
        const existing = await prisma.expense.findFirst({ where: { id, tenantId } });
        if (!existing) return { error: 'Expense not found or access denied' };

        await withAudit(
            { tenantId, userId },
            'DELETE_EXPENSE',
            'Expense',
            id,
            () => prisma.expense.delete({ where: { id } }),
            () => prisma.expense.findUnique({ where: { id } })
        );
        revalidatePath('/dashboard/finance');
        return { success: true };
    } catch {
        return { error: 'Failed to delete expense' };
    }
}
