'use server';

import { auth } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { cache } from 'react';

/**
 * Verify that the current user has one of the allowed roles.
 * Throws an error if not authenticated or not authorized.
 * Returns the user's id, role, and name for use in server actions.
 */
export async function verifyRole(allowedRoles: UserRole[]) {
    const session = await auth();

    if (!session?.user?.id) {
        throw new Error('UNAUTHORIZED: غير مصرح — يجب تسجيل الدخول');
    }

    const userRole = session.user.role as UserRole;

    if (!allowedRoles.includes(userRole)) {
        throw new Error(`FORBIDDEN: صلاحية '${userRole}' غير كافية لهذا الإجراء`);
    }

    return {
        userId: session.user.id,
        role: userRole,
        name: session.user.name || '',
        tenantId: (session.user as any).tenantId,
    };
}

/**
 * Get the current authenticated user's info without role checking.
 * Memoized per request via React.cache to avoid repeated auth() calls.
 */
export const getCurrentUser = cache(async () => {
    const session = await auth();

    if (!session?.user?.id) {
        return null;
    }

    return {
        userId: session.user.id,
        role: session.user.role as UserRole,
        name: session.user.name || '',
        tenantId: (session.user as any).tenantId as string | undefined,
        branchId: (session.user as any).branchId as string | undefined,
    };
});
