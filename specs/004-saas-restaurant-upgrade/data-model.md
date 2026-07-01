# Data Model: Restaurant SaaS Comprehensive Upgrade

**Branch**: `004-saas-restaurant-upgrade` | **Date**: 2026-03-23

All changes are **additive** — no existing models are dropped. Existing fields are only extended, never removed.

---

## New Models

### ModifierGroup
Reusable group of modifier options attached to one or more menu items.

```prisma
model ModifierGroup {
  id          String   @id @default(cuid())
  name        String                          // e.g. "الإضافات", "الحجم"
  nameAr      String?
  nameKu      String?
  nameEn      String?
  isRequired  Boolean  @default(false)
  isVariant   Boolean  @default(false)        // true = treated as item variant (size)
  minSelect   Int      @default(0)
  maxSelect   Int      @default(1)
  sortOrder   Int      @default(0)
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  options     ModifierOption[]
  items       MenuItemModifierGroup[]

  @@index([tenantId])
}
```

### ModifierOption
A single selectable option within a group.

```prisma
model ModifierOption {
  id              String        @id @default(cuid())
  name            String
  nameAr          String?
  nameKu          String?
  nameEn          String?
  priceAdjustment Float         @default(0)   // additional cost (can be 0)
  isDefault       Boolean       @default(false)
  sortOrder       Int           @default(0)
  groupId         String
  group           ModifierGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)

  rawMaterialId   String?                     // optional inventory link
  rawMaterialQty  Float?                      // quantity to deduct per unit ordered
  rawMaterial     RawMaterial?  @relation(fields: [rawMaterialId], references: [id])

  orderModifiers  OrderItemModifier[]

  @@index([groupId])
}
```

### MenuItemModifierGroup
Junction: which modifier groups apply to which menu items.

```prisma
model MenuItemModifierGroup {
  id              String        @id @default(cuid())
  menuItemId      String
  modifierGroupId String
  sortOrder       Int           @default(0)
  menuItem        MenuItem      @relation(fields: [menuItemId], references: [id], onDelete: Cascade)
  modifierGroup   ModifierGroup @relation(fields: [modifierGroupId], references: [id], onDelete: Cascade)

  @@unique([menuItemId, modifierGroupId])
}
```

### OrderItemModifier
Snapshot of selected modifier options at time of order (preserves historical prices).

```prisma
model OrderItemModifier {
  id               String        @id @default(cuid())
  orderItemId      String
  modifierOptionId String
  appliedPrice     Float                       // price at time of order
  orderItem        OrderItem     @relation(fields: [orderItemId], references: [id], onDelete: Cascade)
  modifierOption   ModifierOption @relation(fields: [modifierOptionId], references: [id])

  @@index([orderItemId])
}
```

---

### PasswordResetToken

```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  tokenHash String   @unique               // SHA-256 of raw token
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  @@index([tokenHash])
  @@index([userId])
}
```

---

### CashierShift

```prisma
model CashierShift {
  id              String    @id @default(cuid())
  openedAt        DateTime  @default(now())
  closedAt        DateTime?
  openingCash     Float     @default(0)
  closingCashEntered Float?                 // physical count entered at close
  expectedCash    Float?                   // computed: openingCash + sum(cash bills)
  cashVariance    Float?                   // closingCashEntered - expectedCash
  totalCash       Float     @default(0)
  totalCard       Float     @default(0)
  totalOnline     Float     @default(0)
  totalSales      Float     @default(0)
  note            String?
  cashierId       String
  cashier         User      @relation("ShiftCashier", fields: [cashierId], references: [id])
  tenantId        String
  tenant          Tenant    @relation(fields: [tenantId], references: [id])
  branchId        String?
  branch          Branch?   @relation(fields: [branchId], references: [id])
  bills           Bill[]

  @@index([tenantId])
  @@index([branchId])
  @@index([cashierId])
}
```

### BillSplit
Tracks item assignments when splitting a bill by item.

```prisma
model BillSplit {
  id          String  @id @default(cuid())
  orderId     String
  order       Order   @relation(fields: [orderId], references: [id])
  splitIndex  Int                            // 1-based split number
  totalAmount Float
  isPaid      Boolean @default(false)
  billId      String?                        // set once payment is processed
  bill        Bill?   @relation(fields: [billId], references: [id])

  items       BillSplitItem[]

  @@index([orderId])
}

model BillSplitItem {
  id          String    @id @default(cuid())
  splitId     String
  split       BillSplit @relation(fields: [splitId], references: [id], onDelete: Cascade)
  orderItemId String
  orderItem   OrderItem @relation(fields: [orderItemId], references: [id])
}
```

---

### PurchaseOrder

```prisma
model PurchaseOrder {
  id              String            @id @default(cuid())
  poNumber        String            @unique   // auto-generated PO-YYYY-NNNN
  status          PurchaseOrderStatus @default(DRAFT)
  supplierId      String
  supplier        Supplier          @relation(fields: [supplierId], references: [id])
  expectedDate    DateTime?
  receivedDate    DateTime?
  totalCost       Float             @default(0)
  notes           String?
  createdById     String?
  createdBy       User?             @relation("POCreator", fields: [createdById], references: [id])
  tenantId        String
  tenant          Tenant            @relation(fields: [tenantId], references: [id])
  branchId        String?
  branch          Branch?           @relation(fields: [branchId], references: [id])
  createdAt       DateTime          @default(now())

  items           PurchaseOrderItem[]

  @@index([tenantId])
  @@index([branchId])
}

model PurchaseOrderItem {
  id             String        @id @default(cuid())
  purchaseOrderId String
  purchaseOrder  PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
  materialId     String
  material       RawMaterial   @relation(fields: [materialId], references: [id])
  orderedQty     Float
  receivedQty    Float         @default(0)
  unitCost       Float

  batches        InventoryBatch[]
}
```

### InventoryBatch
Tracks individual received batches with expiry dates for FIFO consumption.

```prisma
model InventoryBatch {
  id              String            @id @default(cuid())
  materialId      String
  material        RawMaterial       @relation(fields: [materialId], references: [id])
  poItemId        String?
  poItem          PurchaseOrderItem? @relation(fields: [poItemId], references: [id])
  receivedQty     Float
  remainingQty    Float
  unitCost        Float
  expiryDate      DateTime?
  receivedAt      DateTime          @default(now())
  tenantId        String
  tenant          Tenant            @relation(fields: [tenantId], references: [id])
  branchId        String?
  branch          Branch?           @relation(fields: [branchId], references: [id])

  @@index([materialId])
  @@index([tenantId])
  @@index([expiryDate])
}

enum PurchaseOrderStatus {
  DRAFT
  SENT
  RECEIVED
  PARTIALLY_RECEIVED
  CANCELLED
}
```

---

### DeliveryTrackingToken

```prisma
// Add to existing Delivery model:
// trackingToken  String?  @unique
// trackingTokenExpiresAt  DateTime?
// New standalone model for token lookup:
model DeliveryTrackingToken {
  id          String   @id @default(cuid())
  tokenHash   String   @unique             // SHA-256 of raw token
  deliveryId  String   @unique
  delivery    Delivery @relation(fields: [deliveryId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())

  @@index([tokenHash])
}
```

---

### TwoFactorSetup (fields added to User)

Rather than a separate model, 2FA fields are added directly to `User`:

```prisma
// New fields on User:
// twoFactorEnabled      Boolean   @default(false)
// twoFactorSecret       String?   // AES-256-GCM encrypted TOTP secret
// twoFactorBackupCodes  String?   // JSON array of bcrypt-hashed backup codes
// twoFactorVerifiedAt   DateTime? // last time 2FA was successfully verified in session
```

---

### TalabatConfig & TalabatOrder

```prisma
model TalabatConfig {
  id             String  @id @default(cuid())
  tenantId       String  @unique
  tenant         Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  storeId        String                        // Talabat's store/restaurant ID
  apiKey         String                        // encrypted at rest
  webhookSecret  String                        // encrypted at rest
  isEnabled      Boolean @default(false)
  lastSyncAt     DateTime?
  branchId       String?
  branch         Branch? @relation(fields: [branchId], references: [id])
}

model TalabatOrder {
  id              String   @id @default(cuid())
  talabatOrderId  String   @unique              // Talabat's external order ID
  orderId         String   @unique
  order           Order    @relation(fields: [orderId], references: [id])
  rawPayload      String                        // original JSON webhook body
  createdAt       DateTime @default(now())

  @@index([talabatOrderId])
}
```

---

### KitchenStation & MenuItemStation

```prisma
model KitchenStation {
  id          String   @id @default(cuid())
  name        String
  nameAr      String?
  nameKu      String?
  colour      String   @default("#6366f1")    // Tailwind colour hex
  sortOrder   Int      @default(0)
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  branchId    String?
  branch      Branch?  @relation(fields: [branchId], references: [id])

  menuItems   MenuItemStation[]

  @@index([tenantId])
}

model MenuItemStation {
  id          String         @id @default(cuid())
  menuItemId  String
  stationId   String
  menuItem    MenuItem       @relation(fields: [menuItemId], references: [id], onDelete: Cascade)
  station     KitchenStation @relation(fields: [stationId], references: [id], onDelete: Cascade)

  @@unique([menuItemId, stationId])
}
```

---

### SeasonalMenu & SeasonalHours

```prisma
model SeasonalMenu {
  id          String   @id @default(cuid())
  name        String                              // e.g. "قائمة رمضان"
  startDate   DateTime
  endDate     DateTime
  isActive    Boolean  @default(false)            // managed by cron
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  branchId    String?
  branch      Branch?  @relation(fields: [branchId], references: [id])
  createdAt   DateTime @default(now())

  categories  SeasonalMenuCategory[]
  hours       SeasonalHours[]

  @@index([tenantId])
}

model SeasonalMenuCategory {
  id             String       @id @default(cuid())
  seasonalMenuId String
  seasonalMenu   SeasonalMenu @relation(fields: [seasonalMenuId], references: [id], onDelete: Cascade)
  categoryId     String
  category       Category     @relation(fields: [categoryId], references: [id])

  @@unique([seasonalMenuId, categoryId])
}

model SeasonalHours {
  id             String       @id @default(cuid())
  seasonalMenuId String
  seasonalMenu   SeasonalMenu @relation(fields: [seasonalMenuId], references: [id], onDelete: Cascade)
  dayOfWeek      Int?                              // 0=Sun, 1=Mon, ... null=all days
  openTime       String                            // "HH:MM" 24h
  closeTime      String                            // "HH:MM" 24h
}
```

---

### CustomerFeedback

```prisma
model CustomerFeedback {
  id          String   @id @default(cuid())
  orderId     String
  order       Order    @relation(fields: [orderId], references: [id])
  rating      Int                                 // 1-5
  comment     String?
  createdAt   DateTime @default(now())
  tenantId    String
  tenant      Tenant   @relation(fields: [tenantId], references: [id])
  branchId    String?
  branch      Branch?  @relation(fields: [branchId], references: [id])

  @@unique([orderId])                             // one feedback per order
  @@index([tenantId])
}
```

---

### LoginAttempt (Security)

```prisma
model LoginAttempt {
  id          String   @id @default(cuid())
  email       String
  ipAddress   String?
  success     Boolean
  createdAt   DateTime @default(now())

  @@index([email, createdAt])
  @@index([ipAddress, createdAt])
}
```

### VoidRequest (Security — Supervisor Approval)

```prisma
model VoidRequest {
  id            String          @id @default(cuid())
  orderId       String
  order         Order           @relation(fields: [orderId], references: [id])
  requestedById String
  requestedBy   User            @relation("VoidRequester", fields: [requestedById], references: [id])
  approvedById  String?
  approvedBy    User?           @relation("VoidApprover", fields: [approvedById], references: [id])
  status        VoidRequestStatus @default(PENDING)
  reason        String?
  createdAt     DateTime        @default(now())
  resolvedAt    DateTime?
  tenantId      String
  tenant        Tenant          @relation(fields: [tenantId], references: [id])

  @@index([tenantId])
  @@index([status])
}

enum VoidRequestStatus {
  PENDING
  APPROVED
  REJECTED
}
```

---

## Modified Existing Models

### User (additions)
```prisma
// Add to User:
twoFactorEnabled     Boolean   @default(false)
twoFactorSecret      String?
twoFactorBackupCodes String?
twoFactorVerifiedAt  DateTime?
language             Language  @default(AR)

// New relations:
passwordResetTokens  PasswordResetToken[]
cashierShifts        CashierShift[]        @relation("ShiftCashier")
purchaseOrders       PurchaseOrder[]       @relation("POCreator")
voidRequestsMade     VoidRequest[]         @relation("VoidRequester")
voidRequestsApproved VoidRequest[]         @relation("VoidApprover")
```

### MenuItem (additions)
```prisma
// Add to MenuItem:
nameAr       String?
nameKu       String?
nameEn       String?
prepTimeMins Int?                  // estimated prep time in minutes for KDS alerts

// New relations:
modifierGroups  MenuItemModifierGroup[]
stations        MenuItemStation[]
```

### Category (additions)
```prisma
// Add to Category:
nameAr  String?
nameKu  String?
nameEn  String?
```

### OrderItem (additions)
```prisma
// Add to OrderItem:
prepStartedAt  DateTime?           // set when station marks item as started
modifiers      OrderItemModifier[]
billSplitItems BillSplitItem[]
```

### Bill (additions)
```prisma
// Add to Bill:
shiftId    String?
shift      CashierShift? @relation(fields: [shiftId], references: [id])
splitId    String?
split      BillSplit?    @relation(fields: [splitId], references: [id])
```

### Order (additions)
```prisma
// Add to Order:
feedback    CustomerFeedback?
voidRequest VoidRequest?
billSplits  BillSplit[]
talabatOrder TalabatOrder?
```

### Delivery (additions)
```prisma
// Add to Delivery:
trackingToken DeliveryTrackingToken?
```

### RawMaterial (additions)
```prisma
// Add to RawMaterial:
batches          InventoryBatch[]
modifierOptions  ModifierOption[]
```

### Tenant (additions)
```prisma
// Add to Tenant:
language            Language  @default(AR)
googlePlaceId       String?              // for NPS Google Reviews redirect
defaultLanguage     Language  @default(AR)

// New relations:
modifierGroups    ModifierGroup[]
cashierShifts     CashierShift[]
purchaseOrders    PurchaseOrder[]
inventoryBatches  InventoryBatch[]
kitchenStations   KitchenStation[]
seasonalMenus     SeasonalMenu[]
customerFeedbacks CustomerFeedback[]
talabatConfig     TalabatConfig?
talabatOrders     TalabatOrder[]      // via order relation
voidRequests      VoidRequest[]
loginAttempts     LoginAttempt[]      // via email, not FK
```

### Branch (additions)
```prisma
// New relations on Branch:
cashierShifts     CashierShift[]
purchaseOrders    PurchaseOrder[]
inventoryBatches  InventoryBatch[]
kitchenStations   KitchenStation[]
seasonalMenus     SeasonalMenu[]
customerFeedbacks CustomerFeedback[]
```

### AuditLog (additions)
```prisma
// Add to AuditLog:
entityType   String?           // e.g. "Order", "Bill", "Expense"
entityId     String?
valueBefore  String?           // JSON string
valueAfter   String?           // JSON string
ipAddress    String?
tenantId     String?
```

---

## New Enums

```prisma
enum Language {
  AR
  KU
  EN
}

enum PurchaseOrderStatus {
  DRAFT
  SENT
  RECEIVED
  PARTIALLY_RECEIVED
  CANCELLED
}

enum VoidRequestStatus {
  PENDING
  APPROVED
  REJECTED
}
```

---

## Entity Relationship Summary

```
Tenant
├── ModifierGroup[] → ModifierOption[] → MenuItemModifierGroup[] → MenuItem
├── CashierShift[] → Bill[]
├── PurchaseOrder[] → PurchaseOrderItem[] → InventoryBatch[] → RawMaterial
├── TalabatConfig (1:1)
├── KitchenStation[] → MenuItemStation[] → MenuItem
├── SeasonalMenu[] → SeasonalMenuCategory[] → Category
├── CustomerFeedback[] → Order (1:1)
├── VoidRequest[] → Order
└── LoginAttempt[] (by email, no FK)

Order
├── OrderItem[] → OrderItemModifier[] → ModifierOption
├── BillSplit[] → BillSplitItem[] → OrderItem
├── Bill[] → CashierShift
├── CustomerFeedback (0:1)
└── TalabatOrder (0:1)

Delivery → DeliveryTrackingToken (1:1)

User
├── PasswordResetToken[]
├── CashierShift[] (as cashier)
└── 2FA fields (inline)
```

---

## Migration Strategy

All changes are non-breaking. Migration order:

1. Add new enum values (`Language`, `PurchaseOrderStatus`, `VoidRequestStatus`)
2. Add nullable fields to existing models (User, MenuItem, Category, OrderItem, Bill, Order, Delivery, RawMaterial, AuditLog)
3. Create new models in dependency order:
   - `ModifierGroup` → `ModifierOption` → `MenuItemModifierGroup` → `OrderItemModifier`
   - `CashierShift` → (Bill.shiftId FK)
   - `BillSplit` → `BillSplitItem`
   - `PurchaseOrder` → `PurchaseOrderItem` → `InventoryBatch`
   - `DeliveryTrackingToken`
   - `TalabatConfig` → `TalabatOrder`
   - `KitchenStation` → `MenuItemStation`
   - `SeasonalMenu` → `SeasonalMenuCategory` → `SeasonalHours`
   - `CustomerFeedback`
   - `LoginAttempt`
   - `VoidRequest`
   - `PasswordResetToken`
4. Run `prisma migrate deploy`
5. No seed data changes required — all new features are opt-in
