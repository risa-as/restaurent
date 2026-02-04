'use server';

import { prisma } from '@/lib/prisma';
import { unstable_noStore as noStore, revalidatePath } from 'next/cache';
import { Expense } from '@prisma/client';

export interface FinancialStats {
    revenue: number;
    transactionCount: number;
    cogs: number; // Cost of Goods Sold
    expenses: number;
    netProfit: number;
    expenseList: Expense[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    orderList: any[];
    salesByDate: { date: string; amount: number }[];
    salesByCategory: { name: string; value: number }[];
}

export async function getFinancialStats(from: Date, to: Date): Promise<FinancialStats> {
    noStore();

    // Ensure we cover the full range of the end date
    const startDate = new Date(from);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(to);
    endDate.setHours(23, 59, 59, 999);

    try {
        // 1. Fetch Completed Orders descending by date
        const orders = await prisma.order.findMany({
            where: {
                status: { in: ['COMPLETED', 'SERVED'] }, // Include served if paid? Usually COMPLETED means paid. Let's assume COMPLETED.
                OR: [
                    { status: 'COMPLETED' },
                    // If your workflow uses SERVED for paid but not closed, include it. Best to check Bill existence.
                ],
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                items: {
                    include: {
                        menuItem: {
                            include: {
                                category: true
                            }
                        }
                    }
                },
                bills: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // 2. Calculate Revenue & COGS
        let revenue = 0;
        let cogs = 0;
        const categorySales: Record<string, number> = {};
        const dateSales: Record<string, number> = {};

        for (const order of orders) {
            // Revenue from Bills (Actual paid amount)
            const orderTotal = order.bills.reduce((acc, bill) => acc + bill.amount, 0);
            // Fallback to order totalAmount if no bills (legacy)
            const finalOrderAmount = orderTotal > 0 ? orderTotal : order.totalAmount;

            revenue += finalOrderAmount;

            // COGS from Items
            for (const item of order.items) {
                const itemCost = item.cost * item.quantity; // Assuming cost is snapshotted on OrderItem
                cogs += itemCost;

                // Category Sales
                const catName = item.menuItem.category.name;
                categorySales[catName] = (categorySales[catName] || 0) + item.totalPrice;
            }

            // Date Sales (Daily aggregation)
            const dateKey = order.createdAt.toISOString().split('T')[0];
            dateSales[dateKey] = (dateSales[dateKey] || 0) + finalOrderAmount;
        }

        // 3. Fetch Expenses
        const expenses = await prisma.expense.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            orderBy: { date: 'desc' }
        });

        const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);

        // 4. Group Data for Charts
        const salesByDate = Object.entries(dateSales).map(([date, amount]) => ({
            date,
            amount
        })).sort((a, b) => a.date.localeCompare(b.date));

        const salesByCategory = Object.entries(categorySales).map(([name, value]) => ({
            name,
            value
        }));

        return {
            revenue,
            transactionCount: orders.length,
            cogs,
            expenses: totalExpenses,
            netProfit: revenue - cogs - totalExpenses,
            expenseList: expenses,
            orderList: orders,
            salesByDate,
            salesByCategory
        };

    } catch (error) {
        console.error("Failed to fetch financial stats", error);
        return {
            revenue: 0,
            transactionCount: 0,
            cogs: 0,
            expenses: 0,
            netProfit: 0,
            expenseList: [],
            orderList: [],
            salesByDate: [],
            salesByCategory: []
        };
    }
}

// Keep the old function for compatibility if needed, using default 30 days

export async function getFinancialSummary() {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return await getFinancialStats(start, end);
}

export async function addExpense(data: { description: string; amount: number; category: string; date: Date }) {
    try {
        await prisma.expense.create({
            data: {
                ...data,
                recordedBy: 'SYSTEM' // ToDo: Add user ID
            }
        });
        revalidatePath('/dashboard/finance');
        return { success: true };
    } catch {
        return { error: "Failed to add expense" };
    }
}

export async function deleteExpense(id: string) {
    try {
        await prisma.expense.delete({
            where: { id }
        });
        revalidatePath('/dashboard/finance');
        return { success: true };
    } catch {
        return { error: "Failed to delete expense" };
    }
}
