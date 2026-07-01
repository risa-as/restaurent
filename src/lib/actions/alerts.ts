'use server';

import { prisma } from '@/lib/prisma';
import { verifyRole } from '@/lib/auth-guard';
import { getActiveBranchId, getShiftBranchWhere } from '@/lib/utils/branch-filter';
import { getTenantWithPlan, getEffectiveLimits } from '@/lib/plan-limits';

export async function getSmartAlerts() {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'ACCOUNTANT']);
    if (!tenantId) throw new Error('Unauthorized');

    const branchId = await getActiveBranchId(tenantId);
    const shiftBranchWhere = await getShiftBranchWhere(tenantId);
    const now = new Date();
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Check plan modules once
    const tenant = await getTenantWithPlan(tenantId);
    const modules = tenant ? getEffectiveLimits(tenant).modules : null;
    const hasInventory = modules?.inventory ?? false;
    const hasAdvancedReports = modules?.advancedReports ?? false;

    const [
        lowRatingFeedback,
        openShifts,
        recentShiftsWithDiscrepancy,
        openOrders,
        unansweredFeedback,
    ] = await Promise.all([
        // Low rating feedback (last 7 days, rating ≤ 2) — always visible
        prisma.customerFeedback.findMany({
            where: {
                tenantId,
                ...(branchId ? { branchId } : {}),
                rating: { lte: 2 },
                createdAt: { gte: last7d },
            },
            include: {
                order: { select: { orderNumber: true, customer: { select: { name: true } } } },
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
        }),

        // Open cashier shifts — always visible
        prisma.cashierShift.findMany({
            where: {
                tenantId,
                ...shiftBranchWhere,
                closedAt: null,
            },
            include: { cashier: { select: { name: true, email: true } } },
            orderBy: { openedAt: 'asc' },
        }),

        // Shifts with cash variance — only when advancedReports enabled
        hasAdvancedReports
            ? prisma.cashierShift.findMany({
                where: {
                    tenantId,
                    ...shiftBranchWhere,
                    openedAt: { gte: last7d },
                    cashVariance: { not: null },
                    NOT: { cashVariance: 0 },
                },
                include: { cashier: { select: { name: true, email: true } } },
                orderBy: { openedAt: 'desc' },
                take: 10,
            })
            : Promise.resolve([] as any[]),

        // Open orders — always visible
        prisma.order.count({
            where: {
                tenantId,
                ...(branchId ? { branchId } : {}),
                status: { in: ['PENDING', 'PREPARING', 'READY'] },
            },
        }),

        // Unanswered low-rating feedback — always visible
        prisma.customerFeedback.count({
            where: {
                tenantId,
                ...(branchId ? { branchId } : {}),
                rating: { lte: 2 },
                staffReply: null,
            },
        }),
    ]);

    // Low stock — only when inventory module is enabled
    const actualLowStock = hasInventory
        ? await prisma.rawMaterial.findMany({
            where: { tenantId },
            select: { id: true, name: true, currentStock: true, minStockLevel: true, unit: true },
        }).then(items => items.filter(i => i.currentStock <= i.minStockLevel))
        : [];

    return {
        lowStock: actualLowStock,
        lowRatingFeedback,
        openShifts,
        shiftsWithVariance: recentShiftsWithDiscrepancy,
        openOrdersCount: openOrders,
        unansweredLowRatings: unansweredFeedback,
        hasInventory,
        hasAdvancedReports,
        generatedAt: now,
    };
}

export type SmartAlerts = Awaited<ReturnType<typeof getSmartAlerts>>;
