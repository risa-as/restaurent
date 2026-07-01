'use server';

import { prisma } from '@/lib/prisma';
import { verifyRole } from '@/lib/auth-guard';
import { getActiveBranchId } from '@/lib/utils/branch-filter';
import { revalidatePath } from 'next/cache';

export async function getFeedbackStats(
    from?: Date,
    to?: Date,
) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'ACCOUNTANT']);
    const branchId = await getActiveBranchId(tenantId);

    const where = {
        tenantId,
        ...(branchId ? { branchId } : {}),
        ...(from || to
            ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
            : {}),
    };

    const [total, distribution] = await Promise.all([
        prisma.customerFeedback.aggregate({
            where,
            _avg: { rating: true },
            _count: { id: true },
        }),
        prisma.customerFeedback.groupBy({
            by: ['rating'],
            where,
            _count: { id: true },
            orderBy: { rating: 'asc' },
        }),
    ]);

    const distMap: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const d of distribution) distMap[d.rating] = d._count.id;

    return {
        averageRating: total._avg.rating ?? 0,
        totalCount: total._count.id,
        distribution: distMap,
    };
}

export async function getFeedbackList(
    from?: Date,
    to?: Date,
    ratingFilter?: number,
    page = 1,
    pageSize = 15,
) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'ACCOUNTANT']);
    const branchId = await getActiveBranchId(tenantId);

    const where = {
        tenantId,
        ...(branchId ? { branchId } : {}),
        ...(ratingFilter ? { rating: ratingFilter } : {}),
        ...(from || to
            ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } }
            : {}),
    };

    const [items, totalCount] = await Promise.all([
        prisma.customerFeedback.findMany({
            where,
            select: {
                id: true, rating: true, comment: true,
                staffReply: true, repliedAt: true, createdAt: true,
                order: {
                    select: {
                        orderNumber: true,
                        customer: { select: { name: true, phone: true } },
                    },
                },
                branch: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
            skip: (page - 1) * pageSize,
            take: pageSize,
        }),
        prisma.customerFeedback.count({ where }),
    ]);

    return {
        items,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        page,
    };
}

// Weekly trend: last 8 weeks of average rating
export async function getFeedbackTrend() {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'ACCOUNTANT']);
    const branchId = await getActiveBranchId(tenantId);

    const result = [];
    const now = new Date();
    for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - i * 7 - 6);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const agg = await prisma.customerFeedback.aggregate({
            where: {
                tenantId,
                ...(branchId ? { branchId } : {}),
                createdAt: { gte: weekStart, lte: weekEnd },
            },
            _avg: { rating: true },
            _count: { id: true },
        });

        result.push({
            week: `${weekStart.getDate()}/${weekStart.getMonth() + 1}`,
            avg: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
            count: agg._count.id,
        });
    }
    return result;
}

export async function deleteFeedback(id: string) {
    await verifyRole(['ADMIN', 'MANAGER']);

    await prisma.customerFeedback.delete({ where: { id } });

    revalidatePath('/dashboard/feedback');
    return { success: true };
}

export async function replyToFeedback(id: string, reply: string) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    if (!reply.trim()) throw new Error('الرد لا يمكن أن يكون فارغاً');

    // Require at least BASIC plan (not TRIAL)
    if (tenantId) {
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { plan: true } });
        if (tenant?.plan === 'TRIAL') throw new Error('الرد على التقييمات متاح من الخطة الأساسية فأعلى');
    }

    await prisma.customerFeedback.update({
        where: { id },
        data: { staffReply: reply.trim(), repliedAt: new Date() },
    });

    revalidatePath('/dashboard/feedback');
    return { success: true };
}

export async function getLowRatingCount() {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'ACCOUNTANT']);
    const branchId = await getActiveBranchId(tenantId);
    return prisma.customerFeedback.count({
        where: {
            tenantId,
            ...(branchId ? { branchId } : {}),
            rating: { lte: 2 },
            staffReply: null,
        },
    });
}
