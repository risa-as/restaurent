# Research: System Audit, Billing & Redesign

**Feature**: 003-audit-billing-redesign
**Date**: 2026-03-15

---

## Decision 1: Tenant Isolation Audit Strategy

**Decision**: Audit-and-fix approach — scan all `src/lib/actions/*.ts` for the dangerous `...(tenantId ? { tenantId } : {})` pattern and replace with hard-fail guards.

**Rationale**: The pattern `...(tenantId ? { tenantId } : {})` silently returns ALL tenants' data when `tenantId` is undefined or null. Since `verifyRole()` already returns `tenantId` from the session, actions should throw `UNAUTHORIZED` if `tenantId` is missing rather than executing a cross-tenant query. `getCurrentUser()` in `auth-guard.ts` returns `tenantId` as optional — callers must validate.

**Affected files identified**:
- `src/lib/actions/finance.ts` — uses `...(tenantId ? { tenantId } : {})` in 6+ queries
- `src/lib/actions/cashier.ts` — uses optional chaining pattern
- `src/lib/actions/menu.ts` — partial tenantId filtering
- `src/lib/actions/tables.ts` — needs audit
- `src/lib/actions/waiter.ts` — needs audit
- `src/lib/actions/captain.ts` — needs audit

**Fix pattern**:
```typescript
// BEFORE (dangerous — returns all tenants if tenantId undefined)
const { tenantId } = await verifyRole([...]);
const results = await prisma.X.findMany({ where: { ...(tenantId ? { tenantId } : {}) } });

// AFTER (safe — throws if no tenantId)
const { tenantId } = await verifyRole([...]);
if (!tenantId) throw new Error('UNAUTHORIZED: no tenant context');
const results = await prisma.X.findMany({ where: { tenantId } });
```

**Alternatives considered**: Row-level security in PostgreSQL — rejected because Neon serverless doesn't support it easily and the app already has session-based tenantId.

---

## Decision 2: Missing tenantId on Financial Models

**Decision**: Add `tenantId` migration to `Bill`, `DailyClose`, `Expense`, and `Offer` models. Also add `tenantId` to `InventoryTransaction` via `material.tenantId` join or direct field.

**Rationale**: Currently:
- `Bill` has no `tenantId` — it's only indirectly tenant-scoped via `Bill → Order → tenantId`. Any direct `prisma.bill.findMany()` call is cross-tenant.
- `DailyClose` has no `tenantId` — daily close reports could mix tenants.
- `Expense` has no `tenantId` — expenses are completely unscoped.
- `Offer` has no `tenantId` — offers visible across tenants.

**Migration**: Add nullable `tenantId String?` with index and relation to each model, then backfill via migration script using the parent relation.

**Alternatives considered**: Keep indirect join-based scoping — rejected because it requires multi-level joins on every query and is error-prone.

---

## Decision 3: Billing System — Existing vs. New

**Decision**: Extend existing `ManualPayment` model rather than creating a new `Invoice` model. Add `invoiceNumber` (sequential, auto-generated) and `iqdAmount` fields. Rename the concept to "Invoice" in the UI without schema rename.

**Rationale**: `ManualPayment` already serves as the payment/upgrade request record. It has: tenantId, amount, method, status (PENDING/APPROVED/REJECTED), plan, months, notes. Missing only: sequential invoice number, IQD equivalent, period dates (from/to). Adding these fields is minimal schema change.

**New fields on ManualPayment**:
- `invoiceNumber Int? @unique` — populated on approval (auto-increment via max+1)
- `iqdAmount Float?` — IQD equivalent at time of issuance
- `periodFrom DateTime?` — subscription start date
- `periodTo DateTime?` — subscription end date

**Existing billing page at `/dashboard/billing`** — already exists with payment submission form and history. Needs redesign to match new spec but logic is largely correct.

**Alternatives considered**: Separate `Invoice` model — rejected to avoid schema complexity and migration complexity. `ManualPayment` already covers the data needs.

---

## Decision 4: Branch Isolation Enforcement

**Decision**: Centralize branch filter resolution into a reusable `getBranchFilter(tenantId)` utility that returns `{ branchId: string } | {}` (empty only when multi-branch is disabled for tenant).

**Rationale**: Kitchen, cashier, waiter, captain each independently call `getSelectedBranchId()` and build branch filter. This is duplicated and error-prone. A shared utility ensures consistent behavior and a single fix point.

**Implementation**:
```typescript
// src/lib/utils/branch-filter.ts
export async function getBranchFilter(tenantId: string) {
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { multiBranchEnabled: true }
    });
    if (!tenant?.multiBranchEnabled) return {};
    const branchId = await getSelectedBranchId();
    return branchId ? { branchId } : {};
}
```

**Alternatives considered**: Middleware-based branch injection — rejected because operational pages use different rendering modes.

---

## Decision 5: Visual Redesign Strategy

**Decision**: Component-level redesign using existing shadcn/ui primitives + Tailwind. No new UI library. Establish a `design-tokens.ts` constants file and shared `PageHeader`, `StatCard`, `EmptyState`, `DataTable`, `StatusBadge` components.

**Rationale**: The project already uses shadcn/ui + Tailwind. Adding a new UI library (Mantine, Chakra, etc.) would require massive migration. Instead, create reusable wrapper components that encode the design system — consistent spacing, typography, color usage — and replace ad-hoc implementations across pages.

**Key new shared components**:
- `src/components/ui/page-header.tsx` — consistent h1 + breadcrumb + action button slot
- `src/components/ui/stat-card.tsx` — metric card with trend indicator
- `src/components/ui/empty-state.tsx` — icon + title + description + optional CTA
- `src/components/ui/data-table.tsx` — sortable, filterable table wrapper
- `src/components/ui/status-badge.tsx` — semantic color-coded badge
- `src/components/ui/connection-dot.tsx` — real-time pulsing indicator

**Alternatives considered**: Migrate to Mantine — rejected (too large, breaks existing components). Full CSS overhaul — rejected (risky, time-intensive, same result achievable with Tailwind).

---

## Decision 6: Performance — Promise.all Audit

**Decision**: Audit all server component pages for sequential `await` chains and replace with `Promise.all`. Target: zero pages with >2 sequential DB queries.

**Known sequential offenders** (from previous investigation):
- `/kitchen/categories` and `/kitchen/recipes` pages — query category then items sequentially
- `/dashboard/finance` — multiple sequential aggregate queries
- `/dashboard/customers` — potential N+1 on customer orders

**Fix pattern**: All independent queries (categories, config, counts) wrapped in `Promise.all`.

---

## Decision 7: Order Financial Accuracy

**Decision**: Verify bill total calculation in `cashier.ts` completeBill action. Confirm formula: `totalAmount = Σ(item.unitPrice × item.quantity) - discountAmount`.

**Finding**: `Order.totalAmount` is set at order creation time by the captain/pos. `Bill.amount` is set at bill settlement. These two values MUST match. Current risk: if an offer is applied after order creation but before billing, the Bill.amount may not reflect the discount.

**Fix**: The `completeBill` / `settleBill` action must recalculate from `orderItems` at settlement time, not trust `order.totalAmount` blindly.

---

## Decision 8: Super Admin Billing Dashboard

**Decision**: Create `/superadmin/billing` page with MRR calculation, expiry tracking, and upgrade request management. Reuse existing `ManualPayment` model with `status=PENDING` for pending requests.

**MRR Calculation**:
```typescript
const planPricing = { BASIC: settings.pricingBasic, PRO: settings.pricingPro, ENTERPRISE: settings.pricingEnterprise };
const mrr = activeTenants.reduce((sum, t) => sum + (planPricing[t.plan] || 0), 0);
```

**Expiry tracking**: Query `Tenant` where `currentPeriodEnd < now + 7 days` OR `trialEndsAt < now + 7 days`.

**Alternatives considered**: Stripe-based MRR — rejected because Iraqi market uses manual bank transfer, not Stripe. Stripe is present in the codebase but unused for billing.
