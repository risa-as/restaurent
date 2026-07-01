# 📋 Task Tracker: Restaurant System Refactoring

> **Status**: ✅ **Phase 5 Complete**
> **Last Updated**: 2026-03-02

---

## Phases 1–4 ✅ Complete

- [x] Phase 1: Schema Integrity (Enums, M2M, FKs, Soft Delete)
- [x] Phase 2: RBAC Security (auth-guard + 12 server actions)
- [x] Phase 3: Business Logic (Stock validation, Daily Close, Accountability)
- [x] Phase 4: Cleanup (Soft deletes, debug logs, build fix)

---

## Phase 5: UI/UX & Design System ✅ Complete

> **Spec**: [ui-refactoring-spec.md](./ui-refactoring-spec.md)

### 5A — Design Tokens (globals.css)
- [x] **T-5.1** Replace default HSL palette with warm orange brand colors (`:root`)
- [x] **T-5.2** Add `.dark` counterpart HSL values
- [x] **T-5.3** Add semantic status vars: `--status-pending/preparing/ready/late`
- [x] **T-5.4** Add `--chart-1` through `--chart-5` (brand-aligned palette)
- [x] **T-5.5** Add `Noto Kufi Arabic` + `Inter` fonts via `next/font/google`
- [x] **T-5.6** Remove hardcoded `bg-gray-100`/`bg-gray-50` from layouts

### 5B — Dark Mode (next-themes)
- [x] **T-5.7** ✅ **USER**: `npm install next-themes`
- [x] **T-5.8** Create `src/components/providers/theme-provider.tsx`
- [x] **T-5.9** Wrap `app/layout.tsx` with ThemeProvider
- [x] **T-5.10** Create `ThemeToggle` component (Light/Dark/System dropdown)

### 5C — Global Layout Components
- [x] **T-5.11** Create `GlobalSidebar` — collapsible, role-aware, brand logo
- [x] **T-5.12** Create `GlobalHeader` — dynamic title, user dropdown, ThemeToggle
- [x] **T-5.13** Refactor `app/dashboard/layout.tsx` → GlobalSidebar + GlobalHeader
- [x] **T-5.14** Refactor `app/accountant/layout.tsx` → GlobalHeader
- [x] **T-5.15** Refactor `app/waiter/layout.tsx` → GlobalHeader
- [x] **T-5.16** Refactor `app/delivery/layout.tsx` → GlobalHeader
- [x] **T-5.17** Refactor `app/inventory/layout.tsx` → GlobalHeader
- [x] **T-5.18** ✅ **USER**: `npm run build` — passed

### 5D — Kitchen Display Overhaul
- [x] **T-5.19** Refactor `app/kitchen/layout.tsx` — fullscreen shell with ThemeToggle
- [x] **T-5.20** Update kitchen order cards — 220px min-height, CSS var color border, large order #
- [x] **T-5.21** Add elapsed-time counter (amber ≥10m, red+pulse ≥15m)
- [x] **T-5.22** Auto-refresh: timer updates every 30s via `setInterval` in `useEffect`
- [x] **T-5.23** Item text upgraded to 17px bold, quantity in primary-colored badge

### 5E — POS Touch Optimization
- [x] **T-5.24** Refactor `app/cashier/layout.tsx` — full-height touch shell, no padding
- [x] **T-5.25** Update menu item cards — 120px image height, larger font
- [x] **T-5.26** Update category tabs — 48px height, font-semibold
- [x] **T-5.27** Order summary: fixed right panel (30% width)
- [x] **T-5.28** Charge button — 64px (h-16), total displayed inside button

### 5F — Unified Finance Charts
- [x] **T-5.29** Created `useChartColors()` hook — CSS vars → Recharts hex
- [x] **T-5.30** Updated `RevenueChart` — brand orange line, themed tooltip + grid
- [x] **T-5.31** Updated `CategoryChart` — 5 brand colors, wider donut, themed tooltip

### 5G — Final Verification
- [x] **T-5.32** ✅ **USER**: `npm run build` — passed (35/35 pages)
- [x] **T-5.33** Manual: Light/Dark/System theme toggle available on all pages
- [x] **T-5.34** Manual: Sidebar collapsible, role-based nav links
- [x] **T-5.35** Manual: Kitchen cards with large order #, color borders, time counter
- [x] **T-5.36** Manual: POS 120px cards, 48px tabs, 64px charge button
- [x] **T-5.37** Manual: Arabic RTL layout maintained across all views

---

---

## Phases 6–8: Market Leadership 🚀

> **Spec**: [market-leadership-spec.md](./market-leadership-spec.md)

### Phase 6 — إصلاح الأساس (Foundation Fixes) ✅ Complete
- [x] **T-6.1** Real-time updates via Pusher (Kitchen triggers in `pos.ts`, `kitchen.ts`)
- [x] **T-6.2** PWA Waiter mobile interface (`/waiter` rebuilt — 3-step flow)
- [x] **T-6.3** Dashboard Analytics widget (table occupancy + delivery pipeline cards)
- [x] **T-6.4** Low stock alerts (red badge in `GlobalSidebar` + correct per-item threshold)
- [x] **T-6.5** Export reports to Excel (`export.ts` + buttons on stock + finance pages)

---

### Phase 6.6 — تتبع السائق في الوقت الفعلي (Real-Time Driver Tracking) 🆕

> **Spec**: [04-delivery-tracking-spec.md](./04-delivery-tracking-spec.md)
> **Libraries installed**: `leaflet`, `react-leaflet@4.2.1`, `@types/leaflet`

#### Step 1 — Schema Migration
- [x] **T-6.6.1** Add `lastLat Float?`, `lastLng Float?`, `lastLocAt DateTime?` to `Delivery` model in `schema.prisma`
- [ ] **T-6.6.2** ⏸️ **USER ACTION** — Run in PowerShell:
  ```powershell
  npx prisma migrate dev --name add_delivery_location_fields
  ```

#### Step 2 — API Route (Location Ingestion)
- [x] **T-6.6.3** Created `src/app/api/delivery/location/route.ts`

#### Step 3 — Driver Emitter Component
- [x] **T-6.6.4** Created `src/components/delivery/driver-location-emitter.tsx`
- [x] **T-6.6.5** Wired `DriverLocationEmitter` into `driver-dashboard.tsx` (`DriverOrderCard`)

#### Step 4 — Manager Map Modal
- [x] **T-6.6.6** Created `src/components/delivery/driver-map-modal.tsx` (Leaflet + Pusher)
- [x] **T-6.6.7** Added "📍 تتبع مباشر" button to `delivery-dashboard.tsx` (`DeliveryCard`)

#### Step 5 — Pusher `tracking-ended` Event
- [x] **T-6.6.8** Added `triggerPusher('tracking-ended')` to `updateDeliveryStatus` in `delivery.ts`

#### Step 6 — Verification
- [ ] **T-6.6.9** ⏸️ **USER ACTION** — Manual test: full driver → manager tracking flow (see spec §7)


---

### Phase 7 — التميز التنافسي (Competitive Edge)
- [ ] **T-7.1** Receipt + Kitchen ticket printing (browser-based ESC/POS)
- [ ] **T-7.2** Complete offers/discounts in POS (apply `Offer` model at checkout)
- [ ] **T-7.3** Customer loyalty system (points, redemption, customer model)
- [ ] **T-7.4** Manager mobile view (read-only live dashboard for owner)

### Phase 8 — الهيمنة على السوق (Market Dominance)
- [ ] **T-8.1** Talabat/external delivery platform webhook integration
- [ ] **T-8.2** Public customer reservation page (`/reserve` — no login)
- [ ] **T-8.3** Customer order tracking page (`/track/[orderId]` — real-time)
- [ ] **T-8.4** AI analytics dashboard (peak hours, menu matrix, forecasting)
- [ ] **T-8.5** Multi-branch support (Branch model, scoped queries)

---

## Phase 6.7: Restaurant Service Mode Config 🆕

> **Spec**: [05-dual-service-spec.md](./05-dual-service-spec.md)
> **Added**: 2026-03-03

### الخلفية
لمطاعم تعمل بنظام واحد (إما كاشير مباشر أو خدمة طاولة). سيتم إضافة إعداد مركزي لكل مطعم لتكييف الواجهة.

#### Step 1 — Schema & Seeding

- [ ] **T-6.7.1** ⚠️ أضف إلى `schema.prisma`:
  ```prisma
  enum ServiceMode { QUICK_SERVICE  TABLE_SERVICE }
  model RestaurantConfig {
    id          String      @id @default(cuid())
    serviceMode ServiceMode @default(TABLE_SERVICE)
  }
  ```
  تعديل `Order`:
  ```prisma
  billRequested   Boolean     @default(false)
  billRequestedAt DateTime?
  ```

- [ ] **T-6.7.2** ⏸️ **USER ACTION** — Run `npx prisma migrate dev --name add_restaurant_config` وقُم بإضافة سجل افتراضي للـ `RestaurantConfig` في قاعدة البيانات.

#### Step 2 — Server Actions

- [ ] **T-6.7.3** `config.ts`: أنشئ `getRestaurantConfig()` و `updateServiceMode(mode: ServiceMode)`
- [ ] **T-6.7.4** `waiter.ts`: أنشئ `requestBill(orderId)` (يُحدث الطلب ويُرسل Pusher `bill-requested`)
- [ ] **T-6.7.5** `cashier.ts`: أنشئ `getPendingBills()` و `settleTableBill(orderId)`

#### Step 3 — واجهات المستخدم

- [ ] **T-6.7.6** **Settings Page**: إضافة خيار تغيير `ServiceMode` في صفحة الإعدادات.
- [ ] **T-6.7.7** **Sidebar & Navigation**: جلب الـ config ديناميكياً وإخفاء تبويب `/captain` إذا كان النمط `QUICK_SERVICE`.
- [ ] **T-6.7.8** **Table Service Flow**: 
  - في `/waiter`: إضافة زر "طلب الحساب 🧾" بجانب الطلبات المسلمة (`SERVED`).
  - في `/cashier`: إنشاء `PendingBillsView` وعرضه كصفحة فرعية لكاشير الطاولة للتعامل مع `billRequested = true` مع Pusher Listener.

#### Step 4 — التحقق

- [ ] **T-6.7.9** التحقق من إخفاء/إظهار الكابتن عند تغيير الإعداد، وتدفق الدفع للطاولات.

---

| Phase | Tasks | Status |
|-------|-------|--------|
| Phases 1–4 | All done | ✅ |
| Phase 5 A–G | 37 tasks | ✅ |
| Phase 6 | 5 tasks | ✅ |
| Phase 6.6 | 9 tasks | ⏳ |
| Phase 6.7 | 9 tasks | 🆕 |
| Phase 7 | 4 tasks | ⏳ |
| Phase 8 | 5 tasks | ⏳ |
| **Overall** | **69 tasks** | **🚧 In Progress** |

