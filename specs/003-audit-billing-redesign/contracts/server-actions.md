# Server Action Contracts

**Feature**: 003-audit-billing-redesign
**Date**: 2026-03-15

These contracts define the expected behavior of all modified and new server actions.

---

## Tenant Isolation Contract (ALL actions)

Every server action that reads or writes tenant-scoped data MUST:

1. Call `verifyRole([...])` or `getCurrentUser()` to get `tenantId`
2. If `tenantId` is falsy: throw `'UNAUTHORIZED: no tenant context'`
3. Include `tenantId` in every Prisma `where` clause (never optional)

```typescript
// REQUIRED PATTERN for every tenant-scoped action:
const { tenantId } = await verifyRole(['ROLE']);
if (!tenantId) throw new Error('UNAUTHORIZED: no tenant context');
// All queries: prisma.X.findMany({ where: { tenantId, ...otherFilters } })
```

---

## New / Modified Billing Actions (`src/lib/actions/billing.ts`)

### `getBillingInfo(): Promise<BillingInfo>`
Returns current tenant's plan info + platform settings.

**Response shape**:
```typescript
{
  tenant: {
    id: string;
    name: string;
    plan: PlanType;
    subscriptionStatus: SubStatus;
    trialEndsAt: Date | null;
    currentPeriodEnd: Date | null;
  };
  settings: {
    bankName: string;
    bankAccount: string;
    bankAccountName: string;
    bankIban: string;          // NEW
    zainCashNumber: string;
    pricingBasic: number;
    pricingPro: number;
    pricingEnterprise: number;
    usdToIqdRate: number;      // NEW
  };
  pendingRequest: ManualPayment | null;  // NEW — active PENDING request if any
}
```

### `submitUpgradeRequest(plan: PlanType, months: number): Promise<{success: boolean}>`
Creates a new upgrade request. Throws if a PENDING request already exists.

**Validation**:
- `plan` must be BASIC | PRO | ENTERPRISE
- `months` must be 1 | 3 | 6 | 12
- No existing PENDING request for this tenant

### `getPaymentHistory(): Promise<ManualPayment[]>`
Returns all ManualPayment records for the current tenant, ordered by `createdAt DESC`.

---

## New Super Admin Billing Actions (`src/lib/actions/superadmin.ts`)

### `getSuperAdminBillingDashboard(): Promise<BillingDashboard>`
```typescript
{
  mrr: number;                              // Sum of active plan prices (IQD/month)
  activeTenants: number;
  trialTenants: number;
  pendingRequests: PendingRequestSummary[];
  expiringTenants: ExpiringTenant[];        // Expiring within 7 days
  planBreakdown: { plan: PlanType; count: number; revenue: number }[];
}
```

### `approveUpgradeRequest(requestId: string): Promise<{success: boolean; invoiceNumber: number}>`
Atomically:
1. Fetches `ManualPayment` where `id = requestId` and `status = PENDING`
2. Determines new `periodFrom`: MAX(today, tenant.currentPeriodEnd)
3. Calculates `periodTo`: `periodFrom + months months`
4. Assigns `invoiceNumber`: `MAX(invoiceNumber) + 1` across all ManualPayments
5. Updates `ManualPayment`: `status=APPROVED, invoiceNumber, periodFrom, periodTo, approvedAt, approvedById`
6. Updates `Tenant`: `plan, subscriptionStatus=ACTIVE, currentPeriodEnd=periodTo`
7. All in a Prisma transaction

**Throws**:
- `REQUEST_NOT_FOUND` if requestId doesn't exist or not PENDING
- `TENANT_SUSPENDED` if tenant is not active

### `rejectUpgradeRequest(requestId: string, reason: string): Promise<{success: boolean}>`
Updates `ManualPayment`: `status=REJECTED, adminNote=reason`.
Throws if `reason` is empty.

### `manuallyExtendTenant(tenantId: string, months: number): Promise<{success: boolean}>`
Extends `tenant.currentPeriodEnd` by `months` months. Creates a APPROVED ManualPayment with `amount=0` as record.

### `updatePlatformSettings(settings: Partial<PlatformSettings>): Promise<{success: boolean}>`
Updates the PlatformSettings singleton. Super Admin only.

---

## New Branch Filter Utility (`src/lib/utils/branch-filter.ts`)

### `getBranchFilter(tenantId: string): Promise<{branchId: string} | {}>`
```typescript
async function getBranchFilter(tenantId: string): Promise<{ branchId: string } | {}> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { multiBranchEnabled: true }
  });
  if (!tenant?.multiBranchEnabled) return {};
  const branchId = await getSelectedBranchId();
  return branchId ? { branchId } : {};
}
```

**Used by**: kitchen.ts, cashier.ts, captain.ts, waiter.ts, tables.ts

---

## Financial Accuracy Contract (`src/lib/actions/cashier.ts`)

### `settleBill(orderId: string, paymentMethod: PaymentMethod): Promise<{success: boolean; billId: string}>`

Bill amount MUST be recalculated from order items at settlement time:

```typescript
// 1. Fetch order items with current prices
const order = await prisma.order.findUnique({
  where: { id: orderId, tenantId },  // tenantId REQUIRED
  include: { items: true }
});

// 2. Recalculate total
const itemTotal = order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);

// 3. Apply offers (fetch active offers for items in order)
const discountAmount = await calculateActiveDiscounts(order.items, tenantId);

// 4. Final amount
const finalAmount = itemTotal - discountAmount;

// 5. Create Bill with recalculated amount + tenantId
await prisma.bill.create({
  data: { orderId, amount: finalAmount, paymentMethod, tenantId }
});
```

---

## UI Component Contracts (`src/components/ui/`)

### `<EmptyState icon, title, description, action? />`
Props:
```typescript
{
  icon: LucideIcon;
  title: string;        // Arabic
  description: string;  // Arabic
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

### `<StatCard label, value, trend?, icon? />`
Props:
```typescript
{
  label: string;
  value: string | number;
  trend?: {
    value: number;       // percentage
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  icon?: LucideIcon;
  className?: string;
}
```

### `<StatusBadge status />`
```typescript
// Maps status string to semantic color
type StatusBadgeProps = {
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ACTIVE' | 'TRIAL' |
          'PAST_DUE' | 'EXPIRED' | 'READY' | 'SERVED' | 'DIRTY' | 'AVAILABLE';
}
```

### `<ConnectionDot connected />`
```typescript
{ connected: boolean }
// connected=true → green pulsing dot + "مباشر"
// connected=false → gray dot + "غير متصل"
```

### `<PageHeader title, subtitle?, actions?, breadcrumbs? />`
```typescript
{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}
```
