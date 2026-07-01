# Implementation Plan: Super Admin Enhancement + Local Payment System

**Branch**: `001-superadmin-enhancement` | **Date**: 2026-03-14 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-superadmin-enhancement/spec.md`

---

## Summary

Transform the Super Admin panel into a professional SaaS management platform and replace Stripe with a local manual payment system (bank transfers + Zain Cash). The implementation adds 3 new Prisma models, 5 new pages, rewrites 2 existing pages, and enhances 2 existing pages. All changes are confined to the existing Next.js 14 App Router codebase.

---

## Technical Context

**Language/Version**: TypeScript 5 / Node.js 20
**Primary Dependencies**: Next.js 14 (App Router), Prisma ORM, NextAuth v5, Recharts, Tailwind CSS, shadcn/ui, Resend (email), UploadThing (file upload)
**Storage**: PostgreSQL via Prisma (schema migrations required)
**Testing**: None (not requested in spec)
**Target Platform**: Web (desktop-first, Arabic RTL)
**Project Type**: SaaS web application (multi-tenant)
**Performance Goals**: Revenue page loads in <2s (no external API calls); tenant search is instant (client-side filtering)
**Constraints**: No Stripe API calls; Iraqi Dinar (IQD) only; RTL Arabic UI; `PlatformSettings` singleton auto-created on first access
**Scale/Scope**: ~50 restaurant tenants per platform instance

---

## Project Structure

### Documentation (this feature)

```text
specs/001-superadmin-enhancement/
├── spec.md              ✅ Created
├── plan.md              ✅ This file
├── tasks.md             ⏳ Created by /speckit.tasks
├── contracts/           ✅ dir
└── checklists/          ✅ dir
```

### Database Schema Changes

```text
prisma/
└── schema.prisma        MODIFY — add ManualPayment, PlatformSettings, Announcement models + enums
```

New models:
- `ManualPayment` — payment submission by restaurant admin
- `PlatformSettings` — singleton platform config (bank info, Zain Cash, trial duration)
- `Announcement` — platform-wide banners for restaurant dashboards

New enums:
- `PaymentMethodType` (BANK_TRANSFER, ZAIN_CASH, OTHER)
- `ManualPaymentStatus` (PENDING, APPROVED, REJECTED)
- `AnnouncementType` (INFO, WARNING, UPDATE)

### Source Code Changes

```text
src/
├── app/
│   ├── superadmin/
│   │   ├── page.tsx                          MODIFY — add AreaChart + conversion KPI
│   │   ├── layout.tsx                        MODIFY — sidebar active link (usePathname)
│   │   ├── tenants/
│   │   │   ├── page.tsx                      MODIFY — add search/filter/sort
│   │   │   └── [id]/
│   │   │       └── page.tsx                  CREATE — tenant detail page
│   │   ├── payments/
│   │   │   └── page.tsx                      CREATE — payment approval page
│   │   ├── revenue/
│   │   │   └── page.tsx                      MODIFY — replace Stripe with DB analytics
│   │   ├── audit-log/
│   │   │   └── page.tsx                      CREATE — audit log viewer
│   │   ├── announcements/
│   │   │   └── page.tsx                      CREATE — announcements manager
│   │   └── settings/
│   │       └── page.tsx                      MODIFY — convert to editable form
│   └── dashboard/
│       └── billing/
│           └── page.tsx                      MODIFY — complete rewrite (local payment)
│
├── components/
│   ├── superadmin/
│   │   ├── superadmin-sidebar.tsx            MODIFY — active link highlighting
│   │   ├── tenant-card.tsx                   MODIFY — plan dropdown, trial extend, email
│   │   ├── payment-approval-card.tsx         CREATE — payment card with approve/reject
│   │   ├── tenant-detail.tsx                 CREATE — tenant detail view
│   │   ├── announcement-form.tsx             CREATE — create/edit announcement
│   │   ├── announcements-list.tsx            CREATE — manage announcements table
│   │   └── platform-settings-form.tsx        CREATE — editable settings form
│   ├── billing/
│   │   ├── billing-info.tsx                  CREATE — bank/ZainCash info display
│   │   ├── payment-submission-form.tsx       CREATE — submit payment form
│   │   └── payment-history-table.tsx         CREATE — past payments list
│   └── layout/
│       └── announcement-banner.tsx           CREATE — banner shown in dashboard
│
└── lib/
    └── actions/
        ├── superadmin.ts                     MODIFY — add payment approval, plan change, trial extend, email, settings, announcements
        └── billing.ts                        CREATE — submit payment, get billing info
```

---

## Implementation Phases

### Phase 0 — Database Migration (Blocker for all)

Add `ManualPayment`, `PlatformSettings`, `Announcement` models to `prisma/schema.prisma`. Run `prisma migrate dev` or `prisma db push`.

**Files**: `prisma/schema.prisma`
**Blocks**: Everything — no code can run without updated schema.

---

### Phase 1 — P1: Local Payment System (US1 + US2)

Complete the payment loop: restaurant admin submits → Super Admin approves/rejects.

**US1 (Restaurant billing page)**:
- `/dashboard/billing/page.tsx` — show plan info, bank/ZainCash info, submission form, history
- `src/lib/actions/billing.ts` — `submitPayment()`, `getBillingInfo()`, `getPaymentHistory()`
- Components: `billing-info.tsx`, `payment-submission-form.tsx`, `payment-history-table.tsx`

**US2 (Super Admin payments page)**:
- `/superadmin/payments/page.tsx` — tabs: Pending / Approved / Rejected
- `src/lib/actions/superadmin.ts` — `approvePayment()`, `rejectPayment()`
- Component: `payment-approval-card.tsx`
- Email notifications via Resend on approval/rejection

---

### Phase 2 — P2: Tenant Management & Analytics

**US3 (Tenant search/filter)**:
- `/superadmin/tenants/page.tsx` — client-side search + filter by plan/status/mode
- `tenant-card.tsx` — add plan dropdown, +7/+14/+30 trial extend, email dialog
- `superadmin.ts` — `changePlan()`, `extendTrial()`, `sendEmailToAdmin()`

**US4 (Dashboard charts)**:
- `/superadmin/page.tsx` — add Recharts AreaChart (30-day registrations) + conversion KPI

**US5 (Revenue page)**:
- `/superadmin/revenue/page.tsx` — remove Stripe, compute MRR/ARR from ManualPayment DB

---

### Phase 3 — P3: Deep Management Pages

**US6 (Tenant detail)**:
- `/superadmin/tenants/[id]/page.tsx` — full info, stats, payment history, actions

**US7 (Announcements)**:
- `/superadmin/announcements/page.tsx` — create/list/toggle announcements
- `announcement-banner.tsx` — shown in `/dashboard/layout.tsx` for active announcements

**US8 (Audit log)**:
- `/superadmin/audit-log/page.tsx` — paginated table, filter by date/type

**US9 (Settings)**:
- `/superadmin/settings/page.tsx` — convert to editable `PlatformSettings` form
- `platform-settings-form.tsx` — form with bank info, ZainCash, trial duration, maintenance mode

---

### Phase 4 — UX Polish

- Active sidebar link via `usePathname()` in superadmin layout/sidebar
- Add all 7 pages to sidebar navigation
- Announcement banners in dashboard layout

---

## Key Technical Decisions

| Decision | Rationale |
|----------|-----------|
| `PlatformSettings` as singleton (upsert on ID=1) | Simple; no need for multi-record config |
| Client-side tenant search/filter | <50 tenants; no server roundtrip needed |
| Recharts for charts | Already used in project (revenue-chart.tsx) |
| UploadThing for receipt images | Already integrated in project |
| Email via Resend with graceful fallback | Already integrated; non-critical if unconfigured |
| No Stripe removal from .env.example | Keep for migration compatibility per spec assumption |
| Audit log written server-side in actions | Centralized, consistent with existing AuditLog model |

---

## Complexity Tracking

No constitution violations — this feature follows existing project conventions (Server Actions, App Router pages, Prisma models, shadcn/ui components).
