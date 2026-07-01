# Tasks: Plan Enforcement, Multi-Branch & Cashier Auto-Sync

**Input**: Design documents from `/specs/002-plan-enforcement-branches/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, quickstart.md ✓

**Tests**: Manual verification only (no automated tests requested).

**Organization**: Tasks grouped by user story for independent implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Exact file paths included in all descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Schema changes — foundational DB work required by all three user stories.

- [X] T001 Add `Branch` model to `prisma/schema.prisma` with fields: id, tenantId, name, address, phone, isActive, serviceMode, isMainBranch, createdAt + Tenant relation + @@index([tenantId])
- [X] T002 Add `multiBranchEnabled Boolean @default(false)` field and `branches Branch[]` relation to `Tenant` model in `prisma/schema.prisma`
- [X] T003 Add nullable `branchId String?` field and `branch Branch? @relation(...)` to `Order` model in `prisma/schema.prisma`
- [X] T004 Add nullable `branchId String?` field and `branch Branch? @relation(...)` to `Table` model in `prisma/schema.prisma`
- [X] T005 Add nullable `branchId String?` field and `branch Branch? @relation(...)` to `User` model in `prisma/schema.prisma`
- [X] T006 Run `npx prisma db push` to apply schema changes to the database
- [X] T007 Run `npx prisma generate` to regenerate the Prisma client with new types

**Checkpoint**: Schema ready — all models have Branch relation and multiBranchEnabled field.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core library that all plan-enforcement tasks depend on.

- [X] T008 Create `src/lib/plan-limits.ts` with: `PlanLimits` interface, `PLAN_LIMITS` constant for TRIAL/BASIC/PRO/ENTERPRISE, `getPlanLimits(plan: PlanType)` function, `PlanLimitError` class with `upgradeRequired: true` property
- [X] T009 Add `getTenantPlan(tenantId: string)` to `src/lib/plan-limits.ts` — queries `prisma.tenant.findUnique({ select: { plan: true } })` and returns PlanType
- [X] T010 Add `checkPlanModule(tenantId: string, module: keyof PlanLimits['modules'])` to `src/lib/plan-limits.ts` — throws PlanLimitError if module disabled for tenant's plan
- [X] T011 Add `checkPlanCount(tenantId: string, type: 'menuItem' | 'staff' | 'monthlyOrder')` to `src/lib/plan-limits.ts` — queries current count, throws PlanLimitError with Arabic message if limit reached
- [X] T012 Create `src/components/plan/plan-upgrade-prompt.tsx` — Client Component with Card layout, Lock icon from lucide-react, Arabic message (e.g. "هذه الميزة متاحة في خطة PRO أو أعلى"), and Button linking to `/dashboard/billing`; props: `feature: string`, `requiredPlan: string`, `description?: string`

**Checkpoint**: Plan limits library and upgrade prompt component ready.

---

## Phase 3: User Story 1 — Plan Limits Enforced (Priority: P1) 🎯 MVP

**Goal**: Server-side plan enforcement across all restricted operations + locked sidebar nav items.

**Independent Test**: On a TRIAL tenant, create 10 menu items then attempt to create #11 — server action must reject with upgrade error shown via PlanUpgradePrompt.

- [X] T013 [US1] Modify `src/lib/actions/menu.ts` — in `createMenuItem` (or equivalent add-item action), call `await checkPlanCount(tenantId, 'menuItem')` before the `prisma.menuItem.create(...)` call; catch PlanLimitError and re-throw as user-facing error
- [X] T014 [US1] Modify `src/lib/actions/admin.ts` — in the staff creation action, call `await checkPlanCount(tenantId, 'staff')` before `prisma.user.create(...)`; catch and re-throw PlanLimitError
- [X] T015 [US1] Modify `src/lib/actions/pos.ts` — in the order creation action, call `await checkPlanCount(tenantId, 'monthlyOrder')` before creating the order; catch and re-throw PlanLimitError
- [X] T016 [US1] Modify `src/lib/actions/captain.ts` — in the order creation action, add same `checkPlanCount(tenantId, 'monthlyOrder')` call as T015 (reuse helper)
- [X] T017 [P] [US1] Modify `src/lib/actions/delivery.ts` — add `await checkPlanModule(tenantId, 'delivery')` at the top of each mutating action (createDelivery, assignDriver, etc.); throw PlanLimitError for PRO/ENTERPRISE gate
- [X] T018 [P] [US1] Modify `src/lib/actions/inventory.ts` — add `await checkPlanModule(tenantId, 'inventory')` at the top of each mutating action; throw PlanLimitError for PRO/ENTERPRISE gate
- [X] T019 [P] [US1] Modify `src/lib/actions/kitchen.ts` — add `await checkPlanModule(tenantId, 'inventory')` at the top of recipe-related actions (createRecipe, updateRecipe); throw PlanLimitError
- [X] T020 [US1] Modify `src/components/layout/global-sidebar.tsx` — add `planModules?: Record<string, boolean>` to `GlobalSidebarProps` interface; for each nav link that maps to a module (delivery→'delivery', inventory→'inventory', etc.), render a `<Lock className="w-3 h-3 ml-auto text-muted-foreground" />` icon and apply `opacity-50 pointer-events-none` when the module is disabled
- [X] T021 [US1] Modify `src/app/dashboard/layout.tsx` — import `getPlanLimits` and `getTenantPlan`; fetch tenant plan via `await getTenantWithPlan()`; pass `planModules={planLimits.modules}` prop to `<GlobalSidebar />`
- [X] T022 [P] [US1] Add plan gate to `src/app/delivery/layout.tsx` — call `checkPlanModule` server-side; if module disabled, render `<PlanUpgradePrompt feature="التوصيل" requiredPlan="PRO" />` instead of children
- [X] T023 [P] [US1] Add plan gate to `src/app/inventory/layout.tsx` — same pattern as T022 for inventory module
- [X] T024 [P] [US1] Add plan gate to analytics pages in `src/app/dashboard/analytics/` — check `advancedReports` module; show `<PlanUpgradePrompt feature="التقارير المتقدمة" requiredPlan="PRO" />` for TRIAL/BASIC
- [X] T025 [US1] Add error boundary/toast handling in menu item creation UI — when server action throws PlanLimitError (catches `upgradeRequired: true`), display `<PlanUpgradePrompt>` inline in the menu page at `src/app/dashboard/menu/page.tsx` (or the relevant menu items component)

**Story 1 Complete**: Plan limits enforced server-side; locked modules show upgrade prompts; sidebar shows lock icons.

---

## Phase 4: User Story 2 — Cashier Auto-Sync with Service Mode (Priority: P2)

**Goal**: Cashier page shows exactly one tab matching the restaurant's serviceMode. No manual selection needed.

**Independent Test**: Set `serviceMode = QUICK_SERVICE` in DB for a tenant → open `/cashier` → only POS view renders; set `TABLE_SERVICE` → only table bills view renders.

- [X] T026 [US2] Modify `src/lib/actions/config.ts` — add `getEffectiveServiceMode(tenantId?: string): Promise<ServiceMode>` that: (1) checks if `tenant.multiBranchEnabled`, (2) if yes, reads the selected branch cookie (`selected_branch_id`) and returns that branch's `serviceMode`, (3) else returns `tenant.serviceMode`
- [X] T027 [US2] Modify `src/app/cashier/page.tsx` — replace the current `getRestaurantConfig()` call with `getEffectiveServiceMode()`; remove the existing if/else tab structure; render `<CashierView>` (POS) when QUICK_SERVICE, render `<PendingBillsView>` (table bills) when TABLE_SERVICE; no `<Tabs>` wrapper needed at all

**Story 2 Complete**: Cashier page is single-mode, automatically matching serviceMode.

---

## Phase 5: User Story 3 — Multi-Branch Support (Priority: P3)

**Goal**: ENTERPRISE tenants can create multiple branches; operational screens filter by selected branch.

**Independent Test**: Enable multi-branch on an ENTERPRISE tenant, create 2 branches, place an order for Branch A, open kitchen for Branch B — Branch B kitchen shows 0 orders from Branch A.

- [X] T028 [US3] Create `src/lib/actions/branches.ts` with server actions: `getBranches()` (returns all branches for tenant), `createBranch(data)` (ENTERPRISE check via checkPlanModule 'multiBranch', then creates), `updateBranch(id, data)`, `toggleBranchActive(id)`, `setSelectedBranch(branchId)` (sets cookie `selected_branch_id`)
- [X] T029 [US3] Modify `src/lib/actions/superadmin.ts` — add `toggleMultiBranch(tenantId: string)` action: flips `multiBranchEnabled`; when enabling, auto-creates a main branch with `isMainBranch: true` using the tenant's name; when disabling, leaves branch data intact
- [X] T030 [US3] Modify `src/app/superadmin/tenants/[id]/page.tsx` — add a "تفعيل المتعدد الأفرع" toggle switch in the tenant detail actions sidebar (ENTERPRISE tenants only); calls `toggleMultiBranch(tenantId)` server action
- [X] T031 [US3] Create `src/components/branch/branch-selector.tsx` — Client Component: dropdown (`<Select>`) listing active branches for the tenant; on change calls `setSelectedBranch(branchId)` server action then `router.refresh()`; shows current branch name; only renders when `multiBranchEnabled = true`
- [X] T032 [US3] Create `src/app/dashboard/settings/branches/page.tsx` — ENTERPRISE gate (PlanUpgradePrompt if not ENTERPRISE); lists branches with name/address/status; Add Branch form; Edit inline; Toggle active button; each card shows order count and staff count
- [X] T033 [US3] Modify `src/app/kitchen/layout.tsx` — when `multiBranchEnabled`, fetch branches and inject `<BranchSelector>` into the layout header; pass `selectedBranchId` as prop or via cookie read
- [X] T034 [US3] Modify `src/app/cashier/layout.tsx` — same BranchSelector injection as T033 when multi-branch active
- [X] T035 [US3] Modify kitchen data fetching in `src/lib/actions/kitchen.ts` — `getKitchenOrders()` reads `selected_branch_id` cookie; if set and `multiBranchEnabled`, add `branchId: selectedBranchId` to `where` clause
- [X] T036 [US3] Modify cashier data fetching — `getCashierOrders()` and `getPendingBills()` in `src/lib/actions/cashier.ts` — same branch filter pattern as T035
- [X] T037 [US3] Modify order creation in `src/lib/actions/pos.ts` and `src/lib/actions/captain.ts` — when creating a new order, include `branchId: selectedBranchId` (from cookie) if multi-branch enabled
- [X] T038 [US3] Modify table fetching in `src/lib/actions/tables.ts` — filter tables by `branchId` when multi-branch active and branch is selected
- [X] T039 [US3] Add branch management link to dashboard settings navigation — add "الأفرع" link in `src/app/dashboard/settings/` navigation (or settings page) pointing to `/dashboard/settings/branches`

**Story 3 Complete**: ENTERPRISE tenants can manage branches; all operational data is filtered per branch.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T040 [P] Add `getTenantWithPlan()` helper to `src/lib/tenant.ts` (or `src/lib/auth-guard.ts`) — returns `{ plan, multiBranchEnabled, serviceMode }` in a single DB query; used by layout.tsx to avoid multiple round-trips
- [X] T041 [P] Update `src/app/dashboard/menu/` menu-items page — display current item count vs plan limit (e.g., "7 / 10 عناصر") when on TRIAL plan
- [X] T042 [P] Update staff management page in `src/app/dashboard/admin/` — display current staff count vs plan limit for TRIAL/BASIC/PRO
- [X] T043 Add `selected_branch_id` cookie name constant to `src/lib/constants.ts` (create file if needed) — use this constant in all cookie read/write operations to avoid string duplication
- [X] T044 [P] Verify `src/app/dashboard/menu/offers/page.tsx` — add plan module check for `offers` (PRO+); show PlanUpgradePrompt for TRIAL/BASIC
- [X] T045 [P] Verify `src/app/menu/[slug]/` (QR public menu) — add plan check at route level; redirect or show "غير متاح" for non-PRO+ plans

---

## Dependencies

```
T001–T007 (Schema)
    └── T008–T012 (plan-limits lib + UpgradePrompt component)
            ├── T013–T025 (US1: Plan Enforcement) — can start after T012
            ├── T026–T027 (US2: Cashier Auto-Sync) — can start after T007 (no plan-limits needed)
            └── T028–T039 (US3: Multi-Branch) — can start after T007, T010 (checkPlanModule)
T040–T045 (Polish) — after all stories complete
```

### Parallel Opportunities per Phase

**Phase 3 (US1)** — after T012:
- T013, T014, T015+T016 can run in parallel (different action files)
- T017, T018, T019 can run fully in parallel
- T022, T023, T024 can run in parallel (different layout files)

**Phase 5 (US3)** — after T028:
- T033, T034 (layout injection) can run in parallel
- T035, T036, T037, T038 (data filtering) can run in parallel

---

## Implementation Strategy

**MVP Scope (P1 only — Stories 1 & 2)**:
1. Complete Phase 1 (schema) + Phase 2 (plan-limits lib)
2. Complete T013–T025 (plan enforcement)
3. Complete T026–T027 (cashier auto-sync — fastest win, 2 tasks)

**Full Delivery**:
4. Complete T028–T039 (multi-branch)
5. Complete T040–T045 (polish)

**Total Tasks**: 45
- Phase 1 (Setup): 7 tasks
- Phase 2 (Foundation): 5 tasks
- Phase 3 (US1 Plan Enforcement): 13 tasks
- Phase 4 (US2 Cashier Auto-Sync): 2 tasks
- Phase 5 (US3 Multi-Branch): 12 tasks
- Phase 6 (Polish): 6 tasks
