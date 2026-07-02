import { cache } from 'react';

/**
 * Interface representing the basic information about the current tenant
 */
export interface TenantContext {
    id: string;
    slug: string;
    isActive: boolean;
}

/**
 * The resolved isolation scope for the current request. The Prisma extension
 * uses this to decide between three behaviours — see getTenantScope().
 */
export type TenantScope =
    // An authenticated tenant user whose tenant resolved successfully.
    // Carries multiBranchEnabled so branch-filter helpers don't need a second
    // Tenant query per request.
    | ({ kind: 'tenant'; multiBranchEnabled: boolean } & TenantContext)
    // No tenant claim to enforce: an unauthenticated/public request, a
    // SUPER_ADMIN (tenantId = null → sees all tenants), or a system context
    // with no Next.js request (seed scripts, cron, build). No injection.
    | { kind: 'unscoped' }
    // A session DID carry a tenantId claim but the tenant could not be
    // resolved (record gone, or a non-transient DB error). This is an anomaly:
    // the extension FAILS CLOSED instead of returning every tenant's rows.
    | { kind: 'denied' };

/**
 * Resolves the isolation scope for the current request — memoized per request
 * via React.cache. Called on every Prisma query via the extension, so caching
 * is critical for performance.
 *
 * SECURITY (fail-closed): historically a `null` context meant "no injection",
 * so if an authenticated tenant user's context failed to resolve the query
 * returned EVERY tenant's rows (fail-open). We now distinguish the three cases
 * above; only `unscoped` skips injection. A tenant claim that fails to resolve
 * is `denied`, never silently unscoped. (PRELAUNCH-AUDIT أ-1 P0)
 */
export const getTenantScope = cache(async (): Promise<TenantScope> => {
    // NOTE: a client-supplied x-tenant-id header is intentionally NOT trusted
    // (the middleware strips it — VULN-15 fix). Tenant resolution is done
    // exclusively via the session JWT below (works on localhost / single-domain).
    let sessionTenantId: string | undefined;
    try {
        const { auth } = await import('@/lib/auth');
        const session = await auth();
        // @ts-ignore
        sessionTenantId = session?.user?.tenantId as string | undefined;
    } catch {
        // No Next.js request context (background jobs, seed scripts, build) —
        // there is no tenant claim to enforce, so this is a system/unscoped run.
        return { kind: 'unscoped' };
    }

    // No tenant claim → public request or SUPER_ADMIN (tenantId = null). These
    // legitimately operate without tenant injection.
    if (!sessionTenantId) return { kind: 'unscoped' };

    // A tenant claim exists: it MUST resolve, otherwise fail closed. The tenant
    // lookup goes through the extended client (withRetry) so transient Neon
    // drops are retried before we reach a hard "denied".
    try {
        const { prisma: prismaClient } = await import('@/lib/prisma');
        const tenant = await prismaClient.tenant.findUnique({
            where: { id: sessionTenantId },
            select: { id: true, slug: true, isActive: true, multiBranchEnabled: true },
        });
        if (!tenant) return { kind: 'denied' };
        return {
            kind: 'tenant',
            id: tenant.id,
            slug: tenant.slug,
            isActive: tenant.isActive,
            multiBranchEnabled: tenant.multiBranchEnabled,
        };
    } catch {
        return { kind: 'denied' };
    }
});

/**
 * Gets the current tenant info — memoized per request via React.cache.
 * Returns null when there is no resolved tenant (public/superadmin/system, or
 * a denied anomaly). Existing callers keep their previous behaviour; the
 * fail-closed handling for `denied` lives in the Prisma extension.
 */
export const getTenantContext = cache(async (): Promise<TenantContext | null> => {
    const scope = await getTenantScope();
    return scope.kind === 'tenant'
        ? { id: scope.id, slug: scope.slug, isActive: scope.isActive }
        : null;
});

/**
 * Force gets current tenant, throwing an error if none exists.
 */
export async function requireTenantContext(): Promise<TenantContext> {
    const context = await getTenantContext();
    if (!context) {
        throw new Error('Tenant context is required but was not found in headers.');
    }
    return context;
}
