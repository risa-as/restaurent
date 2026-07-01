# Tasks: System Audit, Billing Integration & Complete Visual Redesign

**Branch**: `003-audit-billing-redesign`
**Input**: Design documents from `specs/003-audit-billing-redesign/`
**Prerequisites**: plan.md ✓ | spec.md ✓ | research.md ✓ | data-model.md ✓ | contracts/ ✓

---

## Phase 1: Setup (Schema Migrations)

**Purpose**: Database schema changes that block ALL user stories. Must complete first.

**⚠️ CRITICAL**: No feature work can begin until schema migrations are applied.

- [X] T001 Add `tenantId` (nullable String) + index to `Bill` model in `prisma/schema.prisma`
- [X] T002 Add `tenantId` (nullable String) + index to `DailyClose` model in `prisma/schema.prisma`
- [X] T003 Add `tenantId` (nullable String) + index to `Expense` model in `prisma/schema.prisma`
- [X] T004 Add `tenantId` (nullable String) + index to `Offer` model in `prisma/schema.prisma`
- [X] T005 Add `invoiceNumber Int? @unique`, `usdAmount Float?`, `periodFrom DateTime?`, `periodTo DateTime?` to `ManualPayment` model in `prisma/schema.prisma`
- [X] T006 Add `bankIban String @default("")` and `usdToIqdRate Int @default(1310)` to `PlatformSettings` model in `prisma/schema.prisma`
- [X] T007 Replace `@@unique([date])` with `@@unique([tenantId, date])` on `DailyClose` in `prisma/schema.prisma`
- [X] T008 Add `Tenant` relations for new Bill/DailyClose/Expense/Offer back-relations in `prisma/schema.prisma`
- [X] T009 Run `npx prisma migrate dev --name "add-tenant-isolation-and-billing-fields"` and verify migration succeeds
- [X] T010 Run `npx prisma generate` to update Prisma client types

**Checkpoint**: Schema is migrated. `npx prisma studio` shows new columns on all affected tables.

---

## Phase 2: Foundational (Blocking Utilities)

**Purpose**: Shared utilities and auth patterns that ALL user stories depend on.

**⚠️ CRITICAL**: Blocks Phase 3 (US1) and Phase 4 (US2).

- [X] T011 Create `src/lib/utils/branch-filter.ts` — exports `getBranchFilter(tenantId: string): Promise<{branchId: string} | {}>` per contracts/server-actions.md
- [X] T012 Create `src/lib/utils/require-tenant.ts` — exports `requireTenantId(tenantId: string | undefined): asserts tenantId is string` that throws `'UNAUTHORIZED: no tenant context'` if null/undefined

**Checkpoint**: Both utilities exist and TypeScript compiles without errors.

---

## Phase 3: US1 — Tenant & Branch Isolation (Priority: P1) 🎯 MVP

**Goal**: Every server action is tenant-scoped with hard fail on missing tenantId. Branch filter is centralized and applied uniformly across all operational screens.

**Independent Test**: Run Scenario 1 and Scenario 2 from quickstart.md — zero cross-tenant or cross-branch data visible on any screen.

### Implementation for US1

- [X] T013 [US1] Fix `src/lib/actions/finance.ts` — replace all `...(tenantId ? { tenantId } : {})` patterns with `requireTenantId(tenantId)` then `{ tenantId }` (affects ~8 queries including getFinanceSummary, getDailyReports, getExpenses)
- [X] T014 [US1] Fix `src/lib/actions/reports.ts` — apply `requireTenantId` guard and hard tenantId filter on all queries
- [X] T015 [US1] Fix `src/lib/actions/inventory.ts` — apply `requireTenantId` guard and hard tenantId filter on all `prisma.rawMaterial`, `prisma.supplier`, `prisma.inventoryTransaction` queries
- [X] T016 [US1] Fix `src/lib/actions/tables.ts` — apply `requireTenantId` + `getBranchFilter` for table queries
- [X] T017 [US1] Fix `src/lib/actions/waiter.ts` — apply `requireTenantId` + `getBranchFilter` for `getReadyOrders` and `getDirtyTables`
- [X] T018 [US1] Fix `src/lib/actions/captain.ts` — apply `requireTenantId` + `getBranchFilter` for menu and table queries
- [X] T019 [US1] Fix `src/lib/actions/kitchen.ts` — replace inline branch filter logic with `getBranchFilter(tenantId)` utility
- [X] T020 [US1] Fix `src/lib/actions/menu.ts` — apply `requireTenantId` on all category/menuItem queries; add `tenantId` filter to `Offer` queries
- [X] T021 [US1] Fix `src/lib/actions/admin.ts` — apply `requireTenantId` on staff management queries (user creation limit check must be tenant-scoped)
- [X] T022 [US1] Backfill `Bill.tenantId` via Prisma migration seed: update all existing Bills from their `Order.tenantId` in `prisma/seed-tenant.ts` or a one-time migration script
- [X] T023 [US1] Fix `src/lib/actions/pos.ts` — apply `requireTenantId` on all POS order/item queries

**Checkpoint**: All server actions throw on missing tenantId. Two-tenant test (Scenario 1) passes — zero cross-tenant data.

---

## Phase 4: US2 — Order Flow Integrity & Financial Accuracy (Priority: P1)

**Goal**: Orders flow correctly through every status. Bill totals are recalculated at settlement time from actual order items. Daily close is tenant-scoped. No double-counting in finance reports.

**Independent Test**: Run Scenario 3 from quickstart.md — order with discounted item produces correct bill total, appears once in finance report, inventory decrements correctly.

### Implementation for US2

- [X] T024 [US2] Fix `src/lib/actions/cashier.ts` `settleBill` function — recalculate `finalAmount` from `orderItems` at settlement time (fetch items, apply active offers, set `Bill.amount = recalculated`) and pass `tenantId` when creating `Bill`
- [X] T025 [US2] Fix `src/lib/actions/order-completion.ts` — add `tenantId` guard; verify inventory deduction runs inside Prisma transaction (already uses tx, verify it's correct)
- [X] T026 [US2] Fix `src/lib/actions/finance.ts` `getDailyClose` / `createDailyClose` — pass `tenantId` when creating `DailyClose`; update `findFirst` to filter by `{ tenantId, date }` using the new composite unique
- [X] T027 [US2] Fix `src/lib/actions/finance.ts` `getFinanceSummary` — ensure aggregation uses `where: { tenantId, status: 'COMPLETED' }` with no double-counting (bills already use order relation, verify no duplicate sum)
- [X] T028 [US2] Fix `src/app/kitchen/categories/page.tsx` — wrap `prisma.category.findMany` and `prisma.menuItem.count` in `Promise.all`
- [X] T029 [US2] Fix `src/app/kitchen/recipes/page.tsx` — wrap independent queries in `Promise.all`
- [X] T030 [US2] Audit `src/app/dashboard/finance/page.tsx` (or equivalent) — replace any sequential `await` chains with `Promise.all` for independent queries
- [X] T031 [US2] Add Pusher trigger in `src/lib/actions/tables.ts` `markTableDirty` — emit `table-dirty` event on `tenant-${tenantId}-orders` channel so waiter screen auto-refreshes

**Checkpoint**: Scenario 3 from quickstart.md passes end-to-end. Bill total matches expected discounted value. Finance report shows amount exactly once.

---

## Phase 5: US3 — Restaurant Billing Page (Priority: P2)

**Goal**: Restaurant admin has a complete billing page showing plan info, days remaining, upgrade request form, payment history with invoice numbers, and bank transfer instructions from Super Admin.

**Independent Test**: Run Scenario 4 from quickstart.md — BASIC plan admin can view billing page, see bank details, submit upgrade request, and see PENDING status badge.

### Implementation for US3

- [X] T032 [US3] Update `src/lib/actions/billing.ts` `getBillingInfo` — add `pendingRequest` field (fetch ManualPayment where `tenantId` and `status=PENDING`, return first or null)
- [X] T033 [US3] Add `submitUpgradeRequest(plan, months)` server action to `src/lib/actions/billing.ts` — validates no existing PENDING request, creates ManualPayment with `status=PENDING`
- [X] T034 [US3] Update `src/app/dashboard/billing/page.tsx` — fetch `pendingRequest` from updated `getBillingInfo`, show "بانتظار الموافقة" badge when PENDING request exists, disable upgrade button while request is PENDING
- [X] T035 [US3] Update `src/components/billing/billing-info.tsx` — display `bankIban` and `usdToIqdRate`-converted amounts alongside IQD prices; show days-remaining countdown with color coding (red < 7 days, orange < 14 days, green otherwise)
- [X] T036 [US3] Update `src/components/billing/payment-submission-form.tsx` — replace raw payment form with upgrade request form (plan selector, months selector, submit) using `submitUpgradeRequest` action; show disabled state when PENDING request exists
- [X] T037 [US3] Update `src/components/billing/payment-history-table.tsx` — add `invoiceNumber` column (show "#INV-XXXX" or "—" if not yet assigned), add `periodFrom`/`periodTo` date range column, add IQD/USD dual display for amount
- [X] T038 [US3] Wire rejection reason display in `src/app/dashboard/billing/page.tsx` — if latest ManualPayment has `status=REJECTED`, show rejection reason (`adminNote`) in a visible alert box

**Checkpoint**: Scenario 4 from quickstart.md passes. Restaurant admin can view, request, and track upgrade through billing page.

---

## Phase 6: US4 — Super Admin Billing Management (Priority: P2)

**Goal**: Super Admin has a billing dashboard with MRR, expiring tenants list, and pending upgrade requests that can be approved/rejected in one click.

**Independent Test**: Run Scenario 5 and Scenario 6 from quickstart.md — MRR is correct, approval atomically updates plan+creates invoice, expiring tenants are highlighted.

### Implementation for US4

- [X] T039 [US4] Add `getSuperAdminBillingDashboard()` to `src/lib/actions/superadmin.ts` — returns MRR (sum of active plan prices from PlatformSettings), pending requests count, expiring tenants (currentPeriodEnd or trialEndsAt within 7 days), plan breakdown
- [X] T040 [US4] Add `approveUpgradeRequest(requestId)` to `src/lib/actions/superadmin.ts` — atomic Prisma transaction: assign invoiceNumber (MAX+1), set periodFrom/To, update ManualPayment status=APPROVED, update Tenant plan+currentPeriodEnd+subscriptionStatus=ACTIVE
- [X] T041 [US4] Add `rejectUpgradeRequest(requestId, reason)` to `src/lib/actions/superadmin.ts` — update ManualPayment status=REJECTED, adminNote=reason; validate reason non-empty
- [X] T042 [US4] Add `manuallyExtendTenant(tenantId, months)` to `src/lib/actions/superadmin.ts` — extends `currentPeriodEnd`, creates zero-amount APPROVED ManualPayment as audit record
- [X] T043 [US4] Update `updatePlatformSettings` in `src/lib/actions/superadmin.ts` — accept `bankIban` and `usdToIqdRate` fields in addition to existing fields
- [X] T044 [US4] Create `src/app/superadmin/billing/page.tsx` — server component fetching `getSuperAdminBillingDashboard()`, renders MRR stat, pending requests list, expiring tenants list
- [X] T045 [US4] Create `src/components/superadmin/billing-dashboard.tsx` — MRR card, plan breakdown table, expiring tenants section (red badge for ≤7 days), pending requests section
- [X] T046 [US4] Create `src/components/superadmin/upgrade-request-actions.tsx` — approve button (with confirm dialog) and reject button (with reason input), wired to T040/T041 actions
- [X] T047 [US4] Update `src/app/superadmin/payments/page.tsx` — integrate `upgrade-request-actions.tsx` for approve/reject on each pending ManualPayment
- [X] T048 [US4] Update Super Admin settings page — add `bankIban` and `usdToIqdRate` fields to platform settings form (in `src/app/superadmin/settings/page.tsx` or equivalent)
- [X] T049 [US4] Add `/superadmin/billing` link to Super Admin navigation (global sidebar or superadmin layout)

**Checkpoint**: Scenario 5 and 6 from quickstart.md pass. Super Admin can approve a request and verify tenant plan updates atomically.

---

## Phase 7: US5 — Complete Visual Redesign (Priority: P3)

**Goal**: Every screen looks modern, beautiful, and consistent. Shared design components are used everywhere. Empty states, trend indicators, touch targets, and real-time indicators are present on all relevant screens.

**Independent Test**: Run Scenario 7 from quickstart.md — walk every screen, all checklist items pass.

### Sub-phase 7A: Shared Design Components (blocks all redesign work)

- [X] T050 [US5] Create `src/components/ui/stat-card.tsx` — props: `label`, `value`, `trend?: {value: number, direction: 'up'|'down'|'neutral'}`, `icon?`; renders metric card with colored trend arrow
- [X] T051 [US5] Create `src/components/ui/empty-state.tsx` — props: `icon: LucideIcon`, `title: string`, `description: string`, `action?: {label, onClick}`; centered layout with icon, Arabic text
- [X] T052 [US5] Create `src/components/ui/status-badge.tsx` — maps status strings (PENDING/APPROVED/REJECTED/ACTIVE/TRIAL/PAST_DUE/READY/SERVED/DIRTY/AVAILABLE) to semantic Tailwind colors
- [X] T053 [US5] Create `src/components/ui/connection-dot.tsx` — props: `connected: boolean`; green pulsing dot + "مباشر" when true, gray + "غير متصل" when false
- [X] T054 [US5] Create `src/components/ui/page-header.tsx` — props: `title`, `subtitle?`, `actions?`, `breadcrumbs?[]`; consistent RTL page header with optional breadcrumb trail
- [X] T055 [US5] Create `src/components/ui/data-table.tsx` — generic sortable/filterable table wrapper using existing shadcn Table primitives; props: `columns[]`, `data[]`, `emptyState?`

### Sub-phase 7B: Auth Pages

- [X] T056 [P] [US5] Redesign `src/app/login/page.tsx` — split-screen RTL layout: right side = brand panel with logo + illustration (gradient bg, primary color), left side = clean Arabic login form; responsive (stacks on mobile)

### Sub-phase 7C: Operational Pages Redesign

- [X] T057 [P] [US5] Update `src/components/kitchen/kitchen-board.tsx` — add `<ConnectionDot>` in header, replace blank empty state with `<EmptyState icon=ChefHat title="لا توجد طلبات" description="ستظهر الطلبات الجديدة هنا تلقائياً" />`, ensure all order status labels use `<StatusBadge>`
- [X] T058 [P] [US5] Update `src/components/cashier/cashier-view.tsx` — add `<EmptyState>` when no active orders/tables, ensure all order type icons use consistent status color mapping
- [X] T059 [P] [US5] Update `src/components/captain/captain-order-form.tsx` — add `<ConnectionDot>` to header, add `<EmptyState>` for empty cart and empty menu states
- [X] T060 [P] [US5] Update `src/components/waiter/waiter-service-view.tsx` — add `<ConnectionDot>` showing Pusher connection state (track with useState from Pusher connection event)
- [X] T061 [P] [US5] Update `src/components/delivery/delivery-dashboard.tsx` — add `<EmptyState>` for no deliveries, replace manual status badges with `<StatusBadge>` component

### Sub-phase 7D: Dashboard Pages Redesign

- [X] T062 [P] [US5] Update `src/app/dashboard/page.tsx` — replace plain stat divs with `<StatCard>` components including trend indicators (compare current 7-day vs previous 7-day); use `<PageHeader>` for title
- [X] T063 [P] [US5] Update `src/app/dashboard/menu/page.tsx` (or menu listings) — add `<EmptyState>` for empty category/item lists, add `<PageHeader>` with breadcrumb
- [X] T064 [P] [US5] Update `src/app/dashboard/customers/page.tsx` — wrap customer list in `<DataTable>` with sorting by name/spend/visits; add `<EmptyState>`
- [X] T065 [P] [US5] Update `src/app/dashboard/reservations/page.tsx` — wrap reservation list in `<DataTable>`; add `<EmptyState>` for no reservations; use `<StatusBadge>` for reservation status
- [X] T066 [P] [US5] Update `src/app/dashboard/billing/page.tsx` — apply `<PageHeader>` + redesign layout using Card components with consistent `rounded-2xl shadow-sm p-6` pattern

### Sub-phase 7E: Super Admin Pages Redesign

- [X] T067 [P] [US5] Update `src/app/superadmin/page.tsx` — add `<StatCard>` components for total tenants, active tenants, MRR, pending requests; use `<PageHeader>`
- [X] T068 [P] [US5] Update `src/app/superadmin/tenants/page.tsx` — wrap tenant list in `<DataTable>` with status column using `<StatusBadge>`; add plan filter; add `<EmptyState>` for empty state
- [X] T069 [P] [US5] Verify `src/components/layout/global-sidebar.tsx` — ensure Super Admin routes render with distinct visual style (already uses different routes; verify no restaurant-only nav items appear for SUPER_ADMIN role)

**Checkpoint**: Scenario 7 from quickstart.md passes. All screens have consistent design, empty states, and appropriate interactive components.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T070 Add `/superadmin/billing` to navigation in `src/app/superadmin/layout.tsx` (or wherever superadmin nav is defined)
- [X] T071 Verify `src/middleware.ts` — confirm that tenant-suspended check redirects to `/suspended` page and expired check redirects to `/dashboard/billing` (or `/trial-expired`)
- [X] T072 Run `npx tsc --noEmit` — fix any TypeScript errors introduced by schema changes and new components
- [X] T073 Verify all pages in `src/app/` that have `force-dynamic` also have correct `tenantId` guards in their server component data fetching
- [ ] T074 Manual walkthrough of all 7 quickstart.md scenarios — document any failures and fix

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Schema)
  └─► Phase 2 (Utilities)
        └─► Phase 3 (US1: Tenant Isolation)   ← BLOCKS Phase 4
              └─► Phase 4 (US2: Order Flow)   ← Should complete P1 before P2
Phase 1 + Phase 2
  └─► Phase 5 (US3: Restaurant Billing)       ← Independent from US1/US2
  └─► Phase 6 (US4: Super Admin Billing)      ← Depends on Phase 5 actions
Phase 4 complete
  └─► Phase 7 (US5: Visual Redesign)          ← Sub-phases 7C/7D/7E can start after Phase 2
Phase 7 complete
  └─► Phase 8 (Polish)
```

### Parallel Opportunities

- **T001–T008**: All schema edits are in one file — do sequentially but fast
- **T013–T023**: Different action files — can parallelize across files
- **T024–T031**: Different files — can parallelize
- **T050–T055**: Different component files — all parallel
- **T056–T069**: All redesign tasks in different files — fully parallel within sub-phases

---

## Implementation Strategy

### MVP — P1 Stories Only (Phases 1–4)

1. Phase 1: Run schema migration *(~30 min)*
2. Phase 2: Create utilities *(~15 min)*
3. Phase 3: Fix all tenant isolation issues *(~2 hours)*
4. Phase 4: Fix order flow + financial accuracy *(~1.5 hours)*
5. **STOP & VALIDATE**: Run Scenarios 1–3 from quickstart.md

### Full Delivery — All Phases

After MVP validation:
6. Phase 5: Restaurant billing *(~2 hours)*
7. Phase 6: Super Admin billing *(~3 hours)*
8. Phase 7: Visual redesign *(~6 hours)*
9. Phase 8: Polish + TypeScript check *(~1 hour)*

---

## Progress Tracker

| Phase | Tasks | Done | Status |
|-------|-------|------|--------|
| Phase 1: Schema | T001–T010 | 10/10 | ✅ Complete |
| Phase 2: Utilities | T011–T012 | 2/2 | ✅ Complete |
| Phase 3: US1 Isolation | T013–T023 | 11/11 | ✅ Complete |
| Phase 4: US2 Order Flow | T024–T031 | 8/8 | ✅ Complete |
| Phase 5: US3 Restaurant Billing | T032–T038 | 7/7 | ✅ Complete |
| Phase 6: US4 Super Admin Billing | T039–T049 | 11/11 | ✅ Complete |
| Phase 7: US5 Visual Redesign | T050–T069 | 20/20 | ✅ Complete |
| Phase 8: Polish | T070–T074 | 4/5 | 🔄 In Progress |
| **Total** | **T001–T074** | **73/74** | 🔄 In Progress |
