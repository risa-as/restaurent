/**
 * Asserts that tenantId is a non-empty string.
 * Throws UNAUTHORIZED if it is null, undefined, or empty.
 *
 * Usage:
 *   const { tenantId } = await verifyRole([...]);
 *   requireTenantId(tenantId);
 *   // tenantId is now guaranteed to be string
 */
export function requireTenantId(tenantId: string | undefined | null): asserts tenantId is string {
    if (!tenantId) {
        throw new Error('UNAUTHORIZED: no tenant context');
    }
}
