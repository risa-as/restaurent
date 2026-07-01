'use server';

import { prisma } from '@/lib/prisma';
import { verifyRole } from '@/lib/auth-guard';
import { withAudit } from '@/lib/audit';
import { revalidatePath } from 'next/cache';

export async function getPendingVoidRequests() {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    return prisma.voidRequest.findMany({
        where: { tenantId, status: 'PENDING' },
        include: {
            order: {
                select: {
                    orderNumber: true,
                    totalAmount: true,
                    table: { select: { number: true } },
                    items: {
                        select: { quantity: true, menuItem: { select: { name: true } } },
                        take: 5,
                    },
                },
            },
            requestedBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
    });
}

export async function approveVoidRequest(voidRequestId: string) {
    const { userId, tenantId } = await verifyRole(['ADMIN', 'MANAGER']);

    const ctx = { tenantId, userId };

    return withAudit(ctx, 'VOID_REQUEST_APPROVED', 'VoidRequest', voidRequestId, async () => {
        const req = await prisma.voidRequest.findFirst({
            where: { id: voidRequestId, tenantId, status: 'PENDING' },
            include: { order: true },
        });
        if (!req) return { error: 'الطلب غير موجود' };

        await prisma.$transaction([
            prisma.order.update({
                where: { id: req.orderId },
                data: { status: 'CANCELLED' },
            }),
            prisma.voidRequest.update({
                where: { id: voidRequestId },
                data: { status: 'APPROVED', approvedById: userId, resolvedAt: new Date() },
            }),
        ]);

        revalidatePath('/dashboard');
        return { success: true };
    }, () => prisma.voidRequest.findUnique({ where: { id: voidRequestId } }));
}

export async function rejectVoidRequest(voidRequestId: string) {
    const { userId, tenantId } = await verifyRole(['ADMIN', 'MANAGER']);

    const ctx = { tenantId, userId };

    return withAudit(ctx, 'VOID_REQUEST_REJECTED', 'VoidRequest', voidRequestId, async () => {
        const req = await prisma.voidRequest.findFirst({
            where: { id: voidRequestId, tenantId, status: 'PENDING' },
        });
        if (!req) return { error: 'الطلب غير موجود' };

        await prisma.voidRequest.update({
            where: { id: voidRequestId },
            data: { status: 'REJECTED', approvedById: userId, resolvedAt: new Date() },
        });

        revalidatePath('/dashboard');
        return { success: true };
    }, () => prisma.voidRequest.findUnique({ where: { id: voidRequestId } }));
}
