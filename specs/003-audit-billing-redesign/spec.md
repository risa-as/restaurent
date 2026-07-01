# Feature Specification: System Audit, Billing Integration & Complete Visual Redesign

**Feature Branch**: `003-audit-billing-redesign`
**Created**: 2026-03-15
**Status**: Draft

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — System Integrity: Tenant & Branch Isolation (Priority: P1)

A Super Admin wants to be confident that no restaurant can ever see another restaurant's data, and that within a multi-branch restaurant, each branch only sees its own orders, tables, and staff. A restaurant owner wants assurance that their data is private and accurate.

**Why this priority**: Data isolation is the foundation of any multi-tenant SaaS. All other features are worthless if tenant A can see tenant B's orders. This must be solved before any redesign or new features.

**Independent Test**: Create two separate tenants with orders. Confirm that logging in as Tenant A never surfaces Tenant B's orders, tables, staff, or financial records — in any screen, report, or API response.

**Acceptance Scenarios**:

1. **Given** two restaurants (Tenant A and Tenant B) both have active orders, **When** a staff member of Tenant A views the kitchen screen, **Then** only Tenant A's orders appear — zero orders from Tenant B.
2. **Given** a multi-branch ENTERPRISE restaurant with Branch 1 and Branch 2, **When** a cashier assigned to Branch 1 opens the cashier screen, **Then** only Branch 1's orders and tables are shown.
3. **Given** a BASIC plan restaurant (no multi-branch), **When** any staff member accesses any operational screen, **Then** the system operates as a single branch with no branch selector visible and no `branchId` filtering errors.
4. **Given** a staff member switches the branch selector to Branch 2, **When** they navigate to the kitchen screen, **Then** only Branch 2's pending orders are shown, and their branch selection persists on page refresh.

---

### User Story 2 — Order Flow Integrity & Financial Accuracy (Priority: P1)

A restaurant owner needs every order to flow reliably through its full lifecycle — from creation to payment — with no lost orders, no stuck statuses, and accurate bill amounts that match what was actually ordered.

**Why this priority**: Lost orders mean lost revenue and angry customers. Financial inaccuracies destroy trust. This is as critical as tenant isolation.

**Independent Test**: Create an order with 3 items including one with an active discount. Follow it through kitchen → ready → served → billed. Verify the final bill total is mathematically correct and the order does not appear in any "pending" list after completion.

**Acceptance Scenarios**:

1. **Given** a new order is created by the captain, **When** it is submitted, **Then** the kitchen screen shows it in real-time within 3 seconds without manual refresh.
2. **Given** the kitchen marks an order as READY, **When** the status changes, **Then** the waiter and captain screens show a notification within 3 seconds and play an alert sound.
3. **Given** an order contains an item with a 20% discount applied via an active offer, **When** the cashier views the bill, **Then** the displayed total equals (item price × quantity × 0.80) — never the full price.
4. **Given** a cashier completes (closes) a bill, **When** the daily finance report is viewed, **Then** that bill's amount appears exactly once — no duplication.
5. **Given** the inventory module is enabled and an order is completed, **When** the order is marked paid, **Then** the inventory quantities of all ordered items decrease by the correct amounts.
6. **Given** an order is in READY status, **When** 30 minutes pass with no action, **Then** the order remains in READY state with a visual "waiting" indicator — it is never silently dropped or auto-completed.

---

### User Story 3 — Restaurant Billing Page & Upgrade Request (Priority: P2)

A restaurant admin wants a clear billing page showing their current plan, subscription status, upcoming renewal, and the ability to request an upgrade — with full payment history and Iraqi bank transfer instructions.

**Why this priority**: Without a billing page, restaurants cannot self-service their subscription renewals, leading to service interruptions and manual Super Admin overhead.

**Independent Test**: Log in as a restaurant ADMIN. Navigate to the billing page. Verify it shows current plan details, days remaining, billing history, and bank transfer payment instructions. Submit an upgrade request and verify the request appears as PENDING.

**Acceptance Scenarios**:

1. **Given** a restaurant is on the BASIC plan expiring in 10 days, **When** the admin opens the billing page, **Then** they see: plan name (BASIC), renewal date, "10 days remaining" countdown, and a highlighted renewal CTA.
2. **Given** a restaurant admin clicks "Upgrade Plan", **When** they select PRO and submit the upgrade request form, **Then** a PENDING upgrade request is created and the admin sees a "Request submitted — awaiting approval" notice.
3. **Given** an upgrade request exists with PENDING status, **When** the admin returns to the billing page, **Then** they see a status badge showing "بانتظار الموافقة" (Awaiting Approval).
4. **Given** the Super Admin has configured bank transfer details, **When** any restaurant admin views their billing page, **Then** the exact bank name, account number, IBAN, and account holder name are displayed in the payment instructions section.
5. **Given** a restaurant has 3 past invoices, **When** the admin views the billing history table, **Then** all 3 invoices appear with: invoice number, date, plan, amount in USD and IQD, and status (PAID/PENDING/EXPIRED).

---

### User Story 4 — Super Admin Billing Management (Priority: P2)

The Super Admin needs a central billing dashboard to monitor all restaurants' subscription health, approve or reject upgrade requests, issue invoices manually, configure pricing, and manage payment details — all from a single interface.

**Why this priority**: Without Super Admin billing tools, the subscription business cannot operate. Renewals cannot be processed, revenue cannot be tracked, and payment instructions cannot be updated.

**Independent Test**: Log in as Super Admin. Open the billing dashboard and verify MRR is calculated, expiring tenants are highlighted, and a pending upgrade request can be approved in one action that automatically updates the tenant's plan and creates an invoice.

**Acceptance Scenarios**:

1. **Given** 5 restaurants are on paid plans, **When** the Super Admin opens the billing dashboard, **Then** the total MRR is shown correctly as the sum of all active subscriptions.
2. **Given** 2 tenants expire within 7 days, **When** the Super Admin views the tenant list, **Then** those 2 tenants are visually highlighted (e.g., red/orange badge) at the top or in a separate "Urgent" section.
3. **Given** a pending upgrade request exists (restaurant wants BASIC → PRO), **When** the Super Admin clicks "Approve", **Then** the tenant's plan is updated to PRO, a PAID invoice is created, and the restaurant's billing page reflects the new plan.
4. **Given** the Super Admin rejects an upgrade request with a reason, **When** the restaurant admin views their billing page, **Then** the rejection reason is shown clearly.
5. **Given** the Super Admin updates the bank transfer details (new IBAN), **When** any restaurant admin opens their billing page after the update, **Then** the new IBAN is displayed — no stale cached data.
6. **Given** the Super Admin manually creates an invoice for a tenant and extends their renewal by 30 days, **When** the tenant admin views their billing page, **Then** the new renewal date and invoice both appear.

---

### User Story 5 — Complete Visual Redesign (Priority: P3)

All users — restaurant admins, operational staff (cashier, waiter, captain, chef, driver), and Super Admins — experience a modern, beautiful, and highly usable interface that reflects a premium SaaS product. The design is Arabic-first (RTL) and optimized for both desktop and tablet/phone use.

**Why this priority**: The system must look credible and professional to attract and retain paying restaurant customers. Visual quality directly drives subscription conversion. Placed at P3 because integrity and billing must work correctly first.

**Independent Test**: Walk through every major screen (login, dashboard, kitchen, cashier, captain, waiter, delivery, superadmin overview). Every screen must show consistent spacing, typography, color usage, empty states, and loading states. No screen should look "unfinished" or use placeholder UI.

**Acceptance Scenarios**:

1. **Given** a new user opens the login page, **When** they view it on desktop, **Then** they see a split-screen layout: branded illustration on the right, clean Arabic login form on the left — with no broken layout at any viewport between 375px and 1440px.
2. **Given** a restaurant admin opens the dashboard, **When** the page loads, **Then** they see stat cards with trend arrows (↑↓), a revenue chart using the brand primary color, and a breadcrumb trail — no gray placeholder boxes remain after data loads.
3. **Given** a chef opens the kitchen screen, **When** there are no pending orders, **Then** an illustrated empty state with Arabic text is shown — never a blank white space.
4. **Given** any list page has 0 items, **When** the page renders, **Then** a contextually appropriate empty state illustration and description is shown for every such list.
5. **Given** a cashier is using the system on a 10-inch tablet, **When** they tap items to add to cart, **Then** all interactive buttons are at least 44px tall and respond to touch with no mis-tap issues.
6. **Given** the Pusher connection is active, **When** any real-time screen (kitchen, waiter, captain) is open, **Then** a small green "live" pulsing indicator is visible confirming real-time connectivity.
7. **Given** the Super Admin opens any superadmin page, **When** they see the sidebar, **Then** it has a visually distinct appearance (different background, accent color) from the restaurant-facing sidebar.

---

### Edge Cases

- What happens when a branch is deactivated while orders for that branch are still PENDING? Orders must remain accessible to cashier for billing but no new orders can be created for that branch.
- What happens when a tenant's plan expires mid-day? Currently active sessions should complete gracefully; new logins should be redirected to the billing page with an "expired" notice.
- What happens when an upgrade request is submitted but the tenant's plan expires before the Super Admin approves it? The request remains PENDING; the expired notice continues to show alongside the pending request.
- What happens when the Super Admin approves a request for a tenant that was manually suspended? Approval should fail with a clear error message.
- What happens if the IQD exchange rate used in an old invoice differs from the current rate? Historical invoices must display the rate locked at time of issuance — never recalculated retroactively.
- What happens when a finance report query spans a period with a daily close boundary? Amounts from both sides must be summed correctly with no double-counting at the boundary.
- What happens when two cashiers simultaneously try to close the same bill? The second action must fail gracefully with a "Bill already processed" message.

---

## Requirements *(mandatory)*

### Functional Requirements

#### Area 1: System Integrity

- **FR-001**: Every database query MUST include a `tenantId` filter so that no response ever contains data from a different tenant.
- **FR-002**: Every database query on branch-aware models (orders, tables, staff) MUST include a `branchId` filter when multi-branch is enabled for that tenant.
- **FR-003**: The branch selector state MUST persist across page navigations for the duration of the session.
- **FR-004**: When multi-branch is disabled (TRIAL/BASIC/PRO plans), the system MUST function without any `branchId` dependency or errors.
- **FR-005**: All page-level data loading MUST execute independent queries in parallel — never sequentially — to meet page load time targets.
- **FR-006**: Kitchen, waiter, and captain screens MUST receive real-time order status updates via push events within 3 seconds of a status change.
- **FR-007**: Bill totals MUST be calculated as: Σ(item.price × item.quantity) − applicable_discount_amount, with no rounding errors.
- **FR-008**: The daily close operation MUST aggregate only orders completed within the selected day — no orders from other days must be included.
- **FR-009**: When inventory deduction is enabled, completing an order MUST reduce stock quantities atomically — either all deductions succeed or none are applied.
- **FR-010**: An order that has been paid and completed MUST NOT appear in any active-order list (kitchen, waiter, captain, cashier active view).

#### Area 2: Restaurant Billing

- **FR-011**: Each restaurant admin MUST have access to a billing page showing: current plan, renewal date, days remaining, upgrade CTA, billing history, and payment instructions.
- **FR-012**: The billing page MUST display bank transfer details exactly as configured by the Super Admin — no hardcoded values.
- **FR-013**: A restaurant admin MUST be able to submit an upgrade/renewal request selecting a target plan; the request is created with PENDING status.
- **FR-014**: Each invoice record MUST contain: sequential invoice number, tenant name, plan name, amount in USD and IQD, coverage period (from–to dates), status, payment method, and optional Super Admin notes.
- **FR-015**: A restaurant admin MUST see a visible status indicator on their billing page showing any pending upgrade requests awaiting approval.
- **FR-016**: When an upgrade request is rejected, the restaurant admin MUST see the rejection reason on their billing page.

#### Area 3: Super Admin Billing

- **FR-017**: The Super Admin billing dashboard MUST display total MRR calculated as the sum of all active paid subscriptions.
- **FR-018**: Tenants expiring within 7 days MUST be visually highlighted and separated (urgent section or color-coded badge) in the tenant list.
- **FR-019**: Approving an upgrade request MUST atomically: update the tenant's plan, set a new renewal date (+30 days), create a PAID invoice, and remove the request from the PENDING list.
- **FR-020**: The Super Admin MUST be able to configure global bank transfer details (bank name, account number, IBAN, holder name) that are immediately reflected on all restaurant billing pages.
- **FR-021**: The Super Admin MUST be able to set per-plan pricing in USD.
- **FR-022**: The Super Admin MUST be able to manually create an invoice for any tenant and manually extend a tenant's renewal date.

#### Area 4: Visual Redesign

- **FR-023**: All pages MUST use a consistent design language: `rounded-2xl` cards, `shadow-sm` elevation, consistent `p-6` page padding, `gap-4` / `gap-6` grid spacing.
- **FR-024**: Every list view that can be empty MUST display a contextually appropriate empty state with an icon and Arabic description.
- **FR-025**: The login and register pages MUST use a split-screen layout with the form on the right and a brand illustration on the left (RTL layout).
- **FR-026**: Dashboard stat cards MUST display a trend indicator (↑↓ percentage vs. previous period) alongside the current value.
- **FR-027**: All operational screens (kitchen, cashier, captain, waiter, delivery) MUST show a real-time connection indicator (green pulsing dot when connected, grey when disconnected).
- **FR-028**: All interactive buttons on operational screens MUST be at least 44px tall to support touch input on tablets and phones.
- **FR-029**: The Super Admin section MUST have a visually distinct sidebar (different background and accent color) from the restaurant-facing interface.
- **FR-030**: All screens MUST render correctly in Arabic RTL layout at viewport widths between 375px (phone) and 1440px (desktop).

### Key Entities

- **Tenant**: A restaurant business. Has plan, renewal date, service mode, multi-branch flag, suspension status.
- **Branch**: A physical location belonging to a tenant. Has name, address, service mode, active status. (ENTERPRISE only)
- **Invoice**: A billing record. Has invoice number, tenant reference, plan, amount (USD + IQD), period, status, payment method, notes.
- **UpgradeRequest**: A request from a restaurant to change plan. Has tenant, current plan, target plan, status (PENDING/APPROVED/REJECTED), rejection reason, submission date.
- **PaymentConfig**: Global Super Admin settings. Contains bank transfer details and per-plan USD pricing.
- **Order**: A customer order. Scoped to tenant + branch. Has status, items, total, discount applied, timestamps.
- **Bill**: The payment record for a completed order or table session. Has total, discount, payment method, cashier reference, completion timestamp.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero cross-tenant data leakage — testing with 2 tenants, 0 out of N queries returns data from the wrong tenant.
- **SC-002**: Zero cross-branch data leakage — testing with 2 branches in one tenant, each branch screen shows exclusively its own data.
- **SC-003**: Real-time order status updates (kitchen → ready → waiter notification) delivered within 3 seconds in 99% of cases under normal network conditions.
- **SC-004**: All bill totals are mathematically accurate to the nearest whole dinar — 0 discrepancy between calculated and displayed totals.
- **SC-005**: All operational pages (kitchen, cashier, captain, waiter) load within 2 seconds on a standard broadband connection.
- **SC-006**: Restaurant admins can complete an upgrade request in under 2 minutes from opening the billing page to submitting the request.
- **SC-007**: Super Admin can approve a pending upgrade request in under 30 seconds from opening the billing dashboard.
- **SC-008**: 100% of pages display appropriate empty states — no blank white spaces in any tested screen.
- **SC-009**: All interactive controls on operational screens meet the 44px minimum touch target size.
- **SC-010**: Super Admin billing dashboard correctly shows MRR with 0 calculation error across all active tenants.

---

## Assumptions

- Iraqi Dinar (IQD) equivalent on invoices is calculated using a fixed exchange rate set by the Super Admin — not a live market rate.
- Renewal period is always 30 calendar days (monthly billing cycle).
- Payment method is bank transfer only — no online payment gateway (Stripe is present but not used for this billing flow).
- The "previous period" for trend indicators on dashboard stat cards is the previous 7-day window compared to the current 7-day window.
- Notification emails for upgrade approvals/rejections use the existing email infrastructure (Resend) if configured; the feature works without email if not configured.
- A tenant's plan downgrade (e.g., PRO → BASIC) is handled only by the Super Admin manually — restaurants can only request upgrades.
- The visual redesign preserves all existing functionality — no features are removed, only the presentation layer is updated.
- Design tokens (colors, typography) are already defined in the project's CSS variables and Tailwind config; the redesign uses these existing tokens, not new ones.
