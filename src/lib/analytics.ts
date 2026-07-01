import { prisma } from '@/lib/prisma';
import { startOfMonth, endOfMonth, subMonths, format, subDays, startOfDay, endOfDay } from 'date-fns';
import { getActiveBranchId } from '@/lib/utils/branch-filter';

// ── أكثر الأصناف مبيعاً ──────────────────────────────────────────────────────
export async function getTopItems(tenantId: string, limit = 10, branchId?: string | null) {
    const branchWhere = branchId ? { branchId } : {};
    const topItems = await prisma.orderItem.groupBy({
        by: ['menuItemId'],
        where: { order: { tenantId, status: 'COMPLETED', ...branchWhere } },
        _sum: { quantity: true, totalPrice: true, cost: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: limit,
    });

    return Promise.all(
        topItems.map(async (item) => {
            const menuItem = await prisma.menuItem.findUnique({
                where: { id: item.menuItemId },
                include: {
                    category: { select: { name: true } },
                    recipe: { include: { material: true } },
                },
            });

            const revenue = item._sum.totalPrice || 0;
            const quantity = item._sum.quantity || 0;

            // إذا كان الـ cost المخزّن = 0 (طلبات قبل ربط الوصفات)، احسب من الوصفة
            let unitCost = 0;
            const storedCost = item._sum.cost || 0;
            if (storedCost > 0) {
                unitCost = quantity > 0 ? storedCost / quantity : 0;
            } else if (menuItem?.recipe && menuItem.recipe.length > 0) {
                unitCost = menuItem.recipe.reduce((acc, r) => {
                    return acc + (r.quantity * (r.material?.costPerUnit || 0));
                }, 0);
            }

            const cost = unitCost * quantity;
            const profit = revenue - cost;
            const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;
            const hasRealCost = storedCost > 0 || (menuItem?.recipe && menuItem.recipe.length > 0);

            return {
                name: menuItem?.name || 'Unknown',
                category: menuItem?.category?.name || '-',
                quantity,
                revenue,
                cost: Math.round(cost),
                profit: Math.round(profit),
                marginPct: margin,
                costSource: storedCost > 0 ? 'stored' : hasRealCost ? 'recipe' : 'missing',
            };
        })
    );
}

// ── الأصناف الأقل مبيعاً (لإعادة التقييم) ───────────────────────────────────
export async function getSlowItems(tenantId: string, branchId?: string | null) {
    const branchWhere = branchId ? { branchId } : {};
    const slowItems = await prisma.orderItem.groupBy({
        by: ['menuItemId'],
        where: { order: { tenantId, status: 'COMPLETED', ...branchWhere } },
        _sum: { quantity: true, totalPrice: true },
        orderBy: { _sum: { quantity: 'asc' } },
        take: 5,
    });

    return Promise.all(
        slowItems.map(async (item) => {
            const menuItem = await prisma.menuItem.findUnique({ where: { id: item.menuItemId } });
            return {
                name: menuItem?.name || 'Unknown',
                quantity: item._sum.quantity || 0,
                revenue: item._sum.totalPrice || 0,
            };
        })
    );
}

// ── المبيعات الشهرية (6 أشهر) ────────────────────────────────────────────────
export async function getMonthlySales(tenantId: string, monthsCount = 6, branchId?: string | null) {
    const branchWhere = branchId ? { branchId } : {};
    const data = [];
    for (let i = monthsCount - 1; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const start = startOfMonth(date);
        const end = endOfMonth(date);

        const [orderAgg, billAgg, expenses] = await Promise.all([
            prisma.order.aggregate({
                where: { tenantId, status: 'COMPLETED', createdAt: { gte: start, lte: end }, ...branchWhere },
                _sum: { totalAmount: true },
                _count: { id: true },
            }),
            prisma.bill.aggregate({
                where: { tenantId, paidAt: { gte: start, lte: end }, order: branchWhere.branchId ? { branchId: branchWhere.branchId } : undefined },
                _sum: { amount: true },
            }),
            prisma.expense.aggregate({
                where: { tenantId, date: { gte: start, lte: end }, ...(branchId ? { branchId } : {}) },
                _sum: { amount: true },
            }),
        ]);

        data.push({
            month: format(start, 'MMM yyyy'),
            revenue: billAgg._sum.amount || 0,
            expenses: expenses._sum.amount || 0,
            netProfit: (billAgg._sum.amount || 0) - (expenses._sum.amount || 0),
            orderCount: orderAgg._count.id,
            avgOrderValue: orderAgg._count.id > 0
                ? Math.round((orderAgg._sum.totalAmount || 0) / orderAgg._count.id)
                : 0,
        });
    }
    return data;
}

// ── ساعات الذروة ─────────────────────────────────────────────────────────────
export async function getPeakHours(tenantId: string, branchId?: string | null) {
    const branchWhere = branchId ? { branchId } : {};
    const orders = await prisma.order.findMany({
        where: { tenantId, status: 'COMPLETED', ...branchWhere },
        select: { createdAt: true, totalAmount: true },
        take: 2000,
        orderBy: { createdAt: 'desc' },
    });

    const hourData: Record<string, { count: number; revenue: number }> = {};
    for (const order of orders) {
        const h = order.createdAt.getHours().toString().padStart(2, '0') + ':00';
        if (!hourData[h]) hourData[h] = { count: 0, revenue: 0 };
        hourData[h].count++;
        hourData[h].revenue += order.totalAmount;
    }

    return Object.entries(hourData)
        .map(([hour, d]) => ({ hour, orderCount: d.count, revenue: Math.round(d.revenue) }))
        .sort((a, b) => b.orderCount - a.orderCount)
        .slice(0, 8);
}

// ── أداء آخر 7 أيام ──────────────────────────────────────────────────────────
export async function getLast7DaysSales(tenantId: string, branchId?: string | null) {
    const data = [];
    for (let i = 6; i >= 0; i--) {
        const day = subDays(new Date(), i);
        const start = startOfDay(day);
        const end = endOfDay(day);

        const agg = await prisma.bill.aggregate({
            where: {
                tenantId,
                paidAt: { gte: start, lte: end },
                ...(branchId ? { order: { branchId } } : {}),
            },
            _sum: { amount: true },
            _count: { id: true },
        });

        data.push({
            day: format(day, 'EEE dd/MM'),
            revenue: agg._sum.amount || 0,
            orderCount: agg._count.id,
        });
    }
    return data;
}

// ── إحصاءات العملاء ──────────────────────────────────────────────────────────
export async function getCustomerStats(tenantId: string, branchId?: string | null) {
    const branchOrderFilter = branchId ? { orders: { some: { branchId } } } : {};

    const [totalCustomers, newThisMonth, topSpenders] = await Promise.all([
        prisma.customer.count({ where: { tenantId, ...branchOrderFilter } }),
        prisma.customer.count({
            where: { tenantId, createdAt: { gte: startOfMonth(new Date()) }, ...branchOrderFilter },
        }),
        prisma.customer.findMany({
            where: { tenantId, totalSpent: { gt: 0 }, ...branchOrderFilter },
            orderBy: { totalSpent: 'desc' },
            take: 5,
            select: { name: true, totalSpent: true, totalPoints: true, phone: true },
        }),
    ]);

    return { totalCustomers, newThisMonth, topSpenders };
}

// ── إحصاءات المخزون والتكلفة ─────────────────────────────────────────────────
export async function getInventoryAlerts(tenantId: string, branchId?: string | null) {
    let materialIdFilter: { id?: { in: string[] } } = {};

    if (branchId) {
        // Only show raw materials used in this branch's menu items
        const usedMaterials = await prisma.recipeItem.findMany({
            where: { menuItem: { tenantId, branchId } },
            select: { materialId: true },
            distinct: ['materialId'],
        });
        const ids = usedMaterials.map((r: { materialId: string }) => r.materialId);
        materialIdFilter = ids.length > 0 ? { id: { in: ids } } : { id: { in: [] } };
    }

    const lowStock = await prisma.rawMaterial.findMany({
        where: { tenantId, currentStock: { gt: 0 }, ...materialIdFilter },
        select: { name: true, currentStock: true, unit: true, costPerUnit: true },
        orderBy: { currentStock: 'asc' },
        take: 10,
    });

    return { lowStock };
}

// ── نسب طرق الدفع ────────────────────────────────────────────────────────────
export async function getPaymentMethodStats(tenantId: string, branchId?: string | null) {
    const branchFilter = branchId ? { order: { branchId } } : {};
    const stats = await prisma.bill.groupBy({
        by: ['paymentMethod'],
        where: { tenantId, ...branchFilter },
        _sum: { amount: true },
        _count: { id: true },
    });

    return stats.map(s => ({
        method: s.paymentMethod,
        total: s._sum.amount || 0,
        count: s._count.id,
    }));
}

// ── جودة البيانات ────────────────────────────────────────────────────────────
export async function getDataQuality(tenantId: string, branchId?: string | null) {
    const branchWhere = branchId ? { branchId } : {};

    const [totalOrders, totalBills, firstOrder, itemsWithRecipe, totalMenuItems] = await Promise.all([
        prisma.order.count({ where: { tenantId, status: 'COMPLETED', ...branchWhere } }),
        prisma.bill.count({ where: { tenantId, ...(branchId ? { order: { branchId } } : {}) } }),
        prisma.order.findFirst({
            where: { tenantId, status: 'COMPLETED', ...branchWhere },
            orderBy: { createdAt: 'asc' },
            select: { createdAt: true },
        }),
        prisma.menuItem.count({ where: { tenantId, recipe: { some: {} } } }),
        prisma.menuItem.count({ where: { tenantId, isAvailable: true } }),
    ]);

    const daysSinceFirstOrder = firstOrder
        ? Math.floor((Date.now() - new Date(firstOrder.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    const recipeCompletionPct = totalMenuItems > 0
        ? Math.round((itemsWithRecipe / totalMenuItems) * 100)
        : 0;

    return {
        totalOrders,
        totalBills,
        daysSinceFirstOrder,
        isNewRestaurant: daysSinceFirstOrder < 30,
        recipeCompletionPct,
        itemsWithRecipe,
        totalMenuItems,
        hasSufficientHistory: totalOrders >= 50,
        warnings: [
            ...(recipeCompletionPct < 80 ? [`فقط ${recipeCompletionPct}% من الأصناف لها وصفات → بيانات التكلفة غير مكتملة`] : []),
            ...(daysSinceFirstOrder < 14 ? [`المطعم يعمل منذ ${daysSinceFirstOrder} يوم فقط → لا توجد بيانات تاريخية كافية للمقارنة`] : []),
            ...(totalOrders < 20 ? [`عدد الطلبات قليل (${totalOrders}) → التحليل الإحصائي قد لا يكون دقيقاً`] : []),
        ],
    };
}

// ── الجامع الرئيسي ───────────────────────────────────────────────────────────
export async function getAnalyticsData(tenantId: string) {
    const branchId = await getActiveBranchId(tenantId);

    const [
        topItems, slowItems, monthlySales, peakHours,
        last7Days, customerStats, inventoryAlerts, paymentStats, dataQuality
    ] = await Promise.all([
        getTopItems(tenantId, 10, branchId),
        getSlowItems(tenantId, branchId),
        getMonthlySales(tenantId, 6, branchId),
        getPeakHours(tenantId, branchId),
        getLast7DaysSales(tenantId, branchId),
        getCustomerStats(tenantId, branchId),
        getInventoryAlerts(tenantId, branchId),
        getPaymentMethodStats(tenantId, branchId),
        getDataQuality(tenantId, branchId),
    ]);

    return { topItems, slowItems, monthlySales, peakHours, last7Days, customerStats, inventoryAlerts, paymentStats, dataQuality };
}
