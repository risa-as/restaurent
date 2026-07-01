# Data Model: SaaS Transformation

**Phase**: ✅ مكتمل — الـ schema الفعلي
**Date Updated**: 2026-03-13

---

## النماذج الجديدة (مُضافة فعلياً)

### Tenant
```prisma
model Tenant {
  id           String   @id @default(cuid())
  name         String
  slug         String   @unique
  logoUrl      String?
  primaryColor String   @default("#f97316")
  appName      String?
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())

  stripeCustomerId     String?   @unique
  stripeSubscriptionId String?   @unique
  plan                 PlanType  @default(BASIC)
  subscriptionStatus   SubStatus @default(TRIAL)
  trialEndsAt          DateTime?
  currentPeriodEnd     DateTime?

  // Relations
  users        User[]
  categories   Category[]
  menuItems    MenuItem[]
  tables       Table[]
  orders       Order[]
  reservations Reservation[]
  rawMaterials RawMaterial[]
  suppliers    Supplier[]
  customers    Customer[]
}

enum PlanType  { TRIAL  BASIC  PRO  ENTERPRISE }
enum SubStatus { TRIAL  ACTIVE  PAST_DUE  CANCELED  PAUSED }
```

### Customer (نظام الولاء)
```prisma
model Customer {
  id          String    @id @default(cuid())
  phone       String
  name        String?
  totalPoints Int       @default(0)
  totalSpent  Float     @default(0)
  lastVisitAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  tenantId String
  tenant   Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  orders   Order[]

  @@unique([tenantId, phone])
}
```

---

## الجداول المعدَّلة — tenantId المُضافة فعلياً

| الجدول | نوع tenantId | ملاحظة |
|--------|-------------|--------|
| `User` | `String?` | null للـ SUPER_ADMIN |
| `Category` | `String?` | — |
| `MenuItem` | `String?` | — |
| `Table` | `String?` | unique constraint مع number |
| `Reservation` | `String?` | — |
| `Order` | `String?` | — |
| `RawMaterial` | `String?` | — |
| `Supplier` | `String?` | — |
| `Customer` | `String` | NOT NULL — كل عميل مرتبط بـ tenant |

---

## الـ Indexes الفعلية المُضافة

### indexes أُضيفت على الجداول

```prisma
// User
@@index([tenantId])

// RawMaterial
@@index([tenantId])

// Supplier
@@index([tenantId])

// Category
@@index([tenantId])

// MenuItem
@@index([tenantId])

// Table
@@unique([tenantId, number])   // يمنع تكرار رقم الطاولة في نفس المطعم
@@index([tenantId])

// Reservation
@@index([tenantId])

// Order
@@index([tenantId])
@@index([createdAt])           // للتصفية بالتاريخ في التقارير
@@index([status])              // للفلترة السريعة حسب الحالة

// Customer
@@unique([tenantId, phone])    // يمنع تكرار رقم الهاتف في نفس المطعم
```

### جداول بدون tenantId مباشر (مرتبطة عبر relation)

| الجدول | الارتباط |
|--------|----------|
| `Delivery` | عبر `Order.tenantId` |
| `Bill` | عبر `Order.tenantId` |
| `OrderItem` | عبر `Order.tenantId` |
| `InventoryTransaction` | عبر `RawMaterial.tenantId` |
| `RecipeItem` | عبر `MenuItem.tenantId` |
| `Expense` | يملك `tenantId` في الـ actions لكن ليس في الـ schema بعد |
| `DailyClose` | يملك `tenantId` في الـ actions لكن ليس في الـ schema بعد |

---

## State Transitions

### Subscription States
```
TRIAL → ACTIVE (عند إتمام Stripe Checkout)
ACTIVE → PAST_DUE (فشل invoice payment)
PAST_DUE → ACTIVE (دفع ناجح)
PAST_DUE → CANCELED (بعد grace period 3 أيام)
ACTIVE → PAUSED (بواسطة super admin)
PAUSED → ACTIVE (بواسطة super admin)
```

### Tenant Onboarding Flow
```
1. POST /api/tenants/register → Tenant (TRIAL, trialEndsAt = now + 14d)
2. User ADMIN ينشأ تلقائياً مرتبط بالـ tenant
3. إيميل ترحيب يُرسل بـ Resend
4. اختيار خطة → Stripe Checkout Session
5. checkout.session.completed webhook → subscriptionStatus = ACTIVE
```

---

## QR Menu URLs
```
GET  /menu/[slug]                  → قائمة عامة للمطعم
GET  /menu/[slug]?table=TABLE_ID   → مع ربط طاولة
POST /api/menu/[slug]/order        → إرسال طلب العميل للمطبخ
```

---

## Validation Rules

| Field | Rule |
|-------|------|
| `slug` | 3-50 chars, lowercase, alphanumeric + hyphens |
| `primaryColor` | Valid hex #RRGGBB |
| `Customer.phone` | يبدأ بـ 07، 11 رقم (تنسيق عراقي) |
| `Table.number` | unique per tenant (@@unique([tenantId, number])) |
| `Customer.phone` | unique per tenant (@@unique([tenantId, phone])) |

---

## ملاحظات الأمان (T069)

جميع `server actions` تتحقق الآن من `tenantId` قبل أي mutation:

```typescript
// النمط المعتمد في جميع الملفات:
const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);

// Read: فلترة بالـ tenantId
where: { ...(tenantId ? { tenantId } : {}) }

// Mutation: التحقق من الملكية قبل التعديل
const existing = await prisma.model.findFirst({
    where: { id, ...(tenantId ? { tenantId } : {}) }
});
if (!existing) return { error: "Not found or access denied" };
```

- **SUPER_ADMIN** (`tenantId = null`): يرى جميع البيانات بدون فلترة
- **بقية الأدوار**: يرون فقط بيانات الـ tenant الخاص بهم
