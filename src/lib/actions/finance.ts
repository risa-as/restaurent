'use server';
/* eslint-disable @typescript-eslint/no-unused-vars */

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const expenseSchema = z.object({
    description: z.string().min(2),
    amount: z.coerce.number().min(0.01),
    category: z.string().min(2),
    date: z.coerce.date().default(new Date()),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;

export async function addExpense(data: ExpenseInput) {
    const validated = expenseSchema.safeParse(data);
    if (!validated.success) return { error: "بيانات غير صالحة" };

    try {
        await prisma.expense.create({
            data: {
                ...validated.data,
                recordedBy: "النظام", // Or user ID if auth context exists
            }
        });
        revalidatePath('/dashboard/finance');
        return { success: true };
    } catch (error) {
        return { error: "فشل في إضافة المصروف" };
    }
}

export async function deleteExpense(id: string) {
    try {
        await prisma.expense.delete({ where: { id } });
        revalidatePath('/dashboard/finance');
        return { success: true };
    } catch (error) {
        return { error: "فشل في حذف المصروف" };
    }
}

export async function getFinancialSummary(startDate?: Date, endDate?: Date) {
    try {
        // Defaults to "All Time" if no dates provided, or "Today" if desired.
        // Let's default to Today for specific focus, but usually finance is monthly.
        // Let's just do "All Time" simplicity for MVP or "Today" if logic dictates.
        // Let's grab all for simplicity of the prompt's scope unless specified.
        // Actually, "Daily Revenue" implies daily. Let's do "Today" by default?
        // Let's return ALL data and let client filter? No, heavy.
        // Let's return "Last 30 Days" by default.

        const start = startDate || new Date(new Date().setDate(new Date().getDate() - 30));
        const end = endDate || new Date();

        const [bills, expenses, orders] = await Promise.all([
            prisma.bill.findMany({
                where: { paidAt: { gte: start, lte: end } }
            }),
            prisma.expense.findMany({
                where: { date: { gte: start, lte: end } },
                orderBy: { date: 'desc' }
            }),
            prisma.order.findMany({
                where: {
                    status: 'COMPLETED',
                    updatedAt: { gte: start, lte: end }
                },
                include: {
                    items: {
                        include: {
                            menuItem: {
                                include: {
                                    recipe: {
                                        include: { material: true }
                                    }
                                }
                            }
                        }
                    }
                }
            })
        ]);

        const revenue = bills.reduce((acc, bill) => acc + bill.amount, 0);
        const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);

        // Calculate COGS
        // Iterate every sold item -> sum(recipe item cost * quantity)
        let cogs = 0;

        orders.forEach(order => {
            order.items.forEach(orderItem => {
                // Use stored cost if available (Process "Cost at time of Sale")
                if (orderItem.cost && orderItem.cost > 0) {
                    cogs += orderItem.cost;
                } else {
                    // Fallback for old orders: Calculate based on CURRENT recipe cost
                    let unitCost = 0;
                    orderItem.menuItem.recipe.forEach(recipeItem => {
                        const materialCost = recipeItem.material.costPerUnit;
                        const qtyNeeded = recipeItem.quantity;
                        unitCost += materialCost * qtyNeeded;
                    });
                    cogs += unitCost * orderItem.quantity;
                }
            });
        });

        const netProfit = revenue - totalExpenses - cogs;

        return {
            revenue,
            expenses: totalExpenses,
            cogs,
            netProfit,
            expenseList: expenses,
            transactionCount: bills.length
        };

    } catch (error) {
        console.error("Financial Error", error);
        return {
            revenue: 0, expenses: 0, cogs: 0, netProfit: 0, expenseList: [], transactionCount: 0
        };
    }
}
