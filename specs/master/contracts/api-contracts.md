# API Contracts: SaaS Transformation

---

## Public Routes (No Auth)

### `POST /api/tenants/register`
إنشاء حساب مطعم جديد

**Request**:
```json
{
  "restaurantName": "مطعم النجمة",
  "slug": "al-najma",
  "ownerName": "أحمد محمد",
  "email": "ahmed@restaurant.com",
  "phone": "07901234567",
  "password": "••••••••"
}
```
**Response 201**:
```json
{ "tenantId": "...", "redirect": "/onboarding" }
```
**Errors**: 409 slug taken | 422 validation

---

### `GET /menu/[slug]`
القائمة العامة للعميل عبر QR

**Response**: HTML page (Server Component)  
Categories + MenuItems + Table info (if ?table=TABLE_ID)

---

### `POST /api/menu/[slug]/order`
إنشاء طلب من العميل

**Request**:
```json
{
  "tableId": "TABLE_CUID",
  "customerPhone": "07901234567",
  "items": [
    { "menuItemId": "ITEM_CUID", "quantity": 2, "notes": "بدون بصل" }
  ]
}
```
**Response 201**:
```json
{ "orderId": "...", "orderNumber": 42 }
```

---

## Authenticated Routes (Tenant Users)

### `GET /api/tenant/settings`
إعدادات المطعم الحالي

**Response**:
```json
{
  "name": "مطعم النجمة",
  "slug": "al-najma",
  "logoUrl": "https://...",
  "primaryColor": "#f97316",
  "plan": "PRO",
  "subscriptionStatus": "ACTIVE",
  "currentPeriodEnd": "2026-04-09T00:00:00Z"
}
```

---

### `POST /api/tenant/invite`
دعوة موظف

**Request**:
```json
{
  "email": "cashier@restaurant.com",
  "role": "CASHIER",
  "name": "فاطمة علي"
}
```
**Response 200**:
```json
{ "inviteId": "...", "emailSent": true }
```

---

### `POST /api/stripe/create-checkout`
فتح صفحة الدفع

**Request**:
```json
{ "plan": "PRO" }
```
**Response**:
```json
{ "url": "https://checkout.stripe.com/..." }
```

---

### `POST /api/stripe/create-portal`
فتح بوابة إدارة الاشتراك

**Response**:
```json
{ "url": "https://billing.stripe.com/..." }
```

---

## Webhook Routes

### `POST /api/webhooks/stripe`
معالجة أحداث Stripe

**Events handled**:
| Event | Action |
|-------|--------|
| `checkout.session.completed` | تفعيل الاشتراك → ACTIVE |
| `invoice.payment_succeeded` | تجديد → تحديث `currentPeriodEnd` |
| `invoice.payment_failed` | → PAST_DUE + إرسال إيميل تحذير |
| `customer.subscription.deleted` | → CANCELED |

---

## Super Admin Routes (SUPER_ADMIN role only)

### `GET /api/superadmin/tenants`
قائمة جميع المطاعم

**Response**:
```json
[
  {
    "id": "...",
    "name": "مطعم النجمة",
    "plan": "PRO",
    "subscriptionStatus": "ACTIVE",
    "isActive": true,
    "usersCount": 8,
    "createdAt": "2026-01-01T00:00:00Z"
  }
]
```

---

### `PATCH /api/superadmin/tenants/[id]`
تفعيل / إيقاف مطعم

**Request**:
```json
{ "isActive": false }
```

---

## Middleware Contract

### `middleware.ts` (Next.js)

```
Input: req.headers.host
  → api.risa-sys.com       → API routes (no tenant context)
  → app.risa-sys.com       → Super Admin / Marketing
  → *.risa-sys.com         → Tenant app (extract slug)
  → localhost:3000          → Dev (default tenant)

Output: 
  → x-tenant-id header injected
  → x-tenant-slug header injected
  → Redirect to /suspended if !tenant.isActive
  → Redirect to /trial-expired if subscription expired
```
