# Research: Plan Enforcement, Multi-Branch & Cashier Auto-Sync

**Feature Branch**: `002-plan-enforcement-branches`
**Date**: 2026-03-15

---

## Decision 1: Central Plan Limits Configuration

**Decision**: Store plan limits in a `src/lib/plan-limits.ts` static config file, with numeric caps overridable via `PlatformSettings` DB row (already exists).

**Rationale**: Static config for booleans (module on/off) is type-safe and refactor-friendly. Numeric caps (maxStaff, maxOrders) live in `PlatformSettings` so superadmin can tune without a deploy, matching the existing pattern (`pricingBasic`, `pricingPro`, etc.).

**Alternatives considered**:
- Full DB-driven feature flags table — overkill for this scale; adds a DB round-trip per request.
- Hardcoded constants only — not adjustable by superadmin.

---

## Decision 2: Server-Side Enforcement Pattern

**Decision**: Add a shared `checkPlanLimit(tenantId, feature)` helper in `src/lib/plan-limits.ts`. Each restricted server action calls this helper at the top. On failure it throws `{ message: string, upgradeRequired: true }` — already the pattern used by other actions.

**Rationale**: Centralizes logic, DRY, easy to test per-feature.

**Alternatives considered**:
- Middleware-level enforcement — cannot easily count records (menu items, orders); wrong layer.
- Per-action ad-hoc checks — duplicated logic across ~10 action files.

---

## Decision 3: Branch Context Propagation (Multi-Branch)

**Decision**: Use a React Context (`BranchContext`) + a cookie (`selected_branch_id`) for branch selection. The cookie is set by a Server Action; the React Context is initialized from a layout Server Component that reads the cookie.

**Rationale**: Cookie survives page refresh (FR-2.7: persists across refreshes). React Context provides branch data to all client children without prop-drilling. This mirrors the existing pattern where `tenantId` is on the session.

**Alternatives considered**:
- URL segment `/cashier/[branchId]` — would require all links to carry branchId; breaks deep links.
- localStorage — not available in Server Components for initial render.
- NextAuth session extension — too heavyweight; session requires re-login to change branch.

---

## Decision 4: Cashier Service Mode (Feature 3)

**Decision**: The existing `cashier/page.tsx` already has partial logic (`if (config.serviceMode === 'QUICK_SERVICE')`). We extend this to also handle the multi-branch case: read branch serviceMode when active, else fall back to tenant serviceMode. No tabs are rendered at all for the irrelevant mode.

**Rationale**: The page is a Server Component — mode detection is free at render time, no extra client-side JS needed.

**Alternatives considered**:
- Client-side tab hiding with CSS — the hidden tab's data still loads (wasted queries); does not meet "completely absent from DOM" requirement.
- Two separate routes `/cashier/pos` and `/cashier/bills` — breaks existing integrations and bookmarks.

---

## Decision 5: Upgrade Prompt Component

**Decision**: A single `<PlanUpgradePrompt feature="..." requiredPlan="PRO" />` Client Component using a `Card` layout with a `Lock` icon, Arabic message, and a link to `/dashboard/billing`. It is shown in two places: (a) instead of module content for locked pages, (b) as a sidebar badge on locked nav items.

**Rationale**: Reusable, consistent UX. Matches the existing design system (Card, Badge, Button from Radix/shadcn).

---

## Decision 6: Multi-Branch DB Migration

**Decision**: `prisma db push` (no formal migration file) to add the `Branch` model and nullable `branchId` FK on `Order`, `Table`, `User`. All FKs are nullable so existing rows are unaffected.

**Rationale**: Project already uses `db push` (not `migrate dev`). Nullable FKs ensure zero downtime for existing single-branch tenants.

---

## Decision 7: Plan Limits Source of Truth for Module Flags

**Decision**: Boolean module flags (deliveryEnabled, inventoryEnabled, etc.) are hardcoded in `plan-limits.ts` per plan, NOT stored in DB. Only numeric caps (maxStaff, maxMenuItems, maxOrdersPerMonth) can be overridden via PlatformSettings.

**Rationale**: Module on/off is a business-tier decision (what separates plans); it should not be freely editable by superadmin without a product decision. Numeric caps are operational tuning that may need adjustment.
