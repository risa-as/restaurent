# Tasks: Super Admin Enhancement + Local Payment System

**Input**: Design documents from `/specs/001-superadmin-enhancement/`
**Prerequisites**: spec.md ✅, plan.md ✅

---

## Phase 1: Foundation — Database Schema Migration

**Purpose**: Add the 3 new models required by all user stories. Nothing else can be built without this.

**⚠️ CRITICAL**: All phases below depend on this phase completing first.

- [X] T001 Add `ManualPaymentStatus` enum (PENDING, APPROVED, REJECTED) to `prisma/schema.prisma`
- [X] T002 Add `PaymentMethodType` enum (BANK_TRANSFER, ZAIN_CASH, OTHER) to `prisma/schema.prisma`
- [X] T003 Add `AnnouncementType` enum (INFO, WARNING, UPDATE) to `prisma/schema.prisma`
- [X] T004 Add `ManualPayment` model to `prisma/schema.prisma` (fields: id, tenantId, amount, currency, method, status, receiptUrl, receiptNote, adminNote, plan, months, paidAt, approvedAt, approvedById, createdAt; relations: tenant, approvedBy)
- [X] T005 Add `PlatformSettings` model to `prisma/schema.prisma` (fields: id, trialDurationDays, gracePeriodDays, bankName, bankAccount, bankAccountName, zainCashNumber, welcomeMessage, maintenanceMode, updatedAt)
- [X] T006 Add `Announcement` model to `prisma/schema.prisma` (fields: id, title, body, type, targetPlan, isActive, createdById, createdAt, expiresAt; relation: createdBy → User)
- [X] T007 Add `manualPayments ManualPayment[]` relation to `Tenant` model in `prisma/schema.prisma`
- [X] T008 Add `approvedPayments ManualPayment[]` relation to `User` model (approvedBy) in `prisma/schema.prisma`
- [X] T009 Run `npx prisma db push` (or `prisma migrate dev --name add-payment-system`) to apply schema changes
- [X] T010 Verify Prisma Client regenerated — test with `npx prisma studio` that new tables exist

**Checkpoint**: Database ready — all new tables exist and Prisma Client types updated.

---

## Phase 2: US1 — Local Payment Submission (Priority: P1) 🎯 MVP

**Goal**: Restaurant admin can submit bank transfer/Zain Cash receipts and see payment history.

**Independent Test**: Login as `admin@test.com`, navigate to `/dashboard/billing`, submit a payment with amount + method + receipt URL → see it in history as "قيد الانتظار".

### Implementation for US1

- [X] T011 [P] Create `src/lib/actions/billing.ts` with `getBillingInfo()` — fetches `PlatformSettings` (auto-creates with defaults if missing), returns bank info + ZainCash number + tenant current plan/expiry
- [X] T012 [P] Add `submitPayment()` server action to `src/lib/actions/billing.ts` — validates input, creates `ManualPayment` record with status=PENDING
- [X] T013 [P] Add `getPaymentHistory()` server action to `src/lib/actions/billing.ts` — returns all `ManualPayment` records for the current tenant, ordered by createdAt desc
- [X] T014 Create `src/components/billing/billing-info.tsx` — displays bank name, account number, account holder, ZainCash number from PlatformSettings (read-only display card)
- [X] T015 Create `src/components/billing/payment-submission-form.tsx` — form fields: amount (IQD), method (BANK_TRANSFER/ZAIN_CASH), plan selection, months (1-12), receipt URL input (or UploadThing upload button), optional note; calls `submitPayment()` on submit
- [X] T016 Create `src/components/billing/payment-history-table.tsx` — table showing date, plan, amount, method, status badge (Pending/Approved/Rejected), adminNote (shown if REJECTED)
- [X] T017 Create/rewrite `src/app/dashboard/billing/page.tsx` — server component that fetches billing info + payment history; renders `billing-info.tsx`, `payment-submission-form.tsx`, `payment-history-table.tsx`; shows current plan name + expiry date at top

**Checkpoint**: US1 complete — restaurant admin can view billing info, submit payment, see history.

---

## Phase 3: US2 — Super Admin Payment Approval (Priority: P1) 🎯 MVP

**Goal**: Super Admin can approve or reject pending payments, triggering subscription extension and email.

**Independent Test**: Login as `superadmin@test.com`, navigate to `/superadmin/payments`, see pending payment from Phase 2 test, click "قبول" → tenant's `currentPeriodEnd` extends by 30 days, payment status = APPROVED.

### Implementation for US2

- [X] T018 Add `getPendingPayments()` server action to `src/lib/actions/superadmin.ts` — returns all ManualPayments grouped by status with tenant name included
- [X] T019 Add `approvePayment(paymentId)` server action to `src/lib/actions/superadmin.ts` — sets ManualPayment.status=APPROVED, extends Tenant.currentPeriodEnd by (months × 30 days), sets Tenant.subscriptionStatus=ACTIVE, sets Tenant.isActive=true (handles suspended tenant edge case), records AuditLog entry, sends approval email via Resend (graceful fallback if unconfigured)
- [X] T020 Add `rejectPayment(paymentId, reason)` server action to `src/lib/actions/superadmin.ts` — sets ManualPayment.status=REJECTED, saves adminNote, records AuditLog entry, sends rejection email with reason via Resend
- [X] T021 Create `src/components/superadmin/payment-approval-card.tsx` — displays: restaurant name, amount (IQD formatted), method, submitted date, receipt image preview (opens full image on click); action buttons: "قبول" (confirm dialog) and "رفض" (dialog with reason textarea)
- [X] T022 Create `src/app/superadmin/payments/page.tsx` — server component; renders Tabs (Pending / Approved / Rejected) with count badges; each tab renders list of `payment-approval-card.tsx`; empty state "لا توجد مدفوعات معلقة" when empty

**Checkpoint**: US1 + US2 complete — full payment loop functional. Restaurant submits → Super Admin approves → subscription extended.

---

## Phase 4: US3 — Tenant Search, Filter & Plan Management (Priority: P2)

**Goal**: Super Admin can search, filter tenants and manage plans/trials from the tenant list.

**Independent Test**: Type restaurant name in search box → instant filtering. Click "+14 يوم" → trialEndsAt extends. Change plan dropdown → plan badge updates.

### Implementation for US3

- [X] T023 Add `changeTenantPlan(tenantId, plan)` server action to `src/lib/actions/superadmin.ts` — updates Tenant.plan + Tenant.subscriptionStatus, records AuditLog
- [X] T024 Add `extendTenantTrial(tenantId, days)` server action to `src/lib/actions/superadmin.ts` — extends trialEndsAt from max(trialEndsAt, today) + days (handles expired trial edge case), records AuditLog
- [X] T025 Add `sendEmailToTenantAdmin(tenantId, subject, message)` server action to `src/lib/actions/superadmin.ts` — finds tenant's ADMIN user email, sends via Resend
- [X] T026 Modify `src/components/superadmin/tenant-card.tsx` (or equivalent) — add: plan change dropdown (TRIAL/BASIC/PRO/ENTERPRISE) with confirm dialog; trial extension buttons (+7/+14/+30 days); email admin button that opens dialog with subject + message fields; all call respective server actions with optimistic UI updates
- [X] T027 Modify `src/app/superadmin/tenants/page.tsx` — convert to client component (or hybrid): add search input (filters by name/slug), plan filter dropdown, status filter dropdown (All/Active/Trial/Suspended/PastDue), service mode filter; all filtering is client-side; show result counter "X من Y مطعم"

**Checkpoint**: Tenant management fully functional — search, filter, plan changes, trial extensions all work.

---

## Phase 5: US4 — Dashboard Analytics Charts (Priority: P2)

**Goal**: Super Admin dashboard shows 30-day registration growth chart and conversion rate KPI.

**Independent Test**: Open `/superadmin` → AreaChart shows last 30 days with daily registration counts; conversion rate KPI shows correct percentage.

### Implementation for US4

- [X] T028 Add `getDashboardAnalytics()` server action (or update existing) — returns: 30-day daily registration data (array of {date, count}), trial-to-paid conversion rate (ACTIVE tenants / total non-TRIAL tenants × 100), all existing KPIs
- [X] T029 Create `src/components/superadmin/registration-chart.tsx` — Recharts AreaChart displaying last 30 days of tenant registrations; handles days with 0 registrations (fill gaps); Arabic labels
- [X] T030 Modify `src/app/superadmin/page.tsx` — add `registration-chart.tsx` below existing KPI cards; add conversion rate KPI card alongside existing 8 KPIs

**Checkpoint**: Dashboard shows registration growth chart and conversion KPI.

---

## Phase 6: US5 — Revenue Analytics (Replace Stripe) (Priority: P2)

**Goal**: Revenue page shows real MRR/ARR from ManualPayments instead of failing Stripe calls.

**Independent Test**: Open `/superadmin/revenue` → page loads without errors, shows MRR from approved ManualPayments, 6-month LineChart displays.

### Implementation for US5

- [X] T031 Add `getRevenueAnalytics()` server action to `src/lib/actions/superadmin.ts` — queries approved ManualPayments: current MRR (sum of approved payments this month), ARR (MRR × 12), total all-time revenue, avg revenue per restaurant, monthly breakdown for last 6 months, method breakdown (BANK_TRANSFER vs ZAIN_CASH totals)
- [X] T032 Rewrite `src/app/superadmin/revenue/page.tsx` — remove all Stripe imports/calls; use `getRevenueAnalytics()`; display 4 KPI cards (MRR, ARR, total, avg/restaurant); render Recharts LineChart for 6-month trend; payment method breakdown section; all amounts in IQD with Arabic number formatting

**Checkpoint**: Revenue page works offline (no Stripe) using local payment data.

---

## Phase 7: US6 — Tenant Detail Page (Priority: P3)

**Goal**: Deep-dive page for individual restaurant with full info, stats, payment history, and actions.

**Independent Test**: Click restaurant name on tenants page → `/superadmin/tenants/[id]` loads with all info, payment history table, and action buttons.

### Implementation for US6

- [X] T033 Add `getTenantDetail(id)` server action — returns: tenant full info, admin user info, payment history, stats (total orders, today's orders, total revenue from bills, staff count, menu items count)
- [X] T034 Create `src/components/superadmin/tenant-detail.tsx` — displays: info section (name, slug, plan badge, service mode, created date, subscription end), admin info (name, email), stats cards, payment history table (date/amount/method/status/note), action buttons (same as tenant card: change plan, extend trial, suspend/activate, send email)
- [X] T035 Create `src/app/superadmin/tenants/[id]/page.tsx` — server component; calls `getTenantDetail()`; renders `tenant-detail.tsx`; back navigation to tenants list
- [X] T036 Add clickable link on tenant name in `src/app/superadmin/tenants/page.tsx` that navigates to `/superadmin/tenants/[id]`

**Checkpoint**: Tenant detail page fully functional.

---

## Phase 8: US7 — Announcements System (Priority: P3)

**Goal**: Super Admin creates announcements; they appear as banners in restaurant dashboards.

**Independent Test**: Create INFO announcement targeting all plans → login as admin@test.com → banner appears at top of dashboard.

### Implementation for US7

- [X] T037 [P] Add `createAnnouncement()` server action to `src/lib/actions/superadmin.ts` — creates Announcement record, records AuditLog
- [X] T038 [P] Add `getActiveAnnouncements(tenantPlan)` server action — returns active, non-expired announcements targeting the given plan (or null = all plans)
- [X] T039 [P] Add `toggleAnnouncement(id, isActive)` and `deleteAnnouncement(id)` server actions
- [X] T040 Create `src/components/superadmin/announcement-form.tsx` — form fields: title, body (textarea), type (INFO/WARNING/UPDATE radio), target plan (All/TRIAL/BASIC/PRO/ENTERPRISE), optional expiry date; calls `createAnnouncement()`
- [X] T041 Create `src/components/superadmin/announcements-list.tsx` — table of all announcements with type badge, active toggle, expiry date, delete button
- [X] T042 Create `src/app/superadmin/announcements/page.tsx` — renders `announcement-form.tsx` + `announcements-list.tsx`
- [X] T043 Create `src/components/layout/announcement-banner.tsx` — client component; fetches active announcements for current tenant's plan; renders colored banner (blue=INFO, yellow=WARNING, green=UPDATE) with dismiss button (localStorage key to remember dismissed); hidden if expired
- [X] T044 Add `announcement-banner.tsx` to `src/app/dashboard/layout.tsx` — renders above page content for ADMIN/MANAGER roles

**Checkpoint**: Announcements system end-to-end functional.

---

## Phase 9: US8 — Audit Log Page (Priority: P3)

**Goal**: Super Admin sees paginated table of all platform operations.

**Independent Test**: After approving a payment in Phase 3, open `/superadmin/audit-log` → see the approval entry with action, restaurant name, amount, Super Admin name, and timestamp.

### Implementation for US8

- [X] T045 Add `getAuditLogs(filters)` server action — queries AuditLog with optional filters (dateFrom, dateTo, action type); paginates (50 per page); includes user name
- [X] T046 Create `src/app/superadmin/audit-log/page.tsx` — server component; renders data table with columns: date/time, action, details, performed by; date range filter inputs; pagination controls; empty state

**Checkpoint**: Audit log shows all tracked operations with filtering.

---

## Phase 10: US9 — Editable Platform Settings (Priority: P3)

**Goal**: Super Admin edits bank info, ZainCash, trial duration, grace period — immediately reflected on billing page.

**Independent Test**: Change bank account number in settings → navigate to restaurant billing page → new account number shown immediately.

### Implementation for US9

- [X] T047 Add `getPlatformSettings()` server action (reuse/expose from billing.ts logic) — upsert-reads PlatformSettings singleton
- [X] T048 Add `updatePlatformSettings(data)` server action to `src/lib/actions/superadmin.ts` — updates PlatformSettings record, records AuditLog
- [X] T049 Create `src/components/superadmin/platform-settings-form.tsx` — form with fields: bank name, bank account number, bank account holder name, ZainCash number, trial duration (days), grace period (days), welcome message (textarea), maintenance mode (toggle); calls `updatePlatformSettings()`; shows success/error toast
- [X] T050 Rewrite `src/app/superadmin/settings/page.tsx` — replace static display with `platform-settings-form.tsx`; pre-populate with current `PlatformSettings` values

**Checkpoint**: Settings page is editable and changes reflect on billing page.

---

## Phase 11: UX Polish — Active Sidebar & Navigation

**Purpose**: Active link highlighting in sidebar; all new pages added to navigation.

- [X] T051 Identify existing superadmin sidebar component (check `src/app/superadmin/layout.tsx` and `src/components/superadmin/`)
- [X] T052 Convert superadmin sidebar to use `usePathname()` from `next/navigation` for active link detection
- [X] T053 Apply active styles: `bg-primary/10 text-primary font-semibold border-r-2 border-primary` to the matching sidebar link
- [X] T054 Add sidebar navigation links for all 7 pages: dashboard (`/superadmin`), tenants (`/superadmin/tenants`), payments (`/superadmin/payments`), revenue (`/superadmin/revenue`), audit-log (`/superadmin/audit-log`), announcements (`/superadmin/announcements`), settings (`/superadmin/settings`)

**Checkpoint**: All sidebar links navigate correctly and the active page is visually highlighted.

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (DB Migration)
    ↓ (all phases depend on this)
Phase 2 (US1 Billing) ──┐
Phase 3 (US2 Payments) ──┤── both needed for full payment loop (P1)
                         ↓
Phase 4 (US3 Tenants) ──┐
Phase 5 (US4 Charts) ───┤── can all start in parallel after Phase 1
Phase 6 (US5 Revenue) ──┘
                         ↓
Phase 7 (US6 Tenant Detail) ──┐
Phase 8 (US7 Announcements) ──┤── all P3, can be parallel
Phase 9 (US8 Audit Log) ──────┤
Phase 10 (US9 Settings) ──────┘
                         ↓
Phase 11 (UX Polish) — depends on all pages existing
```

### Parallel Opportunities

- T001–T010 (schema changes): Must be sequential — each builds on previous
- T011, T012, T013 (billing actions): Can be written in parallel [P]
- T018, T019, T020 (payment actions): Can be written in parallel [P]
- T023, T024, T025 (tenant management actions): Can be written in parallel [P]
- T037, T038, T039 (announcement actions): Can be written in parallel [P]
- Phases 4, 5, 6 can proceed in parallel after Phase 1 completes
- Phases 7, 8, 9, 10 can proceed in parallel after Phase 1 completes

---

## Implementation Strategy

### MVP First (P1 stories only)

1. Complete Phase 1: DB Migration
2. Complete Phase 2: US1 (Billing page)
3. Complete Phase 3: US2 (Payment approval)
4. **STOP and VALIDATE**: Test full payment loop — submit → approve → verify subscription extended
5. Deploy/demo P1 MVP

### Incremental Delivery

1. DB Migration → Foundation ready
2. US1 + US2 → Payment loop complete (P1 MVP)
3. US3 + US4 + US5 → Management tools + analytics (P2)
4. US6 + US7 + US8 + US9 → Deep management features (P3)
5. Phase 11 → Polish and navigation

---

## Notes

- [P] = tasks that can run in parallel (different files, no dependencies between them)
- All amounts displayed in IQD — format as `150,000 د.ع`
- All UI text is Arabic (RTL)
- AuditLog entries must be written for: payment approval, payment rejection, plan change, trial extension, settings update, announcement create/delete
- `PlatformSettings` singleton: use `upsert` with `where: { id: 'singleton' }` pattern
- UploadThing receipt upload: if unavailable, allow URL string input as fallback (per spec assumption #2)
- Resend email: wrap in try/catch — log error but don't fail the action if email fails
