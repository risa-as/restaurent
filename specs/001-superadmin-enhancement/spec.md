# Feature Specification: Super Admin Enhancement + Local Payment System

**Feature Branch**: `001-superadmin-enhancement`
**Created**: 2026-03-14
**Status**: Draft
**Context**: Restaurant SaaS (Next.js 14, PostgreSQL/Prisma, NextAuth v5) — Iraqi market

---

## Overview

Transform the Super Admin interface from a basic monitoring panel into a professional SaaS management platform. Simultaneously replace Stripe (unsupported in Iraq) with a local manual payment system supporting bank transfers and Zain Cash mobile wallet.

---

## User Scenarios & Testing

### User Story 1 — Local Payment Submission (Priority: P1)

A restaurant admin opens their billing page, sees their current plan and expiry, reads the bank/Zain Cash payment info, uploads a receipt image, and submits for review. They receive confirmation that their payment is pending.

**Why this priority**: Without a working payment flow, no restaurant can renew or upgrade their subscription. This is the most critical business-blocking issue.

**Independent Test**: A restaurant admin can submit a bank transfer receipt and see it appear as "قيد الانتظار" in their payment history.

**Acceptance Scenarios**:

1. **Given** a restaurant admin is logged in, **When** they visit `/dashboard/billing`, **Then** they see current plan name, expiry date, bank account details (from PlatformSettings), and Zain Cash number.
2. **Given** a restaurant admin fills the payment form (amount, method, selects plan, uploads receipt), **When** they submit, **Then** a `ManualPayment` record is created with `status = PENDING` and they see a success message.
3. **Given** a submitted payment exists, **When** the admin views their billing history, **Then** they see all their past payments with status badges (Pending / Approved / Rejected).
4. **Given** a payment is rejected, **When** the admin views billing, **Then** they see the rejection reason from the Super Admin.

---

### User Story 2 — Super Admin Payment Approval (Priority: P1)

The Super Admin opens `/superadmin/payments`, sees pending payment requests with receipt images, approves or rejects each one. Approved payments automatically extend the restaurant's subscription.

**Why this priority**: Directly paired with US1 — without approval, payments are meaningless. Together US1+US2 form the complete payment loop.

**Independent Test**: Super Admin approves a PENDING payment → tenant's `currentPeriodEnd` extends by the paid months → restaurant receives confirmation email.

**Acceptance Scenarios**:

1. **Given** pending payments exist, **When** Super Admin opens `/superadmin/payments`, **Then** they see a tab "قيد الانتظار" with count badge, each card showing: restaurant name, amount, method, date, receipt image preview.
2. **Given** Super Admin clicks "قبول", **When** they confirm, **Then** `ManualPayment.status = APPROVED`, `Tenant.currentPeriodEnd` is extended by `months * 30 days`, `Tenant.subscriptionStatus = ACTIVE`, and a confirmation email is sent to the restaurant admin.
3. **Given** Super Admin clicks "رفض", **When** they enter a reason and confirm, **Then** `ManualPayment.status = REJECTED`, `adminNote` is saved, and a rejection email with the reason is sent.
4. **Given** no pending payments exist, **When** Super Admin opens the Pending tab, **Then** they see "لا توجد مدفوعات معلقة" empty state.

---

### User Story 3 — Tenant Search, Filter & Plan Management (Priority: P2)

Super Admin opens `/superadmin/tenants`, searches for a restaurant by name, filters by plan/status/service mode, and changes a restaurant's plan or extends their trial — all from the tenant card.

**Why this priority**: As the platform scales to 50+ restaurants, managing them without search/filter is impractical. Plan management is a core Super Admin operation.

**Independent Test**: Super Admin types a restaurant name → filtered list updates instantly → clicks "تغيير الخطة" → selects PRO → card updates to show PRO badge.

**Acceptance Scenarios**:

1. **Given** multiple tenants exist, **When** Super Admin types in the search box, **Then** only tenants whose name or slug contains the search text are shown, and a counter shows "X من Y مطعم".
2. **Given** filter dropdowns are applied (plan + status), **When** Super Admin selects "TRIAL" plan and "Active" status, **Then** only tenants matching BOTH filters are shown simultaneously.
3. **Given** a tenant is in TRIAL, **When** Super Admin clicks "+14 يوم", **Then** `Tenant.trialEndsAt` extends by 14 days and the card shows the new expiry date.
4. **Given** Super Admin selects a new plan from the dropdown, **When** they confirm, **Then** `Tenant.plan` and `Tenant.subscriptionStatus` update and the badge on the card reflects the change immediately.

---

### User Story 4 — Dashboard Analytics Charts (Priority: P2)

Super Admin opens the dashboard and sees a registration growth chart for the last 30 days and a trial-to-paid conversion rate KPI alongside the existing 8 KPI cards.

**Why this priority**: Visibility into platform growth is essential for business decisions. Currently the dashboard has no charts at all.

**Independent Test**: Dashboard loads with an AreaChart showing the last 30 days of registrations and a conversion rate percentage.

**Acceptance Scenarios**:

1. **Given** tenants exist with various creation dates, **When** Super Admin opens `/superadmin`, **Then** an AreaChart displays daily registration counts for the last 30 days.
2. **Given** the platform has trial and active tenants, **When** the conversion KPI is displayed, **Then** it shows the percentage of tenants that converted from TRIAL to ACTIVE (paid).
3. **Given** no registrations in a given day, **When** that day appears on the chart, **Then** it shows 0 (not missing from the axis).

---

### User Story 5 — Revenue Analytics (replacing Stripe) (Priority: P2)

Super Admin opens `/superadmin/revenue` and sees real MRR/ARR data computed from approved manual payments in the database, along with a monthly trend chart.

**Why this priority**: The current Stripe-based page fails entirely in Iraq. Replacing it with DB-driven analytics makes it functional.

**Independent Test**: Revenue page loads without errors, shows MRR computed from approved ManualPayments, and displays a monthly chart.

**Acceptance Scenarios**:

1. **Given** approved payments exist, **When** Super Admin opens `/superadmin/revenue`, **Then** current MRR, estimated ARR, total revenue, and avg revenue/restaurant are displayed.
2. **Given** payments span multiple months, **When** the chart loads, **Then** a LineChart shows monthly revenue for the last 6 months.
3. **Given** payments use different methods, **When** the breakdown section loads, **Then** it shows IQD amounts split by Bank Transfer vs Zain Cash.

---

### User Story 6 — Tenant Detail Page (Priority: P3)

Super Admin clicks on a restaurant name and opens `/superadmin/tenants/[id]` — a deep-dive page showing complete restaurant data, payment history, statistics, and all management actions.

**Why this priority**: Needed for detailed investigation of specific restaurants, but not blocking for daily operations.

**Independent Test**: Super Admin navigates to a tenant detail page and sees all restaurant info, stats, payment history, and action buttons.

**Acceptance Scenarios**:

1. **Given** Super Admin clicks a restaurant name, **When** the detail page loads, **Then** it shows: name, slug, admin info, plan, service mode, creation date, current subscription end, stats (orders/day, total revenue, staff count, menu items count).
2. **Given** the restaurant has payment history, **When** the payment section loads, **Then** a table shows all payments (date, amount, method, status, admin note).
3. **Given** Super Admin is on the detail page, **When** they use the action buttons, **Then** they can change plan, extend trial, suspend/activate, and send email — same as on the card but with more context.

---

### User Story 7 — Announcements System (Priority: P3)

Super Admin creates an announcement that appears as a banner in all (or specific) restaurant dashboards. Restaurant admins see the banner and can dismiss it.

**Why this priority**: Important for platform communication (maintenance windows, new features), but not operationally critical.

**Independent Test**: Super Admin creates an INFO announcement targeting all plans → restaurant admin logs in → sees the banner at the top of their dashboard.

**Acceptance Scenarios**:

1. **Given** Super Admin creates an announcement with title, body, type (INFO/WARNING/UPDATE), and target (all/specific plan), **When** they submit, **Then** the announcement is saved as active and visible to targeted restaurants.
2. **Given** an active announcement targets "all plans", **When** any restaurant admin views their dashboard, **Then** they see a colored banner (blue=INFO, yellow=WARNING, green=UPDATE) with the announcement content.
3. **Given** an announcement has an `expiresAt` date, **When** that date passes, **Then** the banner no longer appears.

---

### User Story 8 — Audit Log (Priority: P3)

Super Admin opens `/superadmin/audit-log` and sees a paginated, filterable table of all platform operations performed by Super Admins (plan changes, approvals, suspensions, etc.).

**Why this priority**: Compliance and transparency — important for accountability but not blocking.

**Independent Test**: After approving a payment, an audit log entry appears in the audit log page with the correct action, timestamp, and Super Admin name.

**Acceptance Scenarios**:

1. **Given** platform operations have been performed, **When** Super Admin opens `/superadmin/audit-log`, **Then** a table shows: date/time, action type, details, performed by (Super Admin name).
2. **Given** the audit log has many entries, **When** Super Admin filters by date range, **Then** only entries within that range are shown.
3. **Given** Super Admin approves a payment, **When** they check audit log, **Then** a new entry "قبول دفعة — مطعم X — 150,000 IQD" appears.

---

### User Story 9 — Editable Platform Settings (Priority: P3)

Super Admin opens `/superadmin/settings`, edits bank transfer details, Zain Cash number, trial duration, and grace period — all saved to database and immediately reflected in the billing page.

**Why this priority**: Operational flexibility. Without this, the Super Admin must ask a developer to update payment info.

**Independent Test**: Super Admin changes the bank account number → restaurant admin's billing page immediately shows the new number.

**Acceptance Scenarios**:

1. **Given** Super Admin opens `/superadmin/settings`, **When** the page loads, **Then** they see editable fields for: bank name, account number, account holder name, Zain Cash number, trial duration (days), grace period (days), welcome message.
2. **Given** Super Admin edits and saves settings, **When** they save, **Then** `PlatformSettings` record updates and the billing page immediately reflects changes.
3. **Given** Super Admin toggles maintenance mode ON, **When** a restaurant admin visits any page, **Then** they see a maintenance mode banner instead of the regular content.

---

### Edge Cases

- What if a restaurant submits a duplicate payment receipt? System should allow it (Super Admin decides to approve/reject).
- What if `trialEndsAt` is already expired when extending? Extension should add days from today, not from the expired date.
- What if `PlatformSettings` record doesn't exist yet? Auto-create with defaults on first access.
- What if the receipt image upload fails? Form should show error and allow retry without losing other field values.
- What if Super Admin approves a payment for a suspended tenant? Tenant should also be re-activated (`isActive = true`).
- What if no payments exist? Revenue page shows zero KPIs and empty chart (no errors).
- What if an announcement expires? It should be hidden from restaurant dashboards automatically without manual deletion.

---

## Requirements

### Functional Requirements

**Payment System**:
- **FR-001**: System MUST provide a `/dashboard/billing` page where restaurant admins can view payment instructions (bank info + Zain Cash number) loaded from `PlatformSettings`.
- **FR-002**: System MUST allow restaurant admins to submit a payment with: amount (IQD), method (BANK_TRANSFER / ZAIN_CASH), plan being paid for, number of months, receipt image URL, and optional note.
- **FR-003**: System MUST store every payment submission in `ManualPayment` table with `status = PENDING`.
- **FR-004**: System MUST provide Super Admin a page at `/superadmin/payments` to view, approve, and reject pending payments.
- **FR-005**: System MUST extend `Tenant.currentPeriodEnd` by (months × 30 days) and set `subscriptionStatus = ACTIVE` when a payment is approved.
- **FR-006**: System MUST send an email notification to the restaurant admin upon payment approval or rejection.
- **FR-007**: System MUST display the rejection reason (adminNote) to the restaurant admin on their billing page.

**Tenant Management**:
- **FR-008**: System MUST provide client-side search on the tenants page filtering by restaurant name or slug.
- **FR-009**: System MUST support simultaneous filtering by plan, subscription status, and service mode.
- **FR-010**: System MUST allow Super Admin to change a tenant's plan from the tenant card via API.
- **FR-011**: System MUST allow Super Admin to extend a tenant's trial period by +7, +14, or +30 days.
- **FR-012**: System MUST allow Super Admin to send an email to the restaurant admin directly from the tenant card.

**Analytics**:
- **FR-013**: Dashboard MUST display a 30-day registration growth chart with daily data points.
- **FR-014**: Dashboard MUST display a trial-to-paid conversion rate calculated from DB.
- **FR-015**: Revenue page MUST display MRR, ARR, total revenue, and avg revenue/restaurant from approved `ManualPayment` records.
- **FR-016**: Revenue page MUST display a 6-month monthly revenue trend chart.

**New Pages**:
- **FR-017**: System MUST provide `/superadmin/tenants/[id]` with complete tenant details, payment history, and action buttons.
- **FR-018**: System MUST provide `/superadmin/announcements` for creating and managing platform announcements.
- **FR-019**: System MUST display active announcements as banners in restaurant dashboards.
- **FR-020**: System MUST provide `/superadmin/audit-log` using the existing `AuditLog` model.
- **FR-021**: System MUST convert `/superadmin/settings` from static display to editable `PlatformSettings` form.

**Navigation**:
- **FR-022**: Super Admin sidebar MUST visually highlight the currently active page link.
- **FR-023**: Super Admin sidebar MUST include navigation links for all 7 pages (dashboard, tenants, payments, revenue, audit-log, announcements, settings).

### Key Entities

- **ManualPayment**: Represents a payment submission by a restaurant admin. Contains amount, method, status, receipt URL, plan, months, and approval metadata.
- **PlatformSettings**: Singleton record storing platform-wide configuration: bank details, Zain Cash number, trial/grace period durations, maintenance mode.
- **Announcement**: A message from Super Admin to restaurants. Contains title, body, type, target plan, active status, and expiry date.
- **Tenant** (extended): Gains relationship to `ManualPayment[]`. `stripeCustomerId` and `stripeSubscriptionId` become unused (kept for migration compatibility).

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: A restaurant admin can complete a payment submission in under 3 minutes from opening the billing page.
- **SC-002**: Super Admin can approve or reject a payment in under 60 seconds including viewing the receipt.
- **SC-003**: Super Admin can find any specific restaurant on the tenants page in under 10 seconds using search.
- **SC-004**: The revenue page loads with correct MRR data within 2 seconds (no external API calls).
- **SC-005**: Announcement banners appear in restaurant dashboards within 30 seconds of creation.
- **SC-006**: All Super Admin sidebar links correctly highlight the active page.
- **SC-007**: Zero Stripe API calls remain in the production codebase after migration.
- **SC-008**: The tenant detail page provides all information needed without navigating away.

---

## Assumptions

1. Receipt image upload uses the existing `uploadthing` integration already in the project.
2. If `uploadthing` is unavailable, receipts can be submitted as a URL string (manual copy-paste).
3. Payment amounts are in Iraqi Dinar (IQD) exclusively for now.
4. Plan pricing: BASIC = 50,000 IQD/month, PRO = 100,000 IQD/month, ENTERPRISE = 200,000 IQD/month (configurable in PlatformSettings later).
5. The `Announcement` model requires a new Prisma migration.
6. `PlatformSettings` is a singleton (one record); auto-created on first use with defaults.
7. Audit log entries are written server-side during each significant Super Admin operation.
8. Email sending uses the existing Resend integration with graceful fallback if unconfigured.
9. `Recharts` library is assumed available (used elsewhere in the project).
10. Stripe-related env vars remain in `.env.example` but the revenue page no longer calls Stripe.

---

## Out of Scope

- Zain Cash merchant API integration (future: manual receipt upload for now)
- FIB (First Iraqi Bank) integration
- Multi-currency support (USD, EUR)
- Automated subscription renewal reminders via SMS
- Restaurant admin impersonation ("Login as tenant")
- Bulk email to all tenants
- Export to PDF/Excel on payments page
