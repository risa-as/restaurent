'use server';

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-guard';

interface AuditContext {
    tenantId?: string;
    userId?: string;
    ipAddress?: string;
}

export async function withAudit<T>(
    ctx: AuditContext,
    action: string,
    entityType: string,
    entityId: string,
    fn: () => Promise<T>,
    fetchEntity?: () => Promise<unknown>
): Promise<T> {
    let valueBefore: string | undefined;
    let valueAfter: string | undefined;

    // Capture before state
    if (fetchEntity) {
        try {
            const before = await fetchEntity();
            valueBefore = JSON.stringify(before);
        } catch {
            // ignore fetch errors
        }
    }

    // Execute the operation
    const result = await fn();

    // Capture after state
    if (fetchEntity) {
        try {
            const after = await fetchEntity();
            valueAfter = JSON.stringify(after);
        } catch {
            // ignore fetch errors
        }
    }

    // Write audit log (non-blocking — don't fail the operation if audit fails)
    try {
        const user = ctx.userId ? null : await getCurrentUser();
        // getCurrentUser() returns `userId`, not `id`.
        const userId = ctx.userId || user?.userId;

        await prisma.auditLog.create({
            data: {
                action,
                entityType,
                entityId,
                valueBefore: valueBefore ?? null,
                valueAfter: valueAfter ?? null,
                tenantId: ctx.tenantId ?? null,
                ipAddress: ctx.ipAddress ?? null,
                userId: userId ?? null,
            },
        });
    } catch (auditError) {
        console.error('Audit log write failed:', auditError);
    }

    return result;
}
