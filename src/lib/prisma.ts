import { PrismaClient } from '@prisma/client';
import { getTenantScope } from './tenant';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

/** إعادة المحاولة عند انقطاع اتصال Neon (P1017 / P1001) */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delayMs = 500): Promise<T> {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err: any) {
            const isConnectionError = err?.code === 'P1017' || err?.code === 'P1001';
            if (isConnectionError && attempt < retries) {
                console.warn(`[Prisma] Connection error (${err.code}), retrying attempt ${attempt}/${retries}...`);
                await new Promise(r => setTimeout(r, delayMs * attempt));
                continue;
            }
            throw err;
        }
    }
    throw new Error('Unreachable');
}

// Base prisma client
const basePrisma = globalForPrisma.prisma || new PrismaClient()

// Multi-tenant extended Prisma client
export const prisma = basePrisma.$extends({
    query: {
        $allModels: {
            async $allOperations({ model, operation, args, query }) {
                // Models that require tenant isolation — every model carrying a
                // real `tenantId` scalar column. Keeping this list complete is the
                // app-level isolation guarantee (see src/lib/rls/README.md): a model
                // omitted here falls back to MANUAL `where: { tenantId }` filtering
                // and a single forgotten filter leaks data across tenants.
                // NOTE: superadmin users have tenantId = null, so getTenantContext()
                // returns null for them → no injection → cross-tenant reads still work.
                const multitenantModels = [
                    // Core (original 9)
                    'User', 'Category', 'MenuItem', 'Table', 'Order',
                    'Reservation', 'RawMaterial', 'Supplier', 'Customer',
                    // Financial / operational models with a tenantId column
                    'Bill', 'Expense', 'DailyClose', 'ManualPayment', 'Offer',
                    'Branch', 'ModifierGroup', 'CashierShift', 'PurchaseOrder',
                    'InventoryBatch', 'TalabatConfig', 'KitchenStation', 'SeasonalMenu',
                    'CustomerFeedback', 'VoidRequest', 'SupplierPayment', 'AiUsageLog',
                    'SystemSetting', 'AuditLog',
                ];

                if (multitenantModels.includes(model)) {
                    let currentTenantId: string | null = null;
                    let scopeKind: 'tenant' | 'unscoped' | 'denied' = 'unscoped';

                    try {
                        // Resolve the isolation scope (works in SSR/Server Actions).
                        const scope = await getTenantScope();
                        scopeKind = scope.kind;
                        if (scope.kind === 'tenant') {
                            currentTenantId = scope.id;
                        }
                    } catch {
                        // Fails silently if used outside Next.js request context (e.g. background jobs, seed scripts)
                    }

                    // FAIL CLOSED: a request that carried a tenant claim but failed
                    // to resolve it must NOT fall through to an unfiltered query
                    // (which would return every tenant's rows). Reject it loudly.
                    // `unscoped` (public / superadmin / system) is unaffected.
                    if (scopeKind === 'denied') {
                        throw new Error(
                            `[tenant-isolation] Refused ${operation} on ${model}: tenant context could not be resolved for an authenticated tenant request.`
                        );
                    }

                    if (currentTenantId) {
                        // NOTE: a `SET LOCAL "app.tenant_id"` used to run here for RLS,
                        // but it executed as a standalone statement OUTSIDE the query's
                        // transaction (and on a pooled Neon connection) so it had NO
                        // effect — while adding a full DB round-trip per query (a major
                        // latency cost). Removed. App-level tenantId filtering below is
                        // the real isolation. See src/lib/rls/README.md for proper RLS.

                        // Inject tenantId into WHERE clauses.
                        // Includes aggregate/groupBy — financial reports use these and a
                        // missing tenantId there would leak another tenant's revenue totals.
                        if (['findUnique', 'findUniqueOrThrow', 'findFirst', 'findFirstOrThrow', 'findMany', 'update', 'updateMany', 'delete', 'deleteMany', 'count', 'aggregate', 'groupBy'].includes(operation)) {
                            (args as any).where = { ...(args as any).where, tenantId: currentTenantId };
                        }
                        // Inject tenantId into CREATE data
                        if (['create', 'createMany'].includes(operation)) {
                            if (Array.isArray((args as any).data)) {
                                (args as any).data = (args as any).data.map((d: any) => ({ ...d, tenantId: currentTenantId }));
                            } else {
                                (args as any).data = { ...(args as any).data, tenantId: currentTenantId };
                            }
                        }
                        // Inject tenantId into UPSERT
                        if (operation === 'upsert') {
                            (args as any).where = { ...(args as any).where, tenantId: currentTenantId };
                            (args as any).create = { ...(args as any).create, tenantId: currentTenantId };
                        }
                    }
                }

                // ── Retry on Neon connection drop ──────────────────────────────
                return withRetry(() => query(args));
            },
        },
    },
}) as unknown as PrismaClient; // Cast back to PrismaClient to maintain standard type compatibility

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma
