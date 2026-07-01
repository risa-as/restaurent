# API Contracts: Restaurant SaaS Comprehensive Upgrade

**Branch**: `004-saas-restaurant-upgrade` | **Date**: 2026-03-23

All new public-facing API routes. Internal server actions are documented in the relevant feature section of `plan.md`.

---

## QR Self-Ordering (Customer-Facing, Unauthenticated)

### GET `/{slug}/order?t={tableId}`
Returns the customer ordering page (Next.js Server Component). No auth.

**Query params**:
- `t` — table ID (required)

**Behaviour**: Sets a `qr_session` cookie (UUID v4, HttpOnly, SameSite=Strict, 24h) if not present.

---

### POST `/api/qr/order`
Create an order from the customer QR page.

**Auth**: None (validated by `qr_session` cookie + tableId ownership check)

**Request body**:
```json
{
  "tableId": "string",
  "tenantSlug": "string",
  "items": [
    {
      "menuItemId": "string",
      "quantity": 1,
      "notes": "string | null",
      "modifiers": [
        { "modifierOptionId": "string" }
      ]
    }
  ],
  "sessionToken": "string"
}
```

**Response 201**:
```json
{
  "orderId": "string",
  "orderNumber": 42,
  "status": "PENDING"
}
```

**Response 400**: Missing required modifiers
**Response 404**: Table or item not found
**Response 409**: Table closed / not accepting orders

---

### GET `/api/qr/order-status?orderId={id}&session={token}`
Poll order status (used by customer tracking page).

**Auth**: None — validates `session` matches the `qr_session` for this order.

**Response 200**:
```json
{
  "orderId": "string",
  "orderNumber": 42,
  "status": "PREPARING | READY | SERVED | COMPLETED",
  "items": [
    { "name": "string", "quantity": 1, "status": "PENDING | PREPARING | READY" }
  ]
}
```

---

### POST `/api/qr/bill-request`
Customer requests the bill from the table.

**Auth**: None — validated by `qr_session` cookie.

**Request body**:
```json
{ "orderId": "string", "sessionToken": "string" }
```

**Response 200**: `{ "success": true }`
**Response 404**: Order not found

---

## Delivery Tracking (Public)

### GET `/track/{token}`
Public delivery tracking page (Next.js Server Component). No auth.

**Path param**: `token` — raw tracking token (hashed in DB for lookup)

**Behaviour**: Renders order stages + live map. Subscribes to Pusher channel `delivery-{deliveryId}` using a Pusher read-only key.

---

### POST `/api/delivery/location`
*(Existing route — no changes)*
Driver pushes location. Triggers Pusher event `driver-location` on `delivery-{deliveryId}`.

---

## Password Reset

### POST `/api/auth/forgot-password`
Initiate password reset.

**Auth**: None

**Request body**: `{ "email": "string" }`

**Response 200**: Always `{ "success": true }` (anti-enumeration)

**Rate limit**: 3 requests per email per 10 minutes.

---

### POST `/api/auth/reset-password`
Complete password reset.

**Auth**: None

**Request body**:
```json
{
  "token": "string",
  "newPassword": "string",
  "confirmPassword": "string"
}
```

**Response 200**: `{ "success": true }`
**Response 400**: Passwords don't match / validation error
**Response 410**: Token expired or already used

---

## Two-Factor Authentication

### POST `/api/auth/2fa/setup`
Generate TOTP secret and QR code for setup.

**Auth**: Authenticated session (password step complete, 2FA step pending)

**Response 200**:
```json
{
  "secret": "BASE32_SECRET",
  "qrCodeUrl": "data:image/png;base64,...",
  "backupCodes": ["AAAA-BBBB", "CCCC-DDDD", ...]
}
```

---

### POST `/api/auth/2fa/verify`
Verify TOTP and complete login / complete setup.

**Auth**: Partial session (requires2FA flag)

**Request body**: `{ "code": "123456", "isSetup": false }`

**Response 200**: Full session issued
**Response 401**: Invalid code

---

### POST `/api/auth/2fa/backup`
Use a backup code for recovery.

**Auth**: Partial session

**Request body**: `{ "backupCode": "AAAA-BBBB" }`

**Response 200**: Full session issued, backup code consumed
**Response 401**: Invalid or already-used backup code

---

## Talabat Integration

### POST `/api/webhooks/talabat`
Receive inbound orders from Talabat.

**Auth**: `X-Talabat-Signature` header (HMAC-SHA256 verified against per-tenant webhook secret)

**Request body**: Talabat order payload (see `contracts/talabat.md`)

**Response 200**: `{ "received": true }` (always, to prevent retries)
**Response 401**: Invalid signature (still returns 200 to prevent enumeration, but logs the attempt)

---

### POST `/api/talabat/sync-menu`
*(Authenticated — ADMIN/MANAGER only)*
Push current menu to Talabat.

**Auth**: Session with ADMIN/MANAGER role

**Response 200**: `{ "synced": { "categories": 5, "items": 47 } }`
**Response 503**: Talabat API unavailable

---

## Customer Feedback

### POST `/api/feedback`
Submit order feedback.

**Auth**: None — validated by order ID + session token

**Rate limit**: 1 submission per orderId.

**Request body**:
```json
{
  "orderId": "string",
  "sessionToken": "string",
  "rating": 4,
  "comment": "طعام ممتاز"
}
```

**Response 201**: `{ "success": true }`
**Response 409**: Feedback already submitted for this order

---

## Cron Endpoints (Internal — secured by cron secret header)

### GET `/api/cron/expiry-check`
Check for inventory batches nearing expiry. Called by Vercel Cron or external scheduler.

**Auth**: `Authorization: Bearer {CRON_SECRET}` header

**Response 200**: `{ "checked": 150, "alerted": 3 }`

---

### GET `/api/cron/seasonal-menus`
Activate/deactivate seasonal menus based on current date.

**Auth**: `Authorization: Bearer {CRON_SECRET}` header

**Response 200**: `{ "activated": 1, "deactivated": 0 }`

---

## Digital Menu Board

### GET `/display/{slug}`
Public TV menu board page. No auth. Unauthenticated SSR page.

**Query params**:
- `kiosk=true` — hides scrollbar, auto-fullscreen prompt
- `theme=dark|light` — override default dark theme

**Behaviour**: Subscribes to Pusher channel `menu-{tenantId}` for real-time updates.

---

## Contracts Reference: Talabat Webhook Payload

See `contracts/talabat.md` for the full expected Talabat inbound order schema.
