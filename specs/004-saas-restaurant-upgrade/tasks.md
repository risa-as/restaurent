# Tasks: Restaurant SaaS Comprehensive Upgrade

**Branch**: `004-saas-restaurant-upgrade`
**Input**: Design documents from `/specs/004-saas-restaurant-upgrade/`
**Total Tasks**: 295
**User Stories**: 17 (US1–US17)
**Organization**: By user story — each story is independently implementable and testable

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P] tasks in the same phase
- **[Story]**: User story label (US1–US17)
- No tests unless explicitly requested; all tasks are implementation tasks

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install new dependencies and configure project-level tooling

- [x] T001 Install new packages: `npm install otplib qrcode @types/qrcode next-intl idb` in project root
- [x] T002 Add `CRON_SECRET` env var to `.env.example` and document in `quickstart.md`
- [x] T003 [P] Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` to `.env.example` (optional, for delivery tracking SMS)
- [x] T004 [P] Create `src/messages/ar.json` with empty object `{}` as Arabic translation base file
- [x] T005 [P] Create `src/messages/ku.json` with empty object `{}` as Kurdish translation base file
- [x] T006 [P] Create `src/messages/en.json` with empty object `{}` as English translation base file

**Checkpoint**: Dependencies installed, env vars documented

---

## Phase 2: Foundational (Blocking Prerequisites — Complete Before Any User Story)

**Purpose**: Database schema migration covering all 17 feature areas. All user story tasks depend on this phase.

**⚠️ CRITICAL**: No user story implementation can begin until this phase is complete.

### 2A: Schema — New Enums

- [x] T007 Add `Language` enum (`AR`, `KU`, `EN`) to `prisma/schema.prisma`
- [x] T008 [P] Add `PurchaseOrderStatus` enum (`DRAFT`, `SENT`, `RECEIVED`, `PARTIALLY_RECEIVED`, `CANCELLED`) to `prisma/schema.prisma`
- [x] T009 [P] Add `VoidRequestStatus` enum (`PENDING`, `APPROVED`, `REJECTED`) to `prisma/schema.prisma`

### 2B: Schema — Modifier System

- [x] T010 Add `ModifierGroup` model to `prisma/schema.prisma` (fields: id, name, nameAr, nameKu, nameEn, isRequired, isVariant, minSelect, maxSelect, sortOrder, tenantId)
- [x] T011 Add `ModifierOption` model to `prisma/schema.prisma` (fields: id, name, nameAr, nameKu, nameEn, priceAdjustment, isDefault, sortOrder, groupId, rawMaterialId, rawMaterialQty)
- [x] T012 Add `MenuItemModifierGroup` junction model to `prisma/schema.prisma` (fields: id, menuItemId, modifierGroupId, sortOrder; unique constraint on pair)
- [x] T013 Add `OrderItemModifier` model to `prisma/schema.prisma` (fields: id, orderItemId, modifierOptionId, appliedPrice)

### 2C: Schema — Auth & Security

- [x] T014 Add `PasswordResetToken` model to `prisma/schema.prisma` (fields: id, tokenHash, userId, expiresAt, usedAt, createdAt)
- [x] T015 [P] Add `LoginAttempt` model to `prisma/schema.prisma` (fields: id, email, ipAddress, success, createdAt; indexes on email+createdAt, ip+createdAt)
- [x] T016 [P] Add `VoidRequest` model to `prisma/schema.prisma` (fields: id, orderId, requestedById, approvedById, status, reason, createdAt, resolvedAt, tenantId)
- [x] T017 Add 2FA fields to `User` model in `prisma/schema.prisma`: `twoFactorEnabled Boolean @default(false)`, `twoFactorSecret String?`, `twoFactorBackupCodes String?`, `twoFactorVerifiedAt DateTime?`

### 2D: Schema — Shift & Split Bill

- [x] T018 Add `CashierShift` model to `prisma/schema.prisma` (fields: id, openedAt, closedAt, openingCash, closingCashEntered, expectedCash, cashVariance, totalCash, totalCard, totalOnline, totalSales, note, cashierId, tenantId, branchId)
- [x] T019 [P] Add `BillSplit` model to `prisma/schema.prisma` (fields: id, orderId, splitIndex, totalAmount, isPaid, billId)
- [x] T020 [P] Add `BillSplitItem` model to `prisma/schema.prisma` (fields: id, splitId, orderItemId)

### 2E: Schema — Inventory & Procurement

- [x] T021 Add `PurchaseOrder` model to `prisma/schema.prisma` (fields: id, poNumber, status, supplierId, expectedDate, receivedDate, totalCost, notes, createdById, tenantId, branchId, createdAt)
- [x] T022 Add `PurchaseOrderItem` model to `prisma/schema.prisma` (fields: id, purchaseOrderId, materialId, orderedQty, receivedQty, unitCost)
- [x] T023 Add `InventoryBatch` model to `prisma/schema.prisma` (fields: id, materialId, poItemId, receivedQty, remainingQty, unitCost, expiryDate, receivedAt, tenantId, branchId; index on expiryDate)

### 2F: Schema — Delivery, Talabat, KDS

- [x] T024 Add `DeliveryTrackingToken` model to `prisma/schema.prisma` (fields: id, tokenHash, deliveryId, createdAt; unique on tokenHash and deliveryId)
- [x] T025 [P] Add `TalabatConfig` model to `prisma/schema.prisma` (fields: id, tenantId, storeId, apiKey, webhookSecret, isEnabled, lastSyncAt, branchId)
- [x] T026 [P] Add `TalabatOrder` model to `prisma/schema.prisma` (fields: id, talabatOrderId, orderId, rawPayload, createdAt; unique on talabatOrderId and orderId)
- [x] T027 [P] Add `KitchenStation` model to `prisma/schema.prisma` (fields: id, name, nameAr, nameKu, colour, sortOrder, tenantId, branchId)
- [x] T028 [P] Add `MenuItemStation` junction model to `prisma/schema.prisma` (fields: id, menuItemId, stationId; unique on pair)

### 2G: Schema — Seasonal, Feedback, Language

- [x] T029 Add `SeasonalMenu` model to `prisma/schema.prisma` (fields: id, name, startDate, endDate, isActive, tenantId, branchId, createdAt)
- [x] T030 [P] Add `SeasonalMenuCategory` junction model to `prisma/schema.prisma` (fields: id, seasonalMenuId, categoryId; unique on pair)
- [x] T031 [P] Add `SeasonalHours` model to `prisma/schema.prisma` (fields: id, seasonalMenuId, dayOfWeek, openTime, closeTime)
- [x] T032 [P] Add `CustomerFeedback` model to `prisma/schema.prisma` (fields: id, orderId, rating, comment, createdAt, tenantId, branchId; unique on orderId)

### 2H: Schema — Existing Model Extensions

- [x] T033 Add language & 2FA-related relations to `User` model in `prisma/schema.prisma`: `language Language @default(AR)`, `passwordResetTokens PasswordResetToken[]`, `cashierShifts CashierShift[]`, `purchaseOrders PurchaseOrder[]`, `voidRequestsMade VoidRequest[]`, `voidRequestsApproved VoidRequest[]`
- [x] T034 [P] Add multilingual fields to `MenuItem` in `prisma/schema.prisma`: `nameAr String?`, `nameKu String?`, `nameEn String?`, `prepTimeMins Int?`; add relations `modifierGroups MenuItemModifierGroup[]`, `stations MenuItemStation[]`
- [x] T035 [P] Add multilingual fields to `Category` in `prisma/schema.prisma`: `nameAr String?`, `nameKu String?`, `nameEn String?`
- [x] T036 [P] Extend `OrderItem` in `prisma/schema.prisma`: add `prepStartedAt DateTime?`, `modifiers OrderItemModifier[]`, `billSplitItems BillSplitItem[]`
- [x] T037 [P] Extend `Bill` in `prisma/schema.prisma`: add `shiftId String?`, `shift CashierShift?`, `splitId String?`, `split BillSplit?`
- [x] T038 [P] Extend `Order` in `prisma/schema.prisma`: add `qrSessionToken String?`, `feedback CustomerFeedback?`, `voidRequest VoidRequest?`, `billSplits BillSplit[]`, `talabatOrder TalabatOrder?`
- [x] T039 [P] Extend `Delivery` in `prisma/schema.prisma`: add `trackingToken DeliveryTrackingToken?`
- [x] T040 [P] Extend `RawMaterial` in `prisma/schema.prisma`: add `batches InventoryBatch[]`, `modifierOptions ModifierOption[]`
- [x] T041 [P] Extend `Tenant` in `prisma/schema.prisma`: add `language Language @default(AR)`, `googlePlaceId String?`, all new model relations
- [x] T042 [P] Extend `AuditLog` in `prisma/schema.prisma`: add `entityType String?`, `entityId String?`, `valueBefore String?`, `valueAfter String?`, `ipAddress String?`, `tenantId String?`

### 2I: Run Migration

- [x] T043 Run `npx prisma migrate dev --name 004-saas-upgrade` from project root and resolve any migration errors
- [x] T044 Run `npx prisma generate` to regenerate Prisma client after migration
- [x] T045 [P] Verify migration with `npx prisma validate` — fix any schema errors

**Checkpoint**: Database schema fully updated. All user story phases can now begin.

---

## Phase 3: US1 — Item Modifiers & Variants (Priority: P1) 🎯 MVP

**Goal**: Staff can attach customisation groups (size, extras, cooking degree) to menu items. Orders carry modifier selections. Kitchen tickets and receipts show them.

**Independent Test**: Create a menu item with a required modifier group. Place an order via the captain interface selecting a modifier. Confirm the kitchen ticket and receipt show the modifier name and price adjustment.

### Implementation: Server Actions

- [x] T046 [US1] Create `src/lib/actions/modifiers.ts` with `getModifierGroups(tenantId)`, `createModifierGroup(data)`, `updateModifierGroup(id, data)`, `deleteModifierGroup(id)` actions
- [x] T047 [US1] Add `assignModifierGroupToItem(menuItemId, groupId, sortOrder)` and `removeModifierGroupFromItem(menuItemId, groupId)` to `src/lib/actions/modifiers.ts`
- [x] T048 [US1] Add `getItemModifiers(menuItemId)` to `src/lib/actions/modifiers.ts` returning groups with their options sorted by `sortOrder`
- [x] T049 [US1] Extend `src/lib/actions/captain.ts` `createCaptainOrder` to accept `modifiers: { orderItemIndex, modifierOptionId }[]`, validate required groups are satisfied, and create `OrderItemModifier` records with `appliedPrice` snapshotted from `ModifierOption.priceAdjustment`
- [x] T050 [US1] Extend `src/lib/actions/pos.ts` `createOrder` identically to T049 (same modifier validation and `OrderItemModifier` creation logic)
- [x] T051 [US1] Extend `src/lib/actions/order-completion.ts` inventory deduction to include modifier option `rawMaterialQty` deductions alongside base recipe deductions

### Implementation: Zod Validation

- [x] T052 [US1] Add modifier validation schemas to `src/lib/validations/menu.ts`: `modifierGroupSchema`, `modifierOptionSchema` with min/max/required field validation

### Implementation: Admin UI

- [x] T053 [US1] Create `src/components/menu/modifier-group-manager.tsx` — a collapsible section inside the menu item edit sheet listing attached modifier groups with add/remove/reorder controls
- [x] T054 [P] [US1] Create `src/components/menu/modifier-option-form.tsx` — inline form for adding/editing options within a group (name, price adjustment, raw material link)
- [x] T055 [US1] Add "مجموعات التعديل" tab to `src/components/menu/add-item-sheet.tsx` rendering `ModifierGroupManager` for existing items
- [x] T056 [P] [US1] Add "مجموعات مشتركة" management page `src/app/dashboard/menu/modifiers/page.tsx` for creating reusable modifier groups that can be shared across items

### Implementation: Order Form Integration

- [x] T057 [US1] Create `src/components/menu/modifier-picker-modal.tsx` — a modal triggered when adding an item to cart that lists all modifier groups for that item; blocks cart addition until required groups are satisfied
- [x] T058 [US1] Integrate `ModifierPickerModal` into `src/components/captain/captain-order-form.tsx` — opens when item is tapped, injects selected modifiers into order payload
- [x] T059 [US1] Integrate `ModifierPickerModal` into `src/components/cashier/cashier-menu.tsx` — same flow as captain integration
- [x] T060 [US1] Update `src/components/cashier/cashier-cart.tsx` to display selected modifiers under each cart item with their price adjustments

### Implementation: Kitchen & Receipt Display

- [x] T061 [US1] Update `src/components/kitchen/kitchen-ticket.tsx` to render `OrderItemModifier` selections (fetched via `getOrderDetails`) beneath each order item line
- [x] T062 [P] [US1] Update `src/components/orders/receipt.tsx` to render modifier names and their price adjustments below each line item
- [x] T063 [US1] Update `src/lib/actions/kitchen.ts` `getKitchenOrders` to include `items.modifiers.modifierOption` in the Prisma `include` clause

**Checkpoint**: Modifier groups fully functional — admin creates groups, staff selects on order, kitchen/receipt display them.

---

## Phase 4: US2 — QR Self-Ordering (Priority: P1)

**Goal**: Customers scan a table QR code, browse the menu in Arabic, place orders with modifiers, and track order status — all without staff involvement.

**Independent Test**: Scan a table QR on a mobile browser. Add items with modifiers. Submit order. Verify it appears in `/captain` and `/kitchen` instantly.

### Implementation: Route & Session

- [x] T064 [US2] Create route group `src/app/(customer)/` with a layout `src/app/(customer)/layout.tsx` that is excluded from NextAuth middleware (add pattern to `src/middleware.ts` matcher exclusions)
- [x] T065 [US2] Create `src/app/(customer)/[slug]/order/page.tsx` — server component that fetches tenant by slug + validates tableId query param; issues `qr_session` UUID cookie if absent; renders client component
- [x] T066 [US2] Create `src/app/(customer)/[slug]/order/order-client.tsx` — client component managing cart state, modifier selections, order submission, and real-time status polling

### Implementation: API Routes

- [x] T067 [US2] Create `src/app/api/qr/order/route.ts` — POST endpoint: validates `qr_session` cookie, validates table exists and is OCCUPIED/AVAILABLE, validates required modifiers, creates Order + OrderItems + OrderItemModifiers, sets `Order.qrSessionToken`, triggers Pusher `new-order` event on `kitchen-{branchId}`
- [x] T068 [US2] Create `src/app/api/qr/order-status/route.ts` — GET endpoint: validates `qr_session` against `Order.qrSessionToken`, returns order status and item-level statuses
- [x] T069 [US2] Create `src/app/api/qr/bill-request/route.ts` — POST endpoint: validates session, sets `Order.billRequested = true` and `billRequestedAt`, triggers Pusher event `bill-requested` on `captain-{branchId}`

### Implementation: Customer UI Components

- [x] T070 [US2] Create `src/components/customer/qr-menu.tsx` — mobile-first Arabic menu with category tabs, item cards (image + name + price), "إضافة للسلة" button; triggers modifier picker if item has required groups
- [x] T071 [P] [US2] Create `src/components/customer/qr-cart.tsx` — floating cart drawer showing selected items with modifiers, quantities, subtotal, notes field, and "إرسال الطلب" submit button
- [x] T072 [US2] Create `src/components/customer/qr-order-tracker.tsx` — post-submission view showing order status stages (received → preparing → ready), item list with per-item statuses, and "اطلب الفاتورة" button; subscribes to Pusher `table-{tableId}` for live updates
- [x] T073 [US2] Add Arabic RTL styling in `src/app/globals.css` for `.customer-page` class: `direction: rtl; font-family: 'Cairo', sans-serif;`

### Implementation: QR Code & Table Integration

- [x] T074 [US2] Update `src/app/dashboard/tables/page.tsx` QR generation to produce URL format `/{tenantSlug}/order?t={tableId}` instead of any previous format
- [x] T075 [US2] Update `src/components/tables/table-map.tsx` to show a "QR" icon button on each table that opens a modal with the printable QR code for that table

**Checkpoint**: Customer can scan QR, order food, track status, and request bill — zero staff involvement required.

---

## Phase 5: US3 — Password Reset Flow (Priority: P1)

**Goal**: Any staff member who forgets their password can self-serve via email reset, no admin intervention needed.

**Independent Test**: Request a reset for a test account. Receive email. Use the link within 30 minutes. Set a new password. Log in successfully.

### Implementation: Token Utilities

- [x] T076 [US3] Create `src/lib/password-reset.ts` with `generateResetToken()` (returns `{ raw, hash }` using `crypto.randomBytes(32)`), `hashToken(raw)` (SHA-256), and `validateResetToken(raw, userId)` (checks hash, expiry, usedAt)

### Implementation: Email Templates

- [x] T077 [US3] Create `src/emails/PasswordResetEmail.tsx` — React Email component with reset link button, 30-minute expiry warning, Arabic text
- [x] T078 [P] [US3] Create `src/emails/PasswordChangedEmail.tsx` — React Email confirmation email sent after successful password change

### Implementation: API Routes

- [x] T079 [US3] Create `src/app/api/auth/forgot-password/route.ts` — POST: rate-limit 3 req/10 min per email (check `LoginAttempt` table); look up user by email; if found, create `PasswordResetToken`, send `PasswordResetEmail` via Resend; always return `{ success: true }`
- [x] T080 [US3] Create `src/app/api/auth/reset-password/route.ts` — POST: accept `{ token, newPassword, confirmPassword }`; validate passwords match and meet minimum length; call `validateResetToken`; hash new password with bcrypt; update `User.password`; mark token `usedAt`; send `PasswordChangedEmail`

### Implementation: Pages

- [x] T081 [US3] Create `src/app/forgot-password/page.tsx` — page with email input form and submit button
- [x] T082 [P] [US3] Create `src/components/auth/forgot-password-form.tsx` — client component with email field, submit handler calling `/api/auth/forgot-password`, success/error state display
- [x] T083 [US3] Create `src/app/reset-password/page.tsx` — page that reads `?token=` query param and renders the new password form
- [x] T084 [P] [US3] Create `src/components/auth/reset-password-form.tsx` — client component with new/confirm password fields, calls `/api/auth/reset-password`
- [x] T085 [US3] Add "نسيت كلمة المرور؟" link to `src/components/auth/login-form.tsx` pointing to `/forgot-password`

**Checkpoint**: Full self-service password reset works end-to-end with email delivery.

---

## Phase 6: US4 — Offline Mode / PWA (Priority: P1)

**Goal**: Cashier and captain can continue taking orders during internet outages; orders sync automatically on reconnect.

**Independent Test**: Open `/cashier` in Chrome DevTools. Set Network to Offline. Create 2 orders. Set Network back to Online. Verify both orders appear in the system.

### Implementation: Service Worker & PWA Config

- [x] T086 [US4] Update `next.config.js` to configure `next-pwa` with runtime caching: `CacheFirst` for `/_next/static/*`, `NetworkFirst` (5s timeout) for `/api/menu/*` and `/api/qr/order-status`, `StaleWhileRevalidate` for page navigations
- [x] T087 [US4] Add `public/manifest.json` PWA manifest update: set `name`, `short_name`, `start_url`, `display: standalone`, `theme_color` matching tenant primary color (static default `#f97316`)

### Implementation: Offline Queue (IndexedDB)

- [x] T088 [US4] Create `src/lib/offline-queue.ts` (client-only, `'use client'`) with `initDB()` (open IndexedDB store `offlineOrders`), `enqueueOrder(payload: object)` (store with `clientCreatedAt` + UUID `clientId`), `getPendingOrders()`, `removeOrder(clientId)`, `drainQueue(submitFn)` (iterate pending, call submitFn, remove on success)
- [x] T089 [US4] Create `src/hooks/use-offline-sync.ts` — React hook that registers `window.addEventListener('online', drainQueue)` on mount, exposes `isOnline` state, `pendingCount`

### Implementation: Connection Indicator

- [x] T090 [US4] Update `src/components/ui/connection-dot.tsx` to render a full-width orange banner "⚠️ وضع عدم الاتصال — الطلبات محفوظة محلياً" when `navigator.onLine === false`
- [x] T091 [US4] Add `ConnectionDot` / offline banner to `src/app/cashier/layout.tsx` and `src/app/captain/layout.tsx`

### Implementation: Offline-Aware Order Submission

- [x] T092 [US4] Update `src/components/cashier/cashier-interface.tsx` order submission: wrap the server action call in `try/catch`; on network failure, call `enqueueOrder(payload)` instead; show toast "تم حفظ الطلب محلياً"
- [x] T093 [US4] Update `src/components/captain/captain-order-form.tsx` order submission: same offline fallback pattern as T092
- [x] T094 [US4] Add `useOfflineSync` hook call in `src/app/cashier/layout.tsx` so the queue drains automatically when the cashier page loads while online

**Checkpoint**: Cashier and captain pages work fully offline; orders sync on reconnect.

---

## Phase 7: US17 — Security Hardening Core (Priority: P1)

**Goal**: Login lockout, session expiry, CSP headers, CORS, and audit log wrapper are in place before launch.

**Independent Test**: Attempt 10 consecutive failed logins — verify 15-min lockout message. Check browser DevTools response headers for `Content-Security-Policy`. Attempt cross-origin fetch to `/api/menu` from a non-allowed origin — verify 403.

### Implementation: Login Lockout

- [x] T095 [US17] Add `LoginAttempt` write logic to `src/lib/auth.config.ts` `authorize` callback: after each failed attempt create a `LoginAttempt` record; before attempting password check, count failures in last 15 min — if ≥ 10, return `null` with error "الحساب مقفل مؤقتاً، حاول بعد 15 دقيقة"
- [x] T096 [US17] Add success cleanup to `authorize`: on successful password match, `deleteMany` where `email = email AND success = false`

### Implementation: Session Expiry

- [x] T097 [US17] Set `maxAge: 8 * 60 * 60` on the NextAuth JWT config in `src/lib/auth.ts`
- [x] T098 [US17] Add client-side idle expiry in `src/app/layout.tsx`: `useEffect(() => { const t = setTimeout(signOut, 8*60*60*1000); return () => clearTimeout(t); }, [])`

### Implementation: CSP & CORS Headers

- [x] T099 [US17] Add `headers()` export to `next.config.js` defining `Content-Security-Policy` header with nonce placeholder for all routes; include `script-src 'self' 'nonce-{nonce}' https://js.pusher.com`, `connect-src 'self' wss://*.pusher.com https://api.stripe.com`, `frame-ancestors 'none'`
- [x] T100 [US17] Add nonce generation to `src/middleware.ts`: `crypto.randomUUID()` per request, set `x-nonce` response header; update CSP header to inject the nonce
- [x] T101 [US17] Add CORS check in `src/middleware.ts` for `/api/*` routes: if `Origin` header is set and not in `[process.env.NEXT_PUBLIC_ROOT_DOMAIN, '*.'+NEXT_PUBLIC_ROOT_DOMAIN]`, return `Response` with status 403

### Implementation: Audit Log Wrapper

- [x] T102 [US17] Create `src/lib/audit.ts` with `withAudit<T>(ctx, action, entityType, entityId, fn)` async wrapper that fetches entity before, runs fn(), fetches entity after, writes `AuditLog` with `valueBefore`/`valueAfter` as JSON strings
- [x] T103 [US17] Apply `withAudit` in `src/lib/actions/finance.ts` `addExpense`, `deleteExpense`, `performDailyClose`
- [x] T104 [P] [US17] Apply `withAudit` in `src/lib/actions/cashier.ts` `markOrderAsPaid`, `settleTableBill`
- [x] T105 [P] [US17] Apply `withAudit` in `src/lib/actions/captain.ts` `markOrderCompleted`

**Checkpoint**: Login lockout active, session expires in 8h, CSP/CORS headers present, financial actions audited.

---

## Phase 8: US5 — Split Bill (Priority: P2)

**Goal**: Cashier can split a table order into multiple payment portions, each settled independently.

**Independent Test**: Create a 6-item table order. Split equally into 2. Pay the first half with cash, second with card. Verify order status becomes COMPLETED and both bills are recorded separately.

### Implementation: Server Actions

- [x] T106 [US5] Create `src/lib/actions/splits.ts` with `createEqualSplit(orderId, n)` — creates n `BillSplit` records dividing `Order.totalAmount` equally
- [x] T107 [US5] Add `createItemSplit(orderId, assignments: { orderItemIds, splitIndex }[])` to `src/lib/actions/splits.ts` — creates `BillSplit` + `BillSplitItem` records per assignment, totals computed from `OrderItem.totalPrice` sums
- [x] T108 [US5] Add `settlePartialBill(splitId, paymentMethod, shiftId?)` to `src/lib/actions/splits.ts` — creates `Bill` linked to `BillSplit`, marks `BillSplit.isPaid = true`; if all splits for the order are paid, sets `Order.status = COMPLETED`
- [x] T109 [US5] Add `getOrderSplits(orderId)` to `src/lib/actions/splits.ts` — returns all splits with their items and paid status

### Implementation: UI

- [x] T110 [US5] Create `src/components/cashier/split-bill-drawer.tsx` — sheet component with two tabs: "تقسيم متساوٍ" (number input for n-way split) and "تقسيم حسب الأصناف" (drag-assign items to portions)
- [x] T111 [US5] Add "تقسيم الفاتورة" button to `src/components/cashier/pending-bills-view.tsx` that opens `SplitBillDrawer` for the selected order
- [x] T112 [US5] Add portion payment flow inside `SplitBillDrawer`: each unpaid portion shows payment method selector and "دفع" button calling `settlePartialBill`; paid portions show green checkmark with method used

**Checkpoint**: Table order split and multi-payment works end-to-end.

---

## Phase 9: US6 — Shift Management (Priority: P2)

**Goal**: Cashiers open shifts with starting cash, all sales are tracked per shift, and shift-close generates a cash variance report.

**Independent Test**: Open a shift with IQD 50,000. Process 3 cash orders and 1 card order. Close shift entering the correct physical cash amount. Verify shift report shows zero variance.

### Implementation: Server Actions

- [x] T113 [US6] Create `src/lib/actions/shifts.ts` with `openShift(cashierId, branchId, openingCash)` — creates `CashierShift`, stores `shiftId` in a server-side cookie `current_shift`
- [x] T114 [US6] Add `closeShift(shiftId, physicalCashCount)` to `src/lib/actions/shifts.ts` — computes `expectedCash = openingCash + totalCash`, sets `cashVariance`, sets `closedAt`
- [x] T115 [US6] Add `getCurrentShift(cashierId, branchId)` and `getShiftHistory(branchId, from, to)` to `src/lib/actions/shifts.ts`
- [x] T116 [US6] Extend `src/lib/actions/cashier.ts` `markOrderAsPaid` / `settleTableBill` to accept optional `shiftId` and write it to `Bill.shiftId`; also accumulate shift totals (`totalCash`, `totalCard`, etc.) on the `CashierShift` record

### Implementation: Shift Enforcement & UI

- [x] T117 [US6] Update `src/app/cashier/page.tsx` server component to call `getCurrentShift`; if no open shift found, pass `requiresShift: true` prop to the client component
- [x] T118 [US6] Create `src/components/cashier/shift-open-modal.tsx` — full-screen modal shown when `requiresShift` is true; opening cash input + "فتح الوردية" button; non-dismissable
- [x] T119 [US6] Create `src/components/cashier/shift-close-modal.tsx` — drawer with summary of current shift totals, physical cash count input, variance preview, and "إغلاق الوردية" confirm button
- [x] T120 [US6] Add "إغلاق الوردية" button to cashier page header that opens `ShiftCloseModal`
- [x] T121 [US6] Add "ورديات" tab to `src/app/dashboard/accountant/cashier/page.tsx` rendering a table of shift history with columns: cashier, opened, closed, total sales, cash variance; link to shift detail

**Checkpoint**: Cashiers cannot process payments without an open shift; shift reports show accurate totals.

---

## Phase 10: US7 — Purchase Orders & Stock Expiry (Priority: P2)

**Goal**: Store managers create formal purchase orders, receive goods with batch expiry dates, get alerts before batches expire, and FIFO stock consumption is automatic.

**Independent Test**: Create a PO for chicken. Receive it with expiry 5 days out. Check that a dashboard alert appears. Place an order that uses chicken — verify the oldest batch is consumed first.

### Implementation: FIFO Utility

- [x] T122 [US7] Create `src/lib/inventory-fifo.ts` with `consumeStock(tx: PrismaTransaction, materialId, qty, tenantId, branchId)` — queries `InventoryBatch` ordered by `expiryDate ASC NULLS LAST, receivedAt ASC`, deducts `remainingQty` until `qty` consumed, updates batches in the same transaction
- [x] T123 [US7] Update `src/lib/actions/order-completion.ts` to call `consumeStock` from `inventory-fifo.ts` instead of direct `currentStock` decrement on `RawMaterial`

### Implementation: Server Actions

- [x] T124 [US7] Create `src/lib/actions/purchase-orders.ts` with `createPurchaseOrder(data)` — generates PO number (`PO-YYYY-NNNN`), creates `PurchaseOrder` in DRAFT status
- [x] T125 [US7] Add `submitPurchaseOrder(id)` to `src/lib/actions/purchase-orders.ts` — sets status to SENT
- [x] T126 [US7] Add `receiveGoods(poId, receivedItems: { poItemId, receivedQty, expiryDate? }[])` — creates `InventoryBatch` per line, increments `RawMaterial.currentStock`, updates PO status to RECEIVED or PARTIALLY_RECEIVED
- [x] T127 [US7] Add `getPurchaseOrders(branchId, status?)` and `getPurchaseOrderDetail(id)` to `src/lib/actions/purchase-orders.ts`
- [x] T128 [US7] Add `getExpiringBatches(branchId, withinDays)` to `src/lib/actions/purchase-orders.ts` — returns batches where `expiryDate <= now + withinDays days AND remainingQty > 0`

### Implementation: Cron Route

- [x] T129 [US7] Create `src/app/api/cron/expiry-check/route.ts` — GET: validates `Authorization: Bearer {CRON_SECRET}`; calls `getExpiringBatches` for all active branches; for each result sends Pusher notification to `store-manager-{branchId}` channel with event `expiry-alert`

### Implementation: UI

- [x] T130 [US7] Create `src/app/inventory/purchase-orders/page.tsx` — page listing POs with status badges; "إنشاء طلب شراء" button
- [x] T131 [P] [US7] Create `src/components/inventory/purchase-order-form.tsx` — form with supplier select, line items (material + qty + unit cost), expected delivery date, submit buttons for DRAFT and SENT
- [x] T132 [P] [US7] Create `src/components/inventory/receive-goods-form.tsx` — form showing PO lines with received qty and optional expiry date inputs; "تأكيد الاستلام" button
- [x] T133 [US7] Create `src/components/inventory/batch-expiry-list.tsx` — dashboard widget in `/inventory` page showing batches expiring within 7 days, colour-coded (orange=7d, red=3d, grey=expired)

**Checkpoint**: Formal procurement workflow active; FIFO consumption working; expiry alerts firing.

---

## Phase 11: US8 — Customer Delivery Tracking (Priority: P2)

**Goal**: Customers receive a WhatsApp/SMS link to a live map page showing the driver's position and order stages.

**Independent Test**: Create a delivery order, assign driver, open the public tracking URL in an incognito tab. Update driver location via the existing driver emitter. Verify the map marker moves.

### Implementation: Token & Notification

- [x] T134 [US8] Create `src/lib/delivery-tracking.ts` with `generateTrackingToken(deliveryId)` — creates `DeliveryTrackingToken` record (SHA-256 hash of 32-byte random hex); returns raw token for inclusion in notification
- [x] T135 [US8] Add `sendTrackingNotification(delivery, rawToken)` to `src/lib/delivery-tracking.ts` — if Twilio env vars set, send SMS via Twilio REST API; otherwise log the URL to console; URL format: `{ROOT_DOMAIN}/track/{rawToken}`
- [x] T136 [US8] Update `src/lib/actions/delivery.ts` `assignDriver(deliveryId, driverId)` to call `generateTrackingToken` and `sendTrackingNotification` after successful driver assignment

### Implementation: ETA Utility

- [x] T137 [US8] Create `src/lib/haversine.ts` with `calculateDistanceKm(lat1, lng1, lat2, lng2)` (Haversine formula) and `estimateEtaMinutes(driverLat, driverLng, destLat, destLng, avgSpeedKmh = 30)` (distance/speed, minimum 5 min)

### Implementation: Public Tracking Page

- [x] T138 [US8] Create `src/app/track/[token]/page.tsx` — server component: hash raw token, look up `DeliveryTrackingToken`, load `Delivery` with `order.status`, `lastLat`, `lastLng`, delivery address; pass to client component
- [x] T139 [US8] Create `src/components/delivery/tracking-page.tsx` — client component: renders Leaflet map centred on delivery address, driver marker (updates via Pusher `delivery-{deliveryId}`), order stage progress bar (4 stages), ETA display
- [x] T140 [US8] Update `src/components/delivery/driver-location-emitter.tsx` to also emit on `delivery-{deliveryId}` channel (in addition to any existing channel) so the public tracking page receives location events

**Checkpoint**: Customers can track deliveries in real time without logging in.

---

## Phase 12: US9 — Two-Factor Authentication (Priority: P2)

**Goal**: ADMIN and SUPER_ADMIN accounts are protected by TOTP 2FA. SUPER_ADMIN is forced to set up 2FA on first login.

**Independent Test**: Enable 2FA on an ADMIN account. Log out. Log back in — verify TOTP prompt appears. Enter correct code — verify access granted.

### Implementation: TOTP Utilities

- [x] T141 [US9] Create `src/lib/totp.ts` with `generateTotpSecret()` (returns base32 secret via `otplib.authenticator.generateSecret()`), `generateQrUrl(email, secret, appName)` (returns otpauth URI), `verifyTotp(token, secret)` (returns boolean), `generateBackupCodes(n=8)` (returns array of `XXXXX-XXXXX` strings)
- [x] T142 [US9] Add `encryptSecret(secret)` and `decryptSecret(encrypted)` to `src/lib/totp.ts` using `crypto.createCipheriv('aes-256-gcm', ...)` with `AUTH_SECRET` as key (derived via SHA-256 to 32 bytes)

### Implementation: API Routes

- [x] T143 [US9] Create `src/app/api/auth/2fa/setup/route.ts` — POST (authenticated partial session): call `generateTotpSecret()`, generate QR data URL with `qrcode.toDataURL`, call `generateBackupCodes()`, return all three; do NOT save to DB yet (save only on verification)
- [x] T144 [US9] Create `src/app/api/auth/2fa/verify/route.ts` — POST: accept `{ code, secret, backupCodes, isSetup }`: if `isSetup`, verify TOTP and save encrypted secret + hashed backup codes to `User`; if login step, fetch secret from DB, verify TOTP; issue full session on success
- [x] T145 [US9] Create `src/app/api/auth/2fa/backup/route.ts` — POST: accept `{ backupCode }`; bcrypt-compare against stored hashes; mark code as consumed (remove from array); issue full session

### Implementation: Auth Flow Modification

- [x] T146 [US9] Modify `src/lib/auth.config.ts` `authorize` callback: after successful password validation, if `user.twoFactorEnabled === true`, return `{ ...user, requires2FA: true, id: user.id }` partial object
- [x] T147 [US9] Update `src/middleware.ts` to detect `requires2FA: true` in session JWT and redirect to `/auth/2fa` for all non-2FA routes; also detect SUPER_ADMIN without `twoFactorEnabled` and redirect to `/auth/2fa?setup=true`

### Implementation: UI Pages

- [x] T148 [US9] Create `src/app/auth/2fa/page.tsx` — reads `?setup=true` param; renders either setup flow (QR + verification) or login verification step
- [x] T149 [P] [US9] Create `src/components/auth/two-factor-setup.tsx` — shows QR code image, secret key, backup codes list; TOTP input field; "تأكيد الإعداد" button
- [x] T150 [P] [US9] Create `src/components/auth/two-factor-verify.tsx` — 6-digit code input with "تحقق" button and "استخدم رمز الطوارئ" fallback link
- [x] T151 [US9] Add "المصادقة الثنائية" section to `src/app/dashboard/settings/page.tsx` showing current 2FA status and enable/disable controls

**Checkpoint**: 2FA working for ADMIN; SUPER_ADMIN forced through setup on first login.

---

## Phase 13: US10 — Talabat Integration (Priority: P2)

**Goal**: Talabat orders appear automatically in the POS; POS status changes update Talabat; menu syncs with one click.

**Independent Test**: POST a simulated Talabat webhook payload to `/api/webhooks/talabat`. Verify a new order appears in the POS captain interface. Change the order status. Verify the console shows a Talabat status update call.

### Implementation: Talabat Client

- [x] T152 [US10] Create `src/lib/talabat.ts` with `TalabatClient` class: `constructor(config: TalabatConfig)`, `verifySignature(rawBody, signature)` (HMAC-SHA256 `crypto.timingSafeEqual`), `updateOrderStatus(talabatOrderId, status, eta?)` (POST to Talabat API), `syncMenu(categories)` (PUT to Talabat menu API)

### Implementation: Webhook Route

- [x] T153 [US10] Create `src/app/api/webhooks/talabat/route.ts` — POST: read raw body via `request.text()`; find `TalabatConfig` by `storeId` from payload; call `verifySignature`; check `TalabatOrder` idempotency; map Talabat items to `MenuItem` IDs via `TalabatConfig.itemMapping` JSON; create `Order` + `OrderItems`; create `TalabatOrder` record; trigger Pusher `new-order` on `kitchen-{branchId}`; return `{ received: true }`

### Implementation: Status Sync

- [x] T154 [US10] Update `src/lib/actions/captain.ts` `markOrderCompleted` and `updateOrderStatus` to check if the order has a linked `TalabatOrder`; if so, call `talabatClient.updateOrderStatus(talabatOrderId, newStatus)`

### Implementation: Menu Sync & Admin UI

- [x] T155 [US10] Create `src/lib/actions/talabat.ts` with `syncMenuToTalabat(tenantId)` — load all active categories and items, format per Talabat contract, call `talabatClient.syncMenu()`; update `TalabatConfig.lastSyncAt`
- [x] T156 [US10] Create `src/app/dashboard/settings/talabat/page.tsx` — settings page for ADMIN: toggle enable/disable, enter store ID and API key, item mapping table (Talabat item ID → local MenuItem), "مزامنة القائمة" button, last sync time display

**Checkpoint**: Talabat orders arrive automatically; status syncs; menu push works.

---

## Phase 14: US11 — Kitchen Stations / KDS (Priority: P3)

**Goal**: Large kitchens can route items to dedicated stations (grill, fryer, etc.), each with its own display screen.

**Independent Test**: Create 2 stations. Assign different items to each. Place an order with items from both stations. Open each station URL — verify each shows only its assigned items.

### Implementation: Server Actions

- [x] T157 [US11] Create `src/lib/actions/kitchen-stations.ts` with `createStation(data)`, `updateStation(id, data)`, `deleteStation(id)`, `getStations(branchId)`, `assignItemToStation(menuItemId, stationId)`, `removeItemFromStation(menuItemId, stationId)`
- [x] T158 [US11] Add `getStationOrders(stationId, branchId)` to `src/lib/actions/kitchen-stations.ts` — returns active orders filtered to items assigned to the station via `MenuItemStation`
- [x] T159 [US11] Add `markStationItemsReady(orderItemIds: string[])` — sets `OrderItem.status = READY`; checks if all items for the parent order are READY; if so, sets `Order.status = READY` and triggers Pusher `order-ready` event

### Implementation: Pages & Components

- [x] T160 [US11] Create `src/app/kitchen/station/[stationId]/page.tsx` — fetches station info + orders; renders station board with station name and colour in header
- [x] T161 [US11] Create `src/components/kitchen/station-board.tsx` — displays order cards for the station showing only station-assigned items; "إنجاز" button per item group; prep-time timer per item with red highlight when exceeded (checks every 30s)
- [x] T162 [US11] Add "محطات المطبخ" management section to `src/app/dashboard/admin/page.tsx` — create/edit/delete stations; assign items to stations via searchable item list

**Checkpoint**: Each kitchen station has its own screen showing only its items; order auto-advances to READY.

---

## Phase 15: US12 — Digital Menu Boards (Priority: P3)

**Goal**: Restaurant TVs display a live-updating menu board that reflects availability changes within 10 seconds.

**Independent Test**: Open `/display/{slug}` on a large screen. Toggle an item as unavailable in the admin panel. Verify it disappears from the board within 10 seconds.

### Implementation

- [x] T163 [US12] Create `src/app/display/[slug]/page.tsx` — public, no-auth server component; loads tenant branding, all available categories and items; renders client component with `?kiosk=true` and `?theme=` support
- [x] T164 [US12] Create `src/components/display/menu-board.tsx` — client component: fullscreen dark-mode grid layout; category tabs; item cards (image, name, price, large text); subscribes to Pusher `menu-{tenantId}` channel for `menu-updated` events; on event, re-fetches menu data
- [x] T165 [US12] Trigger Pusher `menu-updated` event on `menu-{tenantId}` in `src/lib/actions/menu.ts` for `updateMenuItem`, `createMenuItem`, `deleteMenuItem`, `updateCategory` actions
- [x] T166 [US12] Add night-menu scheduling: read `Tenant.nightMenuStartTime` / `nightMenuEndTime` (new optional fields); client-side `useEffect` checks current Baghdad time every 60s and filters displayed categories accordingly
- [x] T167 [US12] Add `nightMenuStartTime String?` and `nightMenuEndTime String?` fields to `Tenant` model in `prisma/schema.prisma` and run `npx prisma migrate dev --name 004-night-menu`

**Checkpoint**: TV menu board updates live; night menu schedule works.

---

## Phase 16: US13 — Kurdish Language Support (Priority: P3)

**Goal**: Users in Kurdistan can operate the full system in Sorani Kurdish (RTL), including customer-facing pages.

**Independent Test**: Switch a user's language to Kurdish. Reload the dashboard. Verify all navigation labels, buttons, and status texts are in Sorani Kurdish.

### Implementation: i18n Infrastructure

- [ ] T168 [US13] Install `next-intl` and create `src/i18n.ts` with `getRequestConfig` reading locale from `User.language` cookie/session; configure `routing` with locales `['ar', 'ku', 'en']` and default `'ar'`
- [ ] T169 [US13] Wrap `src/app/layout.tsx` with `NextIntlClientProvider`; add locale detection from user session (`User.language`) with cookie fallback `NEXT_LOCALE`

### Implementation: Translation Files

- [ ] T170 [US13] Populate `src/messages/ar.json` with all Arabic UI strings: navigation labels, button text, status values, form labels, error messages (~500 keys extracted from existing hardcoded Arabic strings)
- [ ] T171 [P] [US13] Populate `src/messages/ku.json` with Sorani Kurdish translations for all keys in `ar.json`
- [ ] T172 [P] [US13] Populate `src/messages/en.json` with English translations for all keys in `ar.json`

### Implementation: Component Migration

- [ ] T173 [US13] Replace hardcoded Arabic strings in `src/components/layout/` files with `useTranslations()` hook calls
- [ ] T174 [P] [US13] Replace hardcoded strings in `src/components/cashier/` files with translation keys
- [ ] T175 [P] [US13] Replace hardcoded strings in `src/components/captain/` files with translation keys
- [ ] T176 [P] [US13] Replace hardcoded strings in `src/components/kitchen/` files with translation keys
- [ ] T177 [P] [US13] Replace hardcoded strings in `src/components/customer/` (QR ordering) files with translation keys

### Implementation: Language Selector & Multilingual Menu

- [ ] T178 [US13] Create `src/components/settings/language-selector.tsx` — select dropdown for AR/KU/EN; on change, saves to `User.language` via server action and sets `NEXT_LOCALE` cookie; refreshes page
- [ ] T179 [US13] Add `LanguageSelector` to `src/components/layout/global-header.tsx`
- [ ] T180 [US13] Update `src/components/customer/qr-menu.tsx` to display `MenuItem.nameKu` / `nameAr` / `nameEn` based on active locale, falling back to `name` if field is empty

**Checkpoint**: Full Kurdish interface working; customer menu respects locale.

---

## Phase 17: US14 — Customer Feedback / NPS (Priority: P3)

**Goal**: After completing a QR order, customers are prompted to rate their experience; 5-star raters are guided to Google Reviews.

**Independent Test**: Complete a QR order. On the tracking page, verify the star-rating prompt appears. Submit a 4-star rating. Verify it appears in the admin feedback dashboard.

### Implementation

- [x] T181 [US14] Create `src/app/api/feedback/route.ts` — POST: rate-limit 1/orderId; validate `qr_session` cookie against `Order.qrSessionToken`; create `CustomerFeedback` record; return `{ googlePlaceId }` if rating ≥ 4 and tenant has `googlePlaceId` set
- [x] T182 [US14] Create `src/components/customer/feedback-prompt.tsx` — star-rating component (1–5 tappable stars) + optional text area; shown in `qr-order-tracker.tsx` when order status is `COMPLETED`; on submit calls `/api/feedback`; if response includes `googlePlaceId`, shows Google Reviews button
- [x] T183 [US14] Update `src/components/customer/qr-order-tracker.tsx` to render `FeedbackPrompt` after order reaches COMPLETED status (and feedback not yet submitted, tracked in local state)
- [x] T184 [US14] Create `src/app/dashboard/feedback/page.tsx` — feedback dashboard for ADMIN/MANAGER: average rating (7d/30d/all), star distribution chart (Recharts), recent feedback table (rating, comment, order number, date)
- [x] T185 [US14] Create `src/lib/actions/feedback.ts` with `getFeedbackStats(tenantId, branchId?, from?, to?)` returning average rating, distribution counts, and paginated recent feedback

**Checkpoint**: Feedback collection active; NPS dashboard populated; Google Reviews routing working.

---

## Phase 18: US15 — Seasonal / Ramadan Menus (Priority: P3)

**Goal**: Restaurants can schedule Ramadan or seasonal menus to activate automatically by date, including extended operating hours.

**Independent Test**: Create a seasonal menu with a start date of today. Verify the menu activates automatically within 60 seconds of the cron running.

### Implementation

- [x] T186 [US15] Create `src/lib/actions/seasonal-menus.ts` with `createSeasonalMenu(data)`, `updateSeasonalMenu(id, data)`, `deleteSeasonalMenu(id)`, `getSeasonalMenus(tenantId)`, `getActiveSeasonalMenu(branchId)` — checks `startDate <= now <= endDate AND isActive = true`
- [x] T187 [US15] Create `src/app/api/cron/seasonal-menus/route.ts` — GET: validates cron secret; queries seasonal menus where `startDate <= now AND isActive = false` → activate; and `endDate < now AND isActive = true` → deactivate; runs per-tenant
- [x] T188 [US15] Update `src/lib/actions/menu.ts` `getCategories(branchId)` to call `getActiveSeasonalMenu(branchId)`; if one is found, filter returned categories to `SeasonalMenuCategory.categoryId` list
- [x] T189 [US15] Create `src/app/dashboard/settings/seasonal/page.tsx` — list of seasonal menus with status badges; create/edit modal for dates, category selection (multi-select), and operating hours override
- [x] T190 [P] [US15] Create `src/components/menu/seasonal-menu-manager.tsx` — form component: name, start/end date pickers, category multi-select, optional hours-per-day override (open/close time per day-of-week)
- [x] T191 [US15] Update `src/lib/actions/delivery.ts` `createDeliveryOrder` to check `SeasonalHours` for the active seasonal menu; reject orders outside the overridden operating hours with an Arabic error message

**Checkpoint**: Seasonal menus activate and deactivate automatically; delivery respects seasonal hours.

---

## Phase 19: US16 — Consolidated Branch Reports (Priority: P3)

**Goal**: Multi-branch owners see all branches' performance side by side and export to Excel.

**Independent Test**: With 3 branches having different sales, open consolidated report for last 30 days. Verify revenue totals per branch are correct. Export to Excel and verify one row per branch plus totals row.

### Implementation

- [x] T192 [US16] Create `src/lib/actions/consolidated-reports.ts` with `getConsolidatedReport(tenantId, from, to)` — single Prisma `groupBy` on `Order` by `branchId` where `tenantId = tenantId AND createdAt BETWEEN from AND to AND status != CANCELLED`; returns array of `{ branchId, branchName, totalRevenue, orderCount, avgOrderValue, cashRevenue, cardRevenue }`
- [x] T193 [US16] Add `exportConsolidatedReport(data, from, to)` to `src/lib/actions/consolidated-reports.ts` — uses `xlsx` library to create workbook with "تفاصيل الفروع" sheet (one row per branch) + "الإجماليات" summary row; returns base64 buffer for download
- [x] T194 [US16] Create `src/app/dashboard/reports/consolidated/page.tsx` — accessible to ADMIN/MANAGER/ACCOUNTANT roles (guarded by `auth-guard.ts`); renders consolidated report with date range picker
- [x] T195 [US16] Create `src/components/reports/consolidated-branch-report.tsx` — table component with columns: فرع, الإيرادات, عدد الطلبات, متوسط الطلب, النقد, البطاقة; totals row; "تصدير Excel" button calling `exportConsolidatedReport`

**Checkpoint**: Consolidated report loads correctly for all branches; Excel export is accurate.

---

## Phase 20: US17 — Security Hardening Remaining (Priority: P1)

**Goal**: PostgreSQL RLS as a second tenancy layer; VoidRequest supervisor approval workflow; full audit log coverage.

### 20A: Row-Level Security

- [x] T196 [US17] Create `src/lib/rls/setup.sql` with: `CREATE ROLE app_user;`, `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;`, `ALTER TABLE orders ENABLE ROW LEVEL SECURITY;`, `CREATE POLICY tenant_isolation ON orders USING (tenant_id = current_setting('app.tenant_id', true));` — repeat for all 16 tenant-scoped tables
- [x] T197 [US17] Update `src/lib/prisma.ts` to add a Prisma `$extends` middleware that calls `$executeRaw(Prisma.sql\`SET LOCAL app.tenant_id = ${tenantId}\`)`before each query when`tenantId` is available in context
- [x] T198 [US17] Create `src/lib/rls/README.md` documenting how to apply `setup.sql` in production: `psql $DATABASE_URL -f src/lib/rls/setup.sql` and note that this requires superuser privileges

### 20B: VoidRequest Workflow

- [x] T199 [US17] Update `src/lib/actions/captain.ts` `markOrderCompleted` and any order cancellation action to create a `VoidRequest` (PENDING) instead of directly cancelling; return `{ requiresApproval: true, voidRequestId }` to the UI
- [x] T200 [US17] Create `src/lib/actions/void-requests.ts` with `getPendingVoidRequests(tenantId)`, `approveVoidRequest(id, approverId)` (cancels order, writes AuditLog with before/after), `rejectVoidRequest(id, approverId)`
- [x] T201 [US17] Create `src/components/finance/void-request-manager.tsx` — panel showing pending void requests with order details, "موافقة" and "رفض" buttons; triggered by Pusher event `void-requested` on `manager-{branchId}`
- [x] T202 [US17] Add `VoidRequestManager` to `src/app/dashboard/page.tsx` visible to ADMIN/MANAGER roles; add pending count badge to dashboard nav

### 20C: Audit Log Completeness

- [x] T203 [US17] Apply `withAudit` wrapper from `src/lib/audit.ts` in `src/lib/actions/shifts.ts` `openShift` and `closeShift`
- [x] T204 [P] [US17] Apply `withAudit` wrapper in `src/lib/actions/void-requests.ts` `approveVoidRequest` and `rejectVoidRequest`
- [x] T205 [P] [US17] Apply `withAudit` wrapper in `src/lib/actions/inventory.ts` `createTransaction` for WASTE and ADJUSTMENT types

**Checkpoint**: RLS script ready for production deployment; voids require manager approval; all financial mutations audited.

---

## Phase 21: Polish & Cross-Cutting Concerns

**Purpose**: Final integration, navigation updates, and production readiness checks

- [x] T206 Add `src/app/dashboard/settings/talabat/page.tsx` link to the settings navigation in `src/components/layout/global-sidebar.tsx`
- [x] T207 [P] Add "تقارير موحدة" link to `/dashboard/reports/consolidated` in the accountant sidebar and main dashboard navigation
- [x] T208 [P] Add "محطة المطبخ" station links to `src/components/kitchen/kitchen-nav.tsx` — dynamic list from `getStations(branchId)`
- [x] T209 [P] Add "طلبات الشراء" link to the inventory sidebar in `src/app/inventory/layout.tsx`
- [x] T210 [P] Add "التغذية الراجعة" link to dashboard navigation for ADMIN/MANAGER roles
- [x] T211 Update `src/app/dashboard/menu/page.tsx` to include "مجموعات التعديل" tab linking to modifier group management
- [x] T212 [P] Add `googlePlaceId` field to tenant settings form in `src/components/admin/settings-form.tsx` for NPS Google Reviews redirect
- [x] T213 [P] Add `nightMenuStartTime`/`nightMenuEndTime` fields to tenant settings for digital menu board night mode
- [x] T214 Configure Vercel Cron (or equivalent) jobs in `vercel.json`: `{ "crons": [{ "path": "/api/cron/expiry-check", "schedule": "0 3 * * *" }, { "path": "/api/cron/seasonal-menus", "schedule": "0 0 * * *" }] }`
- [x] T215 [P] Run `npm run lint` and fix all lint errors introduced by new files
- [x] T216 [P] Run `npx prisma validate` to confirm final schema is valid
- [x] T217 Update `specs/004-saas-restaurant-upgrade/quickstart.md` with any corrections discovered during implementation

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
  └─ Phase 2 (Schema Migration)  ← BLOCKS all user story phases
       ├─ Phase 3  (US1 Modifiers)
       ├─ Phase 4  (US2 QR Ordering)    ← also depends on US1 (modifier picker in QR)
       ├─ Phase 5  (US3 Password Reset)
       ├─ Phase 6  (US4 Offline Mode)
       ├─ Phase 7  (US17 Security Core)
       ├─ Phase 8  (US5 Split Bill)
       ├─ Phase 9  (US6 Shifts)
       ├─ Phase 10 (US7 Purchase Orders)
       ├─ Phase 11 (US8 Delivery Tracking)
       ├─ Phase 12 (US9 2FA)
       ├─ Phase 13 (US10 Talabat)
       ├─ Phase 14 (US11 KDS)
       ├─ Phase 15 (US12 Menu Boards)
       ├─ Phase 16 (US13 Kurdish)
       ├─ Phase 17 (US14 Feedback)    ← also depends on US2 (QR order tracker)
       ├─ Phase 18 (US15 Seasonal Menus)
       ├─ Phase 19 (US16 Consolidated Reports)
       └─ Phase 20 (US17 Security Remaining)
            └─ Phase 21 (Polish)
```

### User Story Dependencies

| Story                     | Depends On | Notes                                      |
| ------------------------- | ---------- | ------------------------------------------ |
| US1 Modifiers             | None       | Foundational for QR ordering and Talabat   |
| US2 QR Ordering           | US1        | Needs modifier picker integrated           |
| US3 Password Reset        | None       | Fully independent                          |
| US4 Offline Mode          | None       | Fully independent                          |
| US5 Split Bill            | None       | Fully independent                          |
| US6 Shifts                | None       | Integrates with Bill (existing)            |
| US7 Purchase Orders       | None       | Extends existing inventory                 |
| US8 Delivery Tracking     | None       | Extends existing Delivery model            |
| US9 2FA                   | None       | Auth modification only                     |
| US10 Talabat              | US1        | Needs modifiers for order item mapping     |
| US11 KDS                  | US1        | Needs prep time field on MenuItem          |
| US12 Menu Boards          | None       | Reads existing menu data                   |
| US13 Kurdish              | None       | Wraps existing UI; can be done in parallel |
| US14 Feedback             | US2        | Shown on QR order tracker                  |
| US15 Seasonal Menus       | None       | Extends existing category system           |
| US16 Consolidated Reports | None       | Queries existing Order data                |
| US17 Security             | None       | Cross-cutting; core subset in Phase 7      |

---

## Parallel Opportunities

### Within Phase 2 (Schema):

Sections 2A–2H tasks marked [P] can run in parallel — each adds fields to different models.

### After Phase 2:

All user story phases can start in parallel if team capacity allows.

### Within Each Story:

- Model tasks (schema already done in Phase 2) → service actions → UI components → integration
- Tasks marked [P] within a story (different files) can run in parallel

### Example — US1 Parallel Execution:

```
Parallel group A (independent files):
  T054 modifier-option-form.tsx
  T056 modifiers management page

Parallel group B (after T046, T047, T048):
  T053 modifier-group-manager.tsx
  T055 add-item-sheet.tsx tab

Sequential:
  T049 → T050 → T051 (order creation flow)
  T057 → T058 → T059 → T060 (order form integration)
  T061 → T062 → T063 (kitchen/receipt display)
```

---

## Implementation Strategy

### MVP Scope (Phase 1 + Phase 2 + Phase 3 only)

1. Install deps (Phase 1)
2. Run schema migration (Phase 2)
3. Implement US1 — Modifiers (Phase 3)
4. **STOP and validate**: Place an order with modifiers end-to-end
5. Merge and deploy

### Incremental Delivery Order (recommended)

1. US1 (Modifiers) → US3 (Password Reset) → US17 Core Security → deploy
2. US2 (QR Ordering) → US4 (Offline Mode) → deploy
3. US6 (Shifts) → US5 (Split Bill) → deploy
4. US7 (PO/Expiry) → US8 (Tracking) → deploy
5. US9 (2FA) → US10 (Talabat) → deploy
6. US11–US16 (Phase 3 features) → deploy
7. US17 Remaining (RLS, Void, Full Audit) → deploy

### Parallel Team Strategy (3 developers)

- **Dev A**: US1 → US2 → US10 → US11 (modifier/ordering/Talabat/KDS chain)
- **Dev B**: US3 → US9 → US17 → US5/US6 (auth/security/billing chain)
- **Dev C**: US7 → US8 → US15 → US16 (inventory/delivery/reports chain)
- **All**: US4 (offline), US12 (boards), US13 (Kurdish), US14 (feedback) — smaller tasks, fill gaps

---

## Summary

| Phase      | User Story                | Tasks   | Priority |
| ---------- | ------------------------- | ------- | -------- |
| Setup      | —                         | 6       | —        |
| Foundation | —                         | 39      | —        |
| 3          | US1 Modifiers & Variants  | 18      | P1 🎯    |
| 4          | US2 QR Self-Ordering      | 12      | P1       |
| 5          | US3 Password Reset        | 10      | P1       |
| 6          | US4 Offline Mode          | 9       | P1       |
| 7          | US17 Security Core        | 11      | P1       |
| 8          | US5 Split Bill            | 7       | P2       |
| 9          | US6 Shift Management      | 9       | P2       |
| 10         | US7 Purchase Orders       | 12      | P2       |
| 11         | US8 Delivery Tracking     | 7       | P2       |
| 12         | US9 Two-Factor Auth       | 11      | P2       |
| 13         | US10 Talabat              | 5       | P2       |
| 14         | US11 KDS                  | 6       | P3       |
| 15         | US12 Menu Boards          | 5       | P3       |
| 16         | US13 Kurdish Language     | 13      | P3       |
| 17         | US14 Feedback/NPS         | 5       | P3       |
| 18         | US15 Seasonal Menus       | 6       | P3       |
| 19         | US16 Consolidated Reports | 4       | P3       |
| 20         | US17 Security Remaining   | 10      | P1       |
| 21         | Polish                    | 12      | —        |
| **Total**  |                           | **217** |          |

---

## Notes

- [P] tasks = different files, no within-phase dependencies — safe to run in parallel
- [Story] label maps each task to its user story for traceability
- All schema work is in Phase 2 (Foundational) — story phases only contain actions + UI
- Each story phase ends with a **Checkpoint** that is independently testable
- Run `npm run lint` after each phase to catch TypeScript errors early
- Commit after each checkpoint for clean rollback points
