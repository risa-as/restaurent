# Data Model: System Audit, Billing & Redesign

**Feature**: 003-audit-billing-redesign
**Date**: 2026-03-15

---

## Existing Models — Changes Required

### ManualPayment (Extended)
The existing `ManualPayment` model serves as both "upgrade request" and "invoice". Adding missing fields:

```prisma
model ManualPayment {
  id             String              @id @default(cuid())
  tenantId       String
  tenant         Tenant              @relation(...)

  // Existing fields
  amount         Float               // Amount in IQD (primary currency)
  currency       String              @default("IQD")
  method         PaymentMethodType
  status         ManualPaymentStatus @default(PENDING)
  receiptUrl     String?
  receiptNote    String?
  adminNote      String?
  plan           PlanType
  months         Int                 @default(1)
  paidAt         DateTime?
  approvedAt     DateTime?
  approvedById   String?
  approvedBy     User?               @relation(...)
  createdAt      DateTime            @default(now())

  // NEW FIELDS TO ADD:
  invoiceNumber  Int?                @unique  // Auto-assigned on approval
  usdAmount      Float?                       // USD equivalent at issuance
  periodFrom     DateTime?                    // Subscription start date
  periodTo       DateTime?                    // Subscription end date

  @@index([tenantId])
  @@index([status])
}
```

**State transitions**:
```
PENDING → APPROVED (Super Admin approves: plan updated, invoiceNumber assigned, periodFrom/To set)
PENDING → REJECTED (Super Admin rejects: adminNote required)
```

---

### Bill (Add tenantId)
Currently `Bill` has no direct `tenantId`. Must add for safe direct queries:

```prisma
model Bill {
  // ... existing fields ...

  // NEW:
  tenantId  String?
  tenant    Tenant?  @relation(fields: [tenantId], references: [id])

  @@index([tenantId])  // NEW
}
```

---

### DailyClose (Add tenantId)
```prisma
model DailyClose {
  // ... existing fields ...

  // NEW:
  tenantId  String?
  tenant    Tenant?  @relation(fields: [tenantId], references: [id])

  @@index([tenantId])  // NEW
}
```

---

### Expense (Add tenantId)
```prisma
model Expense {
  // ... existing fields ...

  // NEW:
  tenantId  String?
  tenant    Tenant?  @relation(fields: [tenantId], references: [id])

  @@index([tenantId])  // NEW
}
```

---

### Offer (Add tenantId)
```prisma
model Offer {
  // ... existing fields ...

  // NEW:
  tenantId  String?
  tenant    Tenant?  @relation(fields: [tenantId], references: [id])

  @@index([tenantId])  // NEW
}
```

---

### PlatformSettings (Add IBAN and USD pricing)
```prisma
model PlatformSettings {
  // ... existing fields (bankName, bankAccount, bankAccountName, zainCashNumber) ...

  // NEW:
  bankIban         String  @default("")  // IBAN for bank transfers
  usdToIqdRate     Int     @default(1310) // Exchange rate for invoice USD display

  // Existing pricing fields renamed conceptually (no schema change needed):
  // pricingBasic, pricingPro, pricingEnterprise (already in IQD/month)
}
```

---

### Tenant (Add relations for new billing)
```prisma
model Tenant {
  // ... existing fields ...

  // NEW RELATIONS:
  bills          Bill[]
  dailyCloses    DailyClose[]
  expenses       Expense[]
  offers         Offer[]
}
```

---

## Validation Rules

### ManualPayment (Invoice/UpgradeRequest)
- `amount` must be > 0
- `plan` must be BASIC, PRO, or ENTERPRISE (not TRIAL — TRIAL is free)
- `months` must be 1, 3, 6, or 12
- `invoiceNumber` is system-assigned, never user-set
- `periodTo` = `periodFrom` + `months` months
- On approval: `periodFrom` = MAX(today, tenant.currentPeriodEnd) to allow early renewal stacking

### Bill
- `tenantId` must match `bill.order.tenantId` (enforced in creation)
- `amount` must equal recalculated order total at settlement time

### DailyClose
- `date` must be unique per `tenantId` (composite unique — one close per day per restaurant)
- Change `@@unique([date])` to `@@unique([tenantId, date])`

---

## Entity Relationship Summary

```
Tenant (1) ──── (N) ManualPayment [invoices/requests]
Tenant (1) ──── (N) Branch
Tenant (1) ──── (N) User
Tenant (1) ──── (N) Order ──── (1) Bill
Tenant (1) ──── (N) Bill [direct]
Tenant (1) ──── (N) DailyClose [direct]
Tenant (1) ──── (N) Expense [direct]
Tenant (1) ──── (N) Offer [direct]
Branch (1) ──── (N) Order
Branch (1) ──── (N) Table
Branch (1) ──── (N) User
PlatformSettings (singleton) ── bank transfer info, pricing, exchange rate
```

---

## Migration Plan

### Migration 1: Add tenantId to financial models
```sql
-- Add tenantId columns (nullable for backwards compat)
ALTER TABLE "Bill" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "DailyClose" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Expense" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "Offer" ADD COLUMN "tenantId" TEXT;

-- Backfill Bill.tenantId from orders
UPDATE "Bill" b SET "tenantId" = o."tenantId"
FROM "orders" o WHERE b."orderId" = o.id;

-- Add indexes
CREATE INDEX ON "Bill"("tenantId");
CREATE INDEX ON "DailyClose"("tenantId");
CREATE INDEX ON "Expense"("tenantId");
CREATE INDEX ON "Offer"("tenantId");
```

### Migration 2: Extend ManualPayment
```sql
ALTER TABLE "ManualPayment" ADD COLUMN "invoiceNumber" INT UNIQUE;
ALTER TABLE "ManualPayment" ADD COLUMN "usdAmount" FLOAT;
ALTER TABLE "ManualPayment" ADD COLUMN "periodFrom" TIMESTAMP;
ALTER TABLE "ManualPayment" ADD COLUMN "periodTo" TIMESTAMP;
```

### Migration 3: DailyClose unique constraint fix
```sql
-- Drop old unique constraint on date
ALTER TABLE "DailyClose" DROP CONSTRAINT IF EXISTS "DailyClose_date_key";
-- Add composite unique
ALTER TABLE "DailyClose" ADD CONSTRAINT "DailyClose_tenantId_date_key" UNIQUE("tenantId", "date");
```

### Migration 4: PlatformSettings new fields
```sql
ALTER TABLE "PlatformSettings" ADD COLUMN "bankIban" TEXT NOT NULL DEFAULT '';
ALTER TABLE "PlatformSettings" ADD COLUMN "usdToIqdRate" INT NOT NULL DEFAULT 1310;
```
