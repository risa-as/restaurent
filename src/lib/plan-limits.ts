import { prisma } from '@/lib/prisma';
import { PlanType } from '@prisma/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PlanModules {
    delivery: boolean;
    inventory: boolean;
    loyalty: boolean;
    qrMenu: boolean;
    offers: boolean;
    reservations: boolean;
    advancedReports: boolean;
    customBranding: boolean;
    multiBranch: boolean;
    analytics: boolean;
}

export interface PlanLimits {
    maxOrdersPerMonth: number | null; // null = unlimited
    maxMenuItems: number | null;
    maxStaffAccounts: number | null;
    modules: PlanModules;
}

// ─── Plan Limits Config ───────────────────────────────────────────────────────

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
    TRIAL: {
        maxOrdersPerMonth: 50,
        maxMenuItems: 10,
        maxStaffAccounts: 3,
        modules: {
            delivery: false,
            inventory: false,
            loyalty: false,
            qrMenu: false,
            offers: false,
            reservations: false,
            advancedReports: false,
            customBranding: false,
            multiBranch: false,
            analytics: false,
        },
    },
    BASIC: {
        maxOrdersPerMonth: null,
        maxMenuItems: null,
        maxStaffAccounts: 8,
        modules: {
            delivery: false,
            inventory: false,
            loyalty: false,
            qrMenu: false,
            offers: true,
            reservations: true,
            advancedReports: false,
            customBranding: false,
            multiBranch: false,
            analytics: false,
        },
    },
    PRO: {
        maxOrdersPerMonth: null,
        maxMenuItems: null,
        maxStaffAccounts: 20,
        modules: {
            delivery: true,
            inventory: true,
            loyalty: true,
            qrMenu: true,
            offers: true,
            reservations: true,
            advancedReports: true,
            customBranding: false,
            multiBranch: false,
            analytics: true,
        },
    },
    ENTERPRISE: {
        maxOrdersPerMonth: null,
        maxMenuItems: null,
        maxStaffAccounts: null,
        modules: {
            delivery: true,
            inventory: true,
            loyalty: true,
            qrMenu: true,
            offers: true,
            reservations: true,
            advancedReports: true,
            customBranding: true,
            multiBranch: true,
            analytics: true,
        },
    },
};

// ─── Module Arabic Labels ────────────────────────────────────────────────────

const MODULE_REQUIRED_PLAN: Record<keyof PlanModules, PlanType> = {
    delivery: 'PRO',
    inventory: 'PRO',
    loyalty: 'PRO',
    qrMenu: 'PRO',
    offers: 'PRO',
    reservations: 'BASIC',
    advancedReports: 'PRO',
    customBranding: 'ENTERPRISE',
    multiBranch: 'ENTERPRISE',
    analytics: 'PRO',
};

export const PLAN_LABELS: Record<PlanType, string> = {
    TRIAL: 'التجريبية',
    BASIC: 'الأساسية',
    PRO: 'المتقدمة',
    ENTERPRISE: 'المؤسسات',
};

// ─── Error Class ─────────────────────────────────────────────────────────────

export class PlanLimitError extends Error {
    upgradeRequired = true;
    requiredPlan: PlanType;

    constructor(message: string, requiredPlan: PlanType = 'PRO') {
        super(message);
        this.name = 'PlanLimitError';
        this.requiredPlan = requiredPlan;
    }
}

// ─── DB-backed plan config cache ──────────────────────────────────────────────
// PLAN_LIMITS above is the built-in default/fallback. The superadmin can edit
// per-plan features/limits from the UI (PlanConfig table); those values are
// cached at module level so getPlanLimits() stays synchronous (no call-site
// changes). The cache is warmed by the async tenant helpers below and refreshed
// every 30s, and invalidated immediately after a superadmin edit.

let _planCache: Record<string, PlanLimits> | null = null;
let _planCacheAt = 0;
const PLAN_CACHE_TTL = 30_000;

export async function refreshPlanCache(force = false): Promise<void> {
    if (!force && _planCache && Date.now() - _planCacheAt < PLAN_CACHE_TTL) return;
    try {
        const rows = await prisma.planConfig.findMany();
        const merged: Record<string, PlanLimits> = {
            TRIAL: PLAN_LIMITS.TRIAL, BASIC: PLAN_LIMITS.BASIC, PRO: PLAN_LIMITS.PRO, ENTERPRISE: PLAN_LIMITS.ENTERPRISE,
        };
        for (const r of rows) {
            const base = PLAN_LIMITS[r.plan as PlanType] ?? PLAN_LIMITS.TRIAL;
            merged[r.plan] = {
                maxOrdersPerMonth: r.maxOrdersPerMonth,
                maxMenuItems: r.maxMenuItems,
                maxStaffAccounts: r.maxStaffAccounts,
                modules: { ...base.modules, ...((r.modules as Record<string, boolean>) ?? {}) },
            };
        }
        _planCache = merged;
        _planCacheAt = Date.now();
    } catch { /* DB unreachable — keep using the constant fallback */ }
}

export function invalidatePlanCache(): void {
    _planCache = null;
    _planCacheAt = 0;
}

// ─── Helper: Get plan limits (cache → constant fallback) ───────────────────────

export function getPlanLimits(plan: PlanType): PlanLimits {
    return _planCache?.[plan] ?? PLAN_LIMITS[plan] ?? PLAN_LIMITS.TRIAL;
}

// ─── Helper: Get tenant plan ──────────────────────────────────────────────────

export async function getTenantPlan(tenantId: string): Promise<PlanType> {
    await refreshPlanCache();
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { plan: true },
    });
    return (tenant?.plan as PlanType) ?? 'TRIAL';
}

// ─── Helper: Get tenant with plan and multi-branch flag ───────────────────────

export async function getTenantWithPlan(tenantId: string) {
    await refreshPlanCache();
    return prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { plan: true, multiBranchEnabled: true, serviceMode: true, featureOverrides: true },
    });
}

// ─── Helper: Effective limits (plan + per-tenant overrides) ───────────────────

/**
 * Plan limits with the tenant's per-tenant feature overrides applied on top.
 * `featureOverrides` is a JSON map like { delivery: true, multiBranch: false }.
 * Use this anywhere a tenant object is available so the superadmin can grant a
 * single restaurant a feature beyond its plan.
 */
export function getEffectiveLimits(
    tenant: { plan: PlanType; featureOverrides?: unknown } | null | undefined,
): PlanLimits {
    const base = getPlanLimits(tenant?.plan ?? 'TRIAL');
    const ov = tenant?.featureOverrides;
    if (!ov || typeof ov !== 'object' || Array.isArray(ov)) return base;
    return {
        ...base,
        modules: { ...base.modules, ...(ov as Partial<PlanModules>) },
    };
}

// ─── Check: Module access ─────────────────────────────────────────────────────

export async function checkPlanModule(
    tenantId: string,
    module: keyof PlanModules
): Promise<void> {
    await refreshPlanCache();
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { plan: true, featureOverrides: true },
    });
    const limits = getEffectiveLimits(tenant);

    if (!limits.modules[module]) {
        const requiredPlan = MODULE_REQUIRED_PLAN[module];
        const requiredLabel = PLAN_LABELS[requiredPlan];
        throw new PlanLimitError(
            `هذه الميزة متاحة في خطة ${requiredLabel} أو أعلى`,
            requiredPlan
        );
    }
}

// ─── Check: Numeric limits ────────────────────────────────────────────────────

export async function checkPlanCount(
    tenantId: string,
    type: 'menuItem' | 'staff' | 'monthlyOrder'
): Promise<void> {
    const plan = await getTenantPlan(tenantId);
    const limits = getPlanLimits(plan);

    if (type === 'menuItem') {
        if (limits.maxMenuItems === null) return;
        const count = await prisma.menuItem.count({
            where: { tenantId, isDeleted: false },
        });
        if (count >= limits.maxMenuItems) {
            throw new PlanLimitError(
                `لقد وصلت إلى الحد الأقصى لعناصر القائمة (${limits.maxMenuItems} عناصر) في خطة ${PLAN_LABELS[plan]}. يرجى الترقية للمزيد`,
                'BASIC'
            );
        }
    }

    if (type === 'staff') {
        if (limits.maxStaffAccounts === null) return;
        const count = await prisma.user.count({
            where: { tenantId, isDeleted: false, role: { not: 'SUPER_ADMIN' } },
        });
        if (count >= limits.maxStaffAccounts) {
            const nextPlan: PlanType = plan === 'TRIAL' ? 'BASIC' : plan === 'BASIC' ? 'PRO' : 'ENTERPRISE';
            throw new PlanLimitError(
                `لقد وصلت إلى الحد الأقصى للموظفين (${limits.maxStaffAccounts}) في خطة ${PLAN_LABELS[plan]}. يرجى الترقية للمزيد`,
                nextPlan
            );
        }
    }

    if (type === 'monthlyOrder') {
        if (limits.maxOrdersPerMonth === null) return;
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const count = await prisma.order.count({
            where: {
                tenantId,
                isDeleted: false,
                createdAt: { gte: startOfMonth },
            },
        });
        if (count >= limits.maxOrdersPerMonth) {
            throw new PlanLimitError(
                `لقد وصلت إلى الحد الأقصى للطلبات الشهرية (${limits.maxOrdersPerMonth} طلب) في خطة ${PLAN_LABELS[plan]}. يرجى الترقية للمزيد`,
                'BASIC'
            );
        }
    }
}
