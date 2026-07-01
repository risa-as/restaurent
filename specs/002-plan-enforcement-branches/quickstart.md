# Quickstart: Plan Enforcement, Multi-Branch & Cashier Auto-Sync

**Feature Branch**: `002-plan-enforcement-branches`
**Date**: 2026-03-15

---

## Integration Scenarios

### Scenario 1: Plan Limit Check in a Server Action

```typescript
// In any server action that creates a restricted resource:
import { checkPlanLimit, getPlanLimits } from '@/lib/plan-limits';

export async function createMenuItem(data: ...) {
  'use server';
  // 1. Get tenant context
  const user = await getCurrentUser();
  // 2. Check plan module/limit
  await checkPlanLimit(user.tenantId, 'menuItem');
  // 3. Proceed with creation
  ...
}
```

`checkPlanLimit` throws `PlanLimitError` if the limit is exceeded. The client catches this and shows `<PlanUpgradePrompt>`.

---

### Scenario 2: Showing Upgrade Prompt on a Locked Page

```tsx
// In a page component for a plan-restricted module:
import { PlanUpgradePrompt } from '@/components/plan/plan-upgrade-prompt';

export default async function DeliveryPage() {
  const tenant = await getTenantWithPlan();
  const limits = getPlanLimits(tenant.plan);

  if (!limits.modules.delivery) {
    return <PlanUpgradePrompt feature="التوصيل" requiredPlan="PRO" />;
  }
  // ... rest of the page
}
```

---

### Scenario 3: Locked Sidebar Nav Item

The `GlobalSidebar` receives a `planModules` prop (from layout Server Component). Nav items with a `planModule` key are rendered with a lock icon and `pointer-events-none` if the module is disabled.

```tsx
// In dashboard/layout.tsx (Server Component):
const tenant = await getTenantWithPlan();
const planModules = getPlanLimits(tenant.plan).modules;

// Pass to GlobalSidebar:
<GlobalSidebar planModules={planModules} ... />
```

---

### Scenario 4: Branch Selection (Multi-Branch)

```tsx
// In operational layout (kitchen/cashier/waiter) when multiBranchEnabled:
import { BranchSelector } from '@/components/branch/branch-selector';

// BranchSelector sets a cookie 'selected_branch_id' via Server Action
// All data queries in the page/children read this cookie for filtering
```

---

### Scenario 5: Cashier Auto-Sync

```tsx
// cashier/page.tsx (Server Component):
const config = await getEffectiveServiceMode(); // reads branch > tenant serviceMode
// config.serviceMode is QUICK_SERVICE or TABLE_SERVICE

if (config.serviceMode === 'QUICK_SERVICE') {
  return <CashierView ... />; // POS only
}
return <PendingBillsView ... />; // Table bills only
```

`getEffectiveServiceMode()` — reads selected branch's serviceMode if multi-branch active, else Tenant.serviceMode.

---

## Development Setup Notes

1. After schema changes, run: `npx prisma db push`
2. Seed a test TRIAL tenant (already done in previous seed) and verify:
   - Adding 10 menu items succeeds
   - Adding the 11th returns a PlanLimitError
3. Set tenant serviceMode in DB to test cashier auto-sync:
   ```sql
   UPDATE "Tenant" SET "serviceMode" = 'QUICK_SERVICE' WHERE slug = 'test-tenant';
   ```
