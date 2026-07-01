'use server';

import { prisma } from '@/lib/prisma';
import { verifyRole } from '@/lib/auth-guard';

export async function getConsolidatedReport(from: Date, to: Date, filterBranchId?: string | null) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'ACCOUNTANT']);

    const branches = await prisma.branch.findMany({
        where: { tenantId },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
    });

    const where = {
        tenantId,
        paidAt: { gte: from, lte: to },
        ...(filterBranchId ? { order: { branchId: filterBranchId } } : {}),
    };
    const branchMap = new Map(branches.map(b => [b.id, b.name]));

    // Fetch bills with COGS data per order
    const billsRaw = await prisma.bill.findMany({
        where,
        select: {
            amount: true,
            paymentMethod: true,
            orderId: true,
            order: {
                select: {
                    branchId: true,
                    items: {
                        select: {
                            cost: true,
                            quantity: true,
                            menuItem: {
                                select: {
                                    recipe: { select: { quantity: true, material: { select: { costPerUnit: true } } } },
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    type BranchAgg = {
        totalRevenue: number; orderCount: number;
        cashRevenue: number; cardRevenue: number;
        cogs: number;
        seenOrderIds: Set<string>;
    };
    const aggMap = new Map<string, BranchAgg>();

    for (const bill of billsRaw) {
        const key = bill.order?.branchId ?? 'no-branch';
        const cur = aggMap.get(key) ?? {
            totalRevenue: 0, orderCount: 0,
            cashRevenue: 0, cardRevenue: 0,
            cogs: 0,
            seenOrderIds: new Set<string>(),
        };
        cur.totalRevenue += bill.amount;
        cur.orderCount += 1;
        if (bill.paymentMethod === 'CASH') cur.cashRevenue += bill.amount;
        else cur.cardRevenue += bill.amount;

        if (!cur.seenOrderIds.has(bill.orderId)) {
            cur.seenOrderIds.add(bill.orderId);
            for (const item of bill.order?.items ?? []) {
                let cost = item.cost ?? 0;
                if (cost === 0 && item.menuItem?.recipe?.length > 0) {
                    cost = item.menuItem.recipe.reduce(
                        (acc: number, r: any) => acc + (r.quantity * (r.material?.costPerUnit ?? 0)),
                        0,
                    ) * item.quantity;
                }
                cur.cogs += cost;
            }
        }
        aggMap.set(key, cur);
    }

    const rows = Array.from(aggMap.entries()).map(([branchId, agg]) => {
        const revenue = agg.totalRevenue;
        const cogs = Math.round(agg.cogs);
        const grossProfit = revenue - cogs;
        return {
            branchId,
            branchName: branchId !== 'no-branch' ? (branchMap.get(branchId) ?? 'فرع غير معروف') : 'بدون فرع',
            totalRevenue: revenue,
            orderCount: agg.orderCount,
            avgOrderValue: agg.orderCount > 0 ? revenue / agg.orderCount : 0,
            cashRevenue: agg.cashRevenue,
            cardRevenue: agg.cardRevenue,
            cogs,
            grossProfit,
            grossMarginPct: revenue > 0 ? Math.round((grossProfit / revenue) * 100) : 0,
        };
    });

    const totals = {
        totalRevenue: rows.reduce((s, r) => s + r.totalRevenue, 0),
        orderCount: rows.reduce((s, r) => s + r.orderCount, 0),
        cashRevenue: rows.reduce((s, r) => s + r.cashRevenue, 0),
        cardRevenue: rows.reduce((s, r) => s + r.cardRevenue, 0),
        cogs: rows.reduce((s, r) => s + r.cogs, 0),
        grossProfit: rows.reduce((s, r) => s + r.grossProfit, 0),
    };

    return { rows, totals, branches };
}

export async function exportConsolidatedReport(
    rows: { branchName: string; totalRevenue: number; orderCount: number; avgOrderValue: number; cashRevenue: number; cardRevenue: number; cogs?: number; grossProfit?: number; grossMarginPct?: number }[],
    from: Date,
    to: Date,
): Promise<{ base64: string; filename: string }> {
    const XLSX = await import('xlsx');

    const wsData = [
        ['الفرع', 'الإيرادات', 'التكلفة (COGS)', 'الربح الإجمالي', 'الهامش %', 'عدد الطلبات', 'متوسط الطلب', 'النقد', 'البطاقة'],
        ...rows.map(r => [
            r.branchName, r.totalRevenue,
            r.cogs ?? 0, r.grossProfit ?? 0, `${r.grossMarginPct ?? 0}%`,
            r.orderCount, Math.round(r.avgOrderValue), r.cashRevenue, r.cardRevenue,
        ]),
        [
            'الإجمالي',
            rows.reduce((s, r) => s + r.totalRevenue, 0),
            rows.reduce((s, r) => s + (r.cogs ?? 0), 0),
            rows.reduce((s, r) => s + (r.grossProfit ?? 0), 0),
            '',
            rows.reduce((s, r) => s + r.orderCount, 0),
            '',
            rows.reduce((s, r) => s + r.cashRevenue, 0),
            rows.reduce((s, r) => s + r.cardRevenue, 0),
        ],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'تفاصيل الفروع');
    const buf = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const fromStr = from.toISOString().split('T')[0];
    const toStr = to.toISOString().split('T')[0];
    return { base64: buf, filename: `consolidated-report-${fromStr}-${toStr}.xlsx` };
}
