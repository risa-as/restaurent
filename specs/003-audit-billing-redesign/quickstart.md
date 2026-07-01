# Quickstart & Integration Scenarios

**Feature**: 003-audit-billing-redesign
**Date**: 2026-03-15

---

## Scenario 1: Tenant Isolation Verification

**Setup**: Two tenants (Restaurant A, Restaurant B). Each has 3 orders.

**Test flow**:
1. Log in as ADMIN of Restaurant A
2. Open `/kitchen` → should see ONLY Restaurant A's 3 orders
3. Open `/cashier` → should see ONLY Restaurant A's bills
4. Open `/dashboard/finance` → revenue should reflect ONLY Restaurant A
5. Log in as ADMIN of Restaurant B → repeat, see ONLY B's data
6. Attempt direct API call with Restaurant A's session to fetch Restaurant B's orderId → should return 404 or empty

**Expected**: Zero cross-tenant data visible at any screen.

---

## Scenario 2: Multi-Branch Order Isolation

**Setup**: ENTERPRISE tenant with 2 branches (Branch Downtown, Branch Mall). Each branch has 2 active orders.

**Test flow**:
1. Log in as CHEF assigned to Branch Downtown
2. Open `/kitchen` → should see ONLY Branch Downtown's 2 orders
3. Switch branch selector to Branch Mall → should see ONLY Branch Mall's 2 orders
4. Refresh page → branch selection should persist (Branch Mall still selected)
5. Log in as CASHIER assigned to Branch Downtown
6. Open `/cashier` → should see ONLY Branch Downtown's orders/tables

**Expected**: Branch filter is respected on every screen. No orders from the other branch ever appear.

---

## Scenario 3: Order Flow — Kitchen to Billing

**Setup**: ENTERPRISE tenant. Captain creates an order with 2 items (Item A: 5000 IQD × 2 = 10000, Item B with 20% offer: 8000 IQD × 1 = 6400 after discount). Total expected = 16400 IQD.

**Test flow**:
1. Captain submits order → status = PENDING
2. Kitchen screen shows order within 3 seconds (Pusher event)
3. Chef marks order as READY → status = READY
4. Waiter screen shows notification within 3 seconds
5. Waiter taps "Delivered" → status = SERVED
6. Cashier opens bill → displayed total = **16400 IQD** (not 18000)
7. Cashier completes bill → status = COMPLETED
8. Finance dashboard shows 16400 IQD in today's revenue (once, not twice)
9. Inventory stock for Item A's recipe ingredients decreases by correct quantity

**Expected**: Every step proceeds in order, total is accurate, no duplication in reports.

---

## Scenario 4: Restaurant Billing — Upgrade Request Flow

**Setup**: Restaurant on BASIC plan, 5 days left on subscription.

**Test flow**:
1. ADMIN logs in, opens `/dashboard/billing`
2. Page shows: Plan = BASIC, 5 days remaining, payment history table
3. Payment instructions section shows Super Admin's bank transfer details (name, account, IBAN)
4. Admin clicks "تجديد / ترقية" → upgrade request form opens
5. Admin selects PRO plan, 1 month → submits
6. `ManualPayment` record created with `status=PENDING`
7. Billing page now shows "بانتظار الموافقة" badge
8. Admin cannot submit a second request while one is PENDING (button disabled)

**Expected**: Smooth self-service upgrade request with clear status feedback.

---

## Scenario 5: Super Admin Billing Approval

**Setup**: Pending upgrade request from Scenario 4 exists.

**Test flow**:
1. Super Admin opens `/superadmin/billing`
2. Dashboard shows: MRR = sum of all active subscriptions, expiring tenants list
3. "طلبات معلقة" section shows the pending request (Restaurant X, BASIC → PRO)
4. Super Admin clicks "موافقة" (Approve)
5. System performs atomically:
   - Tenant plan updated to PRO
   - `subscriptionStatus` = ACTIVE
   - `currentPeriodEnd` = today + 30 days
   - `ManualPayment.status` = APPROVED
   - `ManualPayment.invoiceNumber` = next sequential number
   - `ManualPayment.periodFrom/To` = set correctly
6. Restaurant's billing page now shows PRO plan, new renewal date, invoice in history

**Expected**: One-click approval completes entire subscription lifecycle update.

---

## Scenario 6: Expiry Warning

**Setup**: 3 tenants — one expiring in 3 days, one in 15 days, one in 45 days.

**Test flow**:
1. Super Admin opens `/superadmin/billing` or `/superadmin/tenants`
2. Tenant expiring in 3 days → shown with red "3 أيام" badge, appears at top of urgent list
3. Tenant expiring in 15 days → shown with normal status
4. Tenant expiring in 45 days → no special indicator

**Expected**: Urgent expiry (≤7 days) prominently highlighted.

---

## Scenario 7: Design Quality Check

**Test flow**: Walk through every major screen with fresh eyes.

**Checklist per screen**:
- [ ] Login page → split layout, no broken elements
- [ ] Dashboard home → stat cards with trends, no blank boxes after load
- [ ] Dashboard analytics → charts use primary brand color
- [ ] Kitchen board → dark theme, orders clear, pulsing live dot
- [ ] Cashier → full-page layout, no map in delivery orders
- [ ] Captain → quick service mode hides order form correctly
- [ ] Waiter → sound notification working, live indicator showing
- [ ] Super Admin overview → distinct sidebar, MRR visible
- [ ] Super Admin billing → pending requests, expiry warnings
- [ ] All empty states → icon + Arabic description, never blank white

**Expected**: Every screen passes all checklist items.

---

## Development Environment Setup

```bash
# 1. Run schema migration
npx prisma migrate dev --name "add-tenant-isolation-fields"

# 2. Verify migration
npx prisma studio  # Inspect Bill, DailyClose, Expense, Offer tables

# 3. Run dev server
npm run dev

# 4. Seed test data (two tenants, two branches)
npx ts-node prisma/seed-tenant.ts
```

## Key Files Reference

| Area | Files |
|------|-------|
| Schema | `prisma/schema.prisma` |
| Tenant isolation | `src/lib/auth-guard.ts`, `src/lib/tenant.ts` |
| Branch filter | `src/lib/actions/branches.ts` |
| Billing actions | `src/lib/actions/billing.ts` |
| Super Admin actions | `src/lib/actions/superadmin.ts` |
| Billing page | `src/app/dashboard/billing/page.tsx` |
| Super Admin billing | `src/app/superadmin/payments/page.tsx` |
| Plan limits | `src/lib/plan-limits.ts` |
| Design components | `src/components/ui/` |
