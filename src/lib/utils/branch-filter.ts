'use server';

import { prisma } from '@/lib/prisma';
import { getSelectedBranchId } from '@/lib/actions/branches';
import { auth } from '@/lib/auth';
import { cache } from 'react';
import { activeBranchOr } from '@/lib/utils/branch-where';

/**
 * Returns a Prisma `where` fragment for branch filtering.
 * - If tenant has multi-branch disabled → returns `{}` (no branch filter)
 * - For ADMIN → uses the cookie-selected branch
 * - For everyone else → uses their assigned branchId from the session JWT
 */
export async function getBranchFilter(tenantId: string): Promise<{ branchId: string } | {}> {
    const branchId = await getActiveBranchId(tenantId);
    return branchId ? { branchId } : {};
}

/**
 * Returns a Prisma `where` fragment for OPERATIONAL queries — day-to-day/staff
 * views of branch-scoped data (categories, menu items, recipes, tables, ...).
 * - A specific (active) branch selected → that branch only.
 * - "All branches" / single-branch mode → ACTIVE branches only, so a DISABLED
 *   branch's data stays out of operational views. Legacy NULL-branch rows are
 *   still included.
 * Do NOT use this for historical/report queries — a disabled branch's past
 * orders/bills must remain visible in financial reports.
 */
export async function getOperationalBranchWhere(tenantId: string): Promise<object> {
    const branchId = await getActiveBranchId(tenantId);
    return branchId ? { branchId } : activeBranchOr();
}

/**
 * Returns a Prisma `where` fragment for CashierShift branch filtering.
 * Same as getBranchFilter BUT when the main branch is selected it also includes
 * shifts where branchId IS NULL (shifts created before multi-branch was enabled).
 */
export async function getShiftBranchWhere(tenantId: string): Promise<object> {
    const branchId = await getActiveBranchId(tenantId);
    if (!branchId) return {};

    const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        select: { isMainBranch: true },
    });

    return branch?.isMainBranch
        ? { OR: [{ branchId }, { branchId: null }] }
        : { branchId };
}

/**
 * Resolves the branchId to assign when CREATING a record.
 * Order of preference:
 *   1. explicit value (e.g. a branch the admin picked in the form)
 *   2. the active branch (user's assigned branch / admin's cookie-selected branch)
 *   3. the tenant's main branch — every tenant is provisioned with one at creation,
 *      so records are never left with a NULL branchId (even single-branch tenants).
 *      This keeps the single → multi-branch upgrade migration-free.
 *   4. null — only if the tenant somehow has no main branch (legacy data).
 */
export async function resolveCreateBranchId(
    tenantId: string,
    explicit?: string | null,
): Promise<string | null> {
    if (explicit) return explicit;

    const active = await getActiveBranchId(tenantId);
    if (active) return active;

    const mainBranch = await prisma.branch.findFirst({
        where: { tenantId, isMainBranch: true },
        select: { id: true },
    });
    return mainBranch?.id ?? null;
}

/**
 * Returns the active branchId for the current user/context, or null if no filtering needed.
 * Memoized per request via React.cache to avoid repeated tenant + auth queries.
 */
export const getActiveBranchId = cache(async (tenantId: string): Promise<string | null> => {
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { multiBranchEnabled: true },
    });

    if (!tenant?.multiBranchEnabled) return null;

    const session = await auth();
    const role = session?.user?.role as string;

    // Only ADMIN can switch branches via cookie — everyone else uses their assigned branch
    if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
        return await getSelectedBranchId();
    }

    // MANAGER and all other roles: always filtered to their own assigned branch
    return (session?.user as any)?.branchId ?? null;
});
