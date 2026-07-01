# Feature Specification: Plan Enforcement, Multi-Branch & Cashier Auto-Sync

**Feature Branch**: `002-plan-enforcement-branches`
**Created**: 2026-03-15
**Status**: Draft

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Plan Limits Actually Enforced (Priority: P1)

A restaurant on TRIAL plan tries to create an 11th menu item. Instead of succeeding silently, the system blocks the action and shows a clear upgrade prompt explaining that the TRIAL plan allows a maximum of 10 menu items.

**Why this priority**: Without enforcement the plan tiers are purely cosmetic — this is the core value of the subscription system.

**Independent Test**: On a TRIAL tenant, create 10 menu items, then attempt to create an 11th. The system should reject with an upgrade message.

**Acceptance Scenarios**:

1. **Given** a TRIAL tenant with 10 menu items, **When** an admin attempts to add another item, **Then** the server action returns an error and the client shows "هذه الميزة محدودة في خطة TRIAL — الحد الأقصى 10 عناصر" with an "ترقية الخطة" button.
2. **Given** a TRIAL tenant that has placed 50 orders this month, **When** a cashier/captain tries to create order #51, **Then** the order is rejected with a message explaining the monthly limit.
3. **Given** a BASIC tenant with 8 staff accounts, **When** an admin tries to create a 9th, **Then** the system blocks it with an upgrade prompt.
4. **Given** a TRIAL tenant, **When** the dashboard sidebar is rendered, **Then** Delivery, Inventory, Loyalty, Reports nav links appear greyed-out with a lock icon.
5. **Given** a PRO tenant, **When** the dashboard sidebar is rendered, **Then** all modules except Enterprise-only features are accessible.

---

### User Story 2 - Cashier Auto-Syncs to Service Mode (Priority: P2)

A restaurant configured as QUICK_SERVICE opens the cashier page and sees only the "طلب مباشر" (POS) tab. A TABLE_SERVICE restaurant sees only "حسابات الطاولات". No manual toggle is needed.

**Why this priority**: Currently both tabs always show causing confusion; this is a simple high-impact UX fix.

**Independent Test**: Set a tenant's serviceMode to QUICK_SERVICE, open `/cashier` — only the POS tab should be visible. Change to TABLE_SERVICE, reload — only the table bills tab should be visible.

**Acceptance Scenarios**:

1. **Given** serviceMode = QUICK_SERVICE, **When** cashier opens `/cashier`, **Then** only "طلب مباشر" tab is visible; table bills tab does not render.
2. **Given** serviceMode = TABLE_SERVICE, **When** cashier opens `/cashier`, **Then** only "حسابات الطاولات" tab is visible; POS tab does not render.
3. **Given** a multi-branch ENTERPRISE restaurant with Branch A = QUICK_SERVICE and Branch B = TABLE_SERVICE, **When** cashier selects Branch A, **Then** only POS tab shows; switching to Branch B shows only table bills.

---

### User Story 3 - Multi-Branch Management (Priority: P3)

An ENTERPRISE restaurant admin creates a second branch "فرع المنصور", assigns staff to it, and operational staff (kitchen, cashier, waiter) can select their active branch so that orders and tables are filtered accordingly.

**Why this priority**: ENTERPRISE feature; foundational data model change required before UI.

**Independent Test**: Enable multi-branch for an ENTERPRISE tenant, create 2 branches, create an order in Branch A, open kitchen in Branch B — Branch B kitchen should NOT show Branch A orders.

**Acceptance Scenarios**:

1. **Given** an ENTERPRISE tenant, **When** Super Admin enables multi-branch from the tenant detail page, **Then** the restaurant admin can access `/dashboard/settings/branches`.
2. **Given** multi-branch is enabled, **When** admin creates a second branch with name, address, phone, serviceMode, **Then** it appears in the branch list and staff can be assigned to it.
3. **Given** two active branches, **When** a kitchen staff member selects Branch A, **Then** only orders tagged with Branch A appear in the kitchen display.
4. **Given** a TRIAL/BASIC/PRO tenant, **When** they attempt to access `/dashboard/settings/branches`, **Then** they see an upgrade prompt explaining this is an ENTERPRISE feature.

---

### Edge Cases

- What happens when a TRIAL tenant's monthly order count resets? (Count resets at the start of each calendar month.)
- What if a tenant is downgraded from PRO to BASIC while Delivery module orders are in-flight? (Existing orders complete; new delivery orders blocked until plan upgraded.)
- What if multi-branch is disabled on an ENTERPRISE tenant that already has 3 branches? (Existing data is preserved; operational screens fall back to main branch only.)
- What if a branch's serviceMode differs from the tenant-level serviceMode? (Branch-level serviceMode takes priority when multi-branch is active.)

---

## Requirements *(mandatory)*

### Feature 1: Plan Feature Enforcement

**FR-1.1** — A central plan-limits configuration defines, per plan (TRIAL/BASIC/PRO/ENTERPRISE): max orders per month, max menu items, max staff accounts, and a set of enabled modules (delivery, inventory, loyalty, QR menu, offers, reservations, advanced reports, custom branding, multi-branch).

**FR-1.2** — Every server action that creates a menu item must check the tenant's current item count against the plan limit before inserting; TRIAL allows max 10.

**FR-1.3** — Every server action that creates an order (POS, captain, cashier) must check monthly order count; TRIAL allows max 50/month.

**FR-1.4** — Every server action that creates a staff account must check total staff count; TRIAL ≤ 3, BASIC ≤ 8, PRO ≤ 20, ENTERPRISE unlimited.

**FR-1.5** — Server actions for Delivery, Inventory, Loyalty, QR Menu, Offers/Discounts, and Advanced Reports must verify plan eligibility before executing.

**FR-1.6** — When a plan limit is exceeded, the server action throws a structured error with a human-readable Arabic message and an `upgradeRequired: true` flag.

**FR-1.7** — A reusable `<UpgradePrompt>` client component accepts a feature name and required plan, displaying a lock icon, Arabic description, and a link to `/dashboard/billing`.

**FR-1.8** — The dashboard sidebar renders locked nav items with a lock icon and muted styling for plans that do not include those modules.

**FR-1.9** — Plan limits are read from the `PlatformSettings` singleton (already in DB) so the super admin can adjust them without a code deploy.

### Feature 2: Multi-Branch Support

**FR-2.1** — A new `Branch` model is added to the schema with fields: `id`, `tenantId`, `name`, `address`, `phone`, `isActive`, `serviceMode` (TABLE_SERVICE | QUICK_SERVICE), `isMainBranch`, `createdAt`.

**FR-2.2** — The `Order`, `Table`, and `User` models gain an optional `branchId` foreign key referencing `Branch`.

**FR-2.3** — The `Tenant` model gains a boolean `multiBranchEnabled` flag (default false).

**FR-2.4** — Super Admin can toggle `multiBranchEnabled` for any ENTERPRISE tenant from the tenant detail page.

**FR-2.5** — When multi-branch is enabled, the restaurant admin can CRUD branches at `/dashboard/settings/branches`.

**FR-2.6** — All operational pages (kitchen, cashier, waiter, captain) show a branch selector when multi-branch is active; selected branch is stored in a session cookie or React context.

**FR-2.7** — Orders, tables, and kitchen tickets are filtered by the selected branch when multi-branch is active.

**FR-2.8** — A non-ENTERPRISE tenant attempting branch management sees an `<UpgradePrompt>` for ENTERPRISE plan.

**FR-2.9** — On initial multi-branch enable, the system auto-creates one "main branch" record using the existing tenant name and settings.

### Feature 3: Cashier Auto-Sync with Service Mode

**FR-3.1** — The cashier layout reads the effective `serviceMode` (branch-level if multi-branch active, otherwise tenant-level).

**FR-3.2** — When `serviceMode = QUICK_SERVICE`, only the "طلب مباشر" POS tab renders; the table bills tab is completely absent from the DOM.

**FR-3.3** — When `serviceMode = TABLE_SERVICE`, only the "حسابات الطاولات" tab renders; the POS tab is completely absent.

**FR-3.4** — The `ready-orders-list` component respects the same service mode filtering.

**FR-3.5** — When multi-branch is active and the cashier switches branches, the visible tab updates to match the new branch's serviceMode without a full page reload.

---

## Key Entities

### PlanLimits (configuration object, not a DB model)
- `maxOrdersPerMonth`: number | null (null = unlimited)
- `maxMenuItems`: number | null
- `maxStaffAccounts`: number | null
- `modules`: set of enabled feature flags

### Branch
- `id`: string (cuid)
- `tenantId`: string (FK → Tenant)
- `name`: string
- `address`: string?
- `phone`: string?
- `isActive`: boolean (default true)
- `serviceMode`: ServiceMode enum
- `isMainBranch`: boolean (default false)
- `createdAt`: DateTime

### Modified: Order
- `branchId`: string? (FK → Branch, optional)

### Modified: Table
- `branchId`: string? (FK → Branch, optional)

### Modified: User
- `branchId`: string? (FK → Branch, optional)

### Modified: Tenant
- `multiBranchEnabled`: boolean (default false)

---

## Success Criteria

1. A TRIAL tenant cannot exceed 10 menu items, 50 monthly orders, or 3 staff accounts — all blocked server-side with no client workaround possible.
2. Locked module pages and nav items are visually distinct (lock icon, muted color) for plans that don't include them.
3. A cashier on a QUICK_SERVICE restaurant sees exactly one tab; a TABLE_SERVICE restaurant cashier sees exactly one tab — no tab selector visible.
4. An ENTERPRISE tenant with multi-branch enabled can create, edit, and deactivate branches; operational screens filter data per branch.
5. Non-ENTERPRISE tenants see an upgrade prompt — not an error page — when accessing multi-branch features.
6. All plan enforcement checks run server-side; bypassing the UI does not circumvent limits.
7. Branch selector in operational screens persists across page refreshes within the same session.

---

## Assumptions

- The existing `serviceMode` field on `Tenant` remains the source of truth for single-branch tenants.
- Plan pricing and feature flags stored in `PlatformSettings` are already in the DB (added in feature 001).
- `ENTERPRISE` plan pricing and feature set are not changed by this feature — only enforcement is added.
- Monthly order count uses calendar month boundaries (UTC).
- Staff "accounts" means active (non-deleted) users with roles other than CUSTOMER.
- The QR public menu at `/menu/[slug]` is blocked at the route level for non-PRO+ tenants.
