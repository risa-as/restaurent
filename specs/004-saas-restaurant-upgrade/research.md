# Research: Restaurant SaaS Comprehensive Upgrade

**Branch**: `004-saas-restaurant-upgrade` | **Date**: 2026-03-23

---

## 1. Modifier & Variants Architecture

**Decision**: Two-table design — `ModifierGroup` (one per item or shared) → `ModifierOption` (N per group) → `OrderItemModifier` (junction at order time).

**Rationale**: This is the industry-standard approach used by Square, Toast, and Foodics. A shared modifier group (e.g. "Drinks Size") can be reused across multiple items rather than duplicated, reducing admin overhead. At order time the selected options are snapshotted (with price at time of order) into `OrderItemModifier` to preserve historical accuracy.

**Variants vs. Groups**: Item variants (small/medium/large) are implemented as a `ModifierGroup` with `isVariant=true`. This avoids a separate `ItemVariant` table and naturally inherits the min=1/max=1 required selection constraint.

**Inventory link**: Each `ModifierOption` optionally references a `RawMaterial` with a `rawMaterialQty` float. When the order item is confirmed, the inventory deduction includes the base recipe AND any modifier raw-material adjustments.

**Alternatives considered**: Embedding modifiers as JSON on `OrderItem.notes` — rejected because it makes pricing, reporting, and inventory impossible to query reliably.

---

## 2. QR Self-Ordering Session Strategy

**Decision**: Stateless URL-based session using `tableId` + `branchId` embedded in QR URL. A short-lived anonymous `qr_session` cookie (UUID v4, 24-hour TTL) is issued on first page load to de-duplicate simultaneous sessions at the same table.

**URL Pattern**: `/{tenantSlug}/order?t={tableId}` — served from a new Next.js route group `(customer)` that is publicly accessible and excluded from NextAuth middleware.

**Real-time**: Pusher channel `table-{tableId}` broadcasts order status updates. The customer page subscribes on mount.

**Bill request**: A `billRequested` flag already exists on `Order` — the customer page calls an unauthenticated API route that sets `billRequested=true` and triggers a Pusher event to the captain channel.

**Alternatives considered**: QR → WhatsApp bot → order — rejected due to reliance on WhatsApp Business API approval; URL-based is immediate and requires no third-party approval.

---

## 3. Password Reset Token Design

**Decision**: `PasswordResetToken` model with `tokenHash` (SHA-256 of raw token), `expiresAt` (now+30min), `usedAt` (nullable). Raw token is sent in email; only the hash is stored.

**Library**: No extra library needed — Node.js `crypto.randomBytes(32).toString('hex')` for token generation; `crypto.createHash('sha256')` for hashing. Both are in Node stdlib.

**Email template**: New React Email template using the existing `resend` integration.

**Anti-enumeration**: The forgot-password form always returns a success message regardless of whether the email exists. The lookup is done server-side and the email is only sent if found.

**Alternatives considered**: OTP (6-digit code) — rejected because OTPs require a separate input step and are easily brute-forced; signed URL with hash is safer and simpler.

---

## 4. Offline Mode (PWA + IndexedDB)

**Decision**: Use `next-pwa` (already in `package.json` as `@ducanh2912/next-pwa`) with a custom `workbox` strategy. Offline data queued in IndexedDB via the `idb` library (lightweight wrapper, ~2 KB gzipped).

**Cache strategy**:
- Static assets + Next.js page shells → `CacheFirst`
- API calls (read) → `NetworkFirst` with 5-second timeout fallback to cache
- Menu data → pre-cached on SW install/activate

**Offline write queue**: An `offlineQueue` IndexedDB store holds serialised order payloads. A `sync` event listener (Background Sync API where supported; polling fallback for iOS Safari) drains the queue when online.

**Conflict resolution**: `last-write-wins` — the offline order gets a client-generated `clientCreatedAt` timestamp. On sync the server accepts the order as-is, logs the offline origin, and appends a `[OFFLINE]` note for manager review.

**Scope**: Cashier (`/cashier`) and Captain (`/captain`) pages only. Admin dashboard remains online-only.

**Alternatives considered**: Using a full PouchDB/CouchDB replication — rejected as massively over-engineered for the use case; simple queue sync is sufficient.

---

## 5. Split Bill Implementation

**Decision**: Split bill is implemented as multiple `Bill` records against the same `Order`, each with a `splitIndex` and `splitTotal`. A new `BillSplit` model tracks item assignments when splitting by item. The parent `Order` remains open until all `BillSplit` records have an associated settled `Bill`.

**UI flow**: Cashier opens "Split Bill" drawer → chooses "Equal Split" (n ways) or "By Item" → assigns items/amounts → processes payment for each portion independently.

**Alternatives considered**: Creating sub-orders from the parent — rejected because it complicates reporting (double-counting revenue) and the kitchen has already processed the single original order.

---

## 6. Shift Management

**Decision**: New `CashierShift` model. A shift is opened by a `CASHIER` (or `ADMIN`) and linked to a `Branch`. All `Bill` records created while a shift is open receive a `shiftId` FK. Shift close computes expected cash = opening cash + sum(cash bills) and compares to entered physical count.

**Enforcement**: The cashier page checks for an open shift on mount; if none exists, a "فتح وردية جديدة" modal is shown before any order can be processed. This check is also enforced server-side in the `markOrderAsPaid` action.

**Alternatives considered**: Tracking shifts via `DailyClose` — rejected because multiple shifts per day and multiple cashiers per shift are not supported by the existing daily-close model.

---

## 7. Purchase Orders (PO) & Inventory Batches

**Decision**: Two new models — `PurchaseOrder` (header) and `PurchaseOrderItem` (lines). Receipt of goods creates `InventoryBatch` records (one per PO line) that hold `expiryDate` and `remainingQty`. Inventory consumption deducts from batches in FIFO order (oldest `expiryDate` first).

**Expiry alerts**: A background `cron`-style check runs daily (triggered by a Next.js Route Handler at `/api/cron/expiry-check` called by a Vercel Cron or an external scheduler). Any batch with `expiryDate` within 7 days is flagged; within 3 days, a Pusher notification is sent to `STORE_MANAGER` and `ADMIN` users of the branch.

**Existing `InventoryTransaction`**: The existing model is retained for manual USAGE/WASTE/ADJUSTMENT entries. Automatic consumption from orders continues to create `InventoryTransaction` records referencing the new batch.

**Alternatives considered**: Adding `expiryDate` directly to `RawMaterial` — rejected because a single material can have multiple batches with different expiries (the real-world case).

---

## 8. Customer Delivery Tracking

**Decision**: Add `trackingToken` (unique, random 32-char hex, hashed in DB, raw sent in notification) to the `Delivery` model. Public page at `/track/[token]` renders map + status without authentication.

**Real-time**: The existing `driver-location-emitter` component already pushes lat/lng to Pusher. The public tracking page subscribes to the same Pusher channel (`delivery-{deliveryId}`) using a read-only token.

**SMS/WhatsApp gateway**: For the Iraqi market, `Twilio` is the most straightforward international option. A local Iraqi SMS gateway (e.g. `ZAIN Iraq SMS`) can be swapped in later via the same abstraction. This phase implements the Twilio adapter with an interface that allows swapping.

**ETA calculation**: Simple formula — straight-line distance (Haversine) ÷ average delivery speed (configurable, default 30 km/h) + preparation time. No routing API required in this phase.

**Alternatives considered**: Firebase Realtime DB for location — rejected because Pusher is already integrated and adding Firebase would be a new dependency.

---

## 9. Two-Factor Authentication (TOTP)

**Decision**: `otplib` library (widely used, RFC 6238 compliant) for TOTP generation and verification. `qrcode` library to generate the setup QR code. Backup codes: 8 codes, each 10 characters, stored as bcrypt hashes (cost 10).

**NextAuth v5 integration**: The existing credentials provider is extended. After password validation, if the user has `twoFactorEnabled=true`, the `authorize` callback returns a partial session flag `requires2FA=true`. A separate `/auth/2fa` page collects the TOTP and a second `verify-2fa` action validates it and issues the full session.

**SUPER_ADMIN enforcement**: Middleware intercepts SUPER_ADMIN users without `twoFactorVerifiedAt` set in the session and redirects to the 2FA setup page.

**New model fields on `User`**: `twoFactorEnabled`, `twoFactorSecret` (encrypted at-rest with AES-256-GCM using `AUTH_SECRET` as key), `twoFactorBackupCodes` (JSON array of bcrypt hashes).

**Alternatives considered**: WebAuthn/Passkeys — excellent choice for the future but complex to implement and requires hardware key or platform authenticator; TOTP is universally supported via authenticator apps and appropriate for this user base.

---

## 10. Talabat Integration

**Decision**: Talabat Iraq uses a REST API with HMAC-SHA256 webhook signatures. The integration is structured as:
1. **Inbound webhook** — `/api/webhooks/talabat` receives orders.
2. **Outbound status** — existing order status change hooks call a `talabatClient.updateStatus()` method.
3. **Menu sync** — a server action `syncMenuToTalabat()` pushes categories and items.

**Idempotency**: `TalabatOrder` model stores `externalId` (Talabat's order ID). If a webhook arrives for an already-processed `externalId`, a 200 is returned with no duplicate created.

**Signature verification**: `crypto.timingSafeEqual` comparison of `X-Talabat-Signature` header against `HMAC-SHA256(webhook secret, raw body)`.

**Note**: Talabat's API documentation is not fully public. The integration design assumes the standard Talabat partner API. The `TalabatConfig` model stores per-tenant credentials. If Talabat's actual API differs, the `contracts/talabat.md` contract defines the expected interface for negotiation.

**Alternatives considered**: Deliverect as middleware — rejected because it adds cost and a third-party dependency; direct integration is more reliable and cheaper at scale.

---

## 11. Kitchen Stations (KDS)

**Decision**: `KitchenStation` model per branch. `MenuItemStation` junction table links items to stations. The existing `kitchen/page.tsx` becomes the "All Items" view. Each station gets its own URL: `/kitchen/station/[stationId]`. An order advances to `READY` when `OrderItem.status = READY` for all items, regardless of station.

**Real-time**: Uses existing Pusher `kitchen-{branchId}` channel. Station pages filter items client-side by `stationId` after receiving the full order update.

**Prep time tracking**: `MenuItem.prepTimeMins` (new field, nullable, default null = no tracking). `OrderItem.prepStartedAt` is set when the station marks the item as "Started". An alert fires when `now() - prepStartedAt > prepTimeMins * 60 * 1000`.

**Alternatives considered**: Separate Pusher channels per station — rejected because it wastes Pusher channel quota and client-side filtering is negligible overhead.

---

## 12. Digital Menu Boards

**Decision**: Route `/display/[slug]` — public, no auth. Uses Pusher `menu-{tenantId}` channel for live updates. The page subscribes and re-fetches menu data on any update event.

**Night mode**: `MenuBoardSchedule` model stores `nightMenuStartTime` (HH:MM), `nightMenuEndTime`, and `nightCategoryIds` (JSON array). A client-side timer checks every minute and switches the displayed category set.

**TV optimisation**: The page uses a dedicated CSS layout (no sidebar, large text, dark background by default) and a `?kiosk=true` param disables the scroll bar for use with TV browsers.

**Alternatives considered**: Polling every 30 seconds — rejected because Pusher is already integrated and real-time is achievable at no extra cost.

---

## 13. Kurdish Language (i18n)

**Decision**: `next-intl` library (the most mature i18n library for Next.js App Router). Locale files at `messages/ar.json`, `messages/ku.json`, `messages/en.json`. Locale stored in user profile (`User.language` field, enum `Language: AR | KU | EN`) and as a cookie for unauthenticated pages (customer menu, QR ordering).

**Sorani Kurdish**: Uses RTL direction (same as Arabic). Locale code `ku-IQ`. Font: the existing Arabic font (Cairo or Noto Arabic) covers Sorani Kurdish glyphs.

**Menu item names**: `MenuItem.nameAr`, `MenuItem.nameKu`, `MenuItem.nameEn` — three separate fields. The `name` field remains as the canonical (admin) name. Same pattern for `Category`.

**Alternatives considered**: `react-i18next` — works but is not optimised for Next.js App Router server components; `next-intl` is the recommended choice for this stack.

---

## 14. Customer Feedback / NPS

**Decision**: `CustomerFeedback` model. The QR ordering page shows the rating prompt when the order status is polled as `COMPLETED`. Rating is submitted to a public API route `/api/feedback` (no auth, but rate-limited by IP and order token).

**Google Reviews redirect**: If `rating >= 4` and `Tenant.googlePlaceId` is set, show a "شاركنا رأيك على Google" button linking to `https://search.google.com/local/writereview?placeid={googlePlaceId}`.

**Dashboard**: New page `/dashboard/feedback` for ADMIN/MANAGER showing average score (7-day, 30-day), recent comments, and a trend chart.

**Alternatives considered**: Sending feedback via email — rejected because the response rate for email surveys is ~2%; in-app prompts at the point of experience yield 15–25%.

---

## 15. Seasonal / Ramadan Menus

**Decision**: `SeasonalMenu` model with `startDate`, `endDate`, `isActive` (auto-managed). A `SeasonalMenuCategory` junction table specifies which categories/items are active during the season. The daily cron job (`/api/cron/seasonal-check`) activates/deactivates seasonal menus by comparing dates.

**Operating hours**: `SeasonalHours` model stores override opening/closing times for the seasonal period. These affect delivery order acceptance validation.

**Alternatives considered**: Using the existing `Offer` model for seasonal items — rejected because offers apply discounts to existing items; seasonal menus may introduce entirely new items and replace the standard menu entirely.

---

## 16. Consolidated Branch Reports

**Decision**: New server action `getConsolidatedBranchReport(tenantId, fromDate, toDate)` that runs a single Prisma query grouped by `branchId`. Returns an array of per-branch aggregates. A new page `/dashboard/reports/consolidated` is accessible to ADMIN, MANAGER, ACCOUNTANT roles.

**Export**: Uses the existing `xlsx` library (already in package.json) to generate the Excel file server-side.

**Performance**: For tenants with up to 10 branches and 90 days of data, a single grouped SQL query via Prisma raw is expected to return within 2 seconds. Index on `Order.branchId + Order.createdAt` is already present.

**Alternatives considered**: Client-side aggregation from existing per-branch APIs — rejected because it requires N API calls (one per branch) and is slow for 10+ branches.

---

## 17. Security Hardening

### Row-Level Security (RLS)
**Decision**: Prisma does not natively support RLS. The approach is:
1. Create a separate limited Postgres role `app_user` that the application connects as.
2. `SET app.tenant_id = '...'` at the start of each request using a Prisma middleware extension.
3. RLS policies: `USING (tenant_id = current_setting('app.tenant_id'))` on all tenant-scoped tables.

This is a defense-in-depth layer — application-level filtering remains in place.

**Note**: RLS requires Prisma v5.x's `$extends` API and a Postgres connection string that allows `SET LOCAL` — this is supported by both Supabase and standard Postgres. Neon's serverless driver requires `neonConfig.pipelineConnect = false` for SET to work correctly.

### CSP Headers
**Decision**: Configure CSP in `next.config.js` via `headers()` function. Policy:
```
default-src 'self';
script-src 'self' 'nonce-{nonce}' https://js.pusher.com;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https: blob:;
connect-src 'self' wss://*.pusher.com https://api.stripe.com;
frame-ancestors 'none';
```
A per-request nonce is generated in middleware and injected into the `<html>` via server component.

### CORS
**Decision**: Explicit `Access-Control-Allow-Origin` in Next.js `middleware.ts` for `/api/*` routes. Allow list: `NEXT_PUBLIC_ROOT_DOMAIN` and tenant subdomains only. Public routes (`/api/menu/*`, `/api/feedback`, `/api/webhooks/*`) use broader policy with origin validation.

### Audit Log Enhancement
**Decision**: Extend the `AuditLog` model with `entityType`, `entityId`, `valueBefore` (JSON), `valueAfter` (JSON), `ipAddress`. A `withAudit()` wrapper function records before/after for financial mutations (Bill, Expense, DailyClose, Order cancellation).

### Failed Login Tracking
**Decision**: New `LoginAttempt` model: `email`, `ipAddress`, `success`, `createdAt`. A Prisma query before `authorize` checks: if `>= 10` failed attempts for the same email in the last 15 minutes → return null with a lockout message. On successful login, the attempts for that email are cleared.

### Session Expiry
**Decision**: NextAuth v5 JWT `maxAge` set to `8 * 60 * 60` (8 hours). On each request, the JWT's `iat` is checked; if `now - iat > 8h`, the session is invalidated. A client-side `useIdleTimer` hook (idle-timer library or custom) detects 8 hours of inactivity and calls `signOut()`.

### Supervisor Approval for Void/Refund
**Decision**: New `VoidRequest` model. When a cashier initiates a void/refund, a `VoidRequest` is created with status `PENDING`. A manager/admin receives a Pusher notification and approves/rejects from the dashboard. The void only executes on approval. Approved voids are recorded in `AuditLog` with `valueBefore`/`valueAfter`.

---

## Package Additions Required

| Package | Purpose | Version |
|---------|---------|---------|
| `otplib` | TOTP 2FA generation/verification | `^12.0.1` |
| `qrcode` | QR code for 2FA setup | `^1.5.4` |
| `@types/qrcode` | TypeScript types | `^1.5.5` |
| `next-intl` | i18n for App Router | `^3.x` |
| `idb` | IndexedDB wrapper for offline queue | `^8.x` |
| `crypto` | Built-in Node.js — no install needed | stdlib |

No packages needed for: RLS (Prisma extensions), CSP (Next.js config), Split Bill (logic only), KDS (Pusher already installed), Digital Menu Boards (Pusher), Consolidated Reports (xlsx already installed), Seasonal Menus (logic only), NPS/Feedback (existing stack).
