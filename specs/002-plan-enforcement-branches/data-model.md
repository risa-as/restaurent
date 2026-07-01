# Data Model: Plan Enforcement, Multi-Branch & Cashier Auto-Sync

**Feature Branch**: `002-plan-enforcement-branches`
**Date**: 2026-03-15

---

## New Model: Branch

```prisma
model Branch {
  id          String      @id @default(cuid())
  tenantId    String
  name        String
  address     String?
  phone       String?
  isActive    Boolean     @default(true)
  serviceMode ServiceMode @default(TABLE_SERVICE)
  isMainBranch Boolean    @default(false)
  createdAt   DateTime    @default(now())

  tenant  Tenant  @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  orders  Order[]
  tables  Table[]
  users   User[]

  @@index([tenantId])
}
```

---

## Modified Model: Tenant

Add field:
```prisma
multiBranchEnabled Boolean @default(false)
branches           Branch[]
```

---

## Modified Model: Order

Add field:
```prisma
branchId String?
branch   Branch? @relation(fields: [branchId], references: [id])
```

---

## Modified Model: Table

Add field:
```prisma
branchId String?
branch   Branch? @relation(fields: [branchId], references: [id])
```

---

## Modified Model: User

Add field:
```prisma
branchId String?
branch   Branch? @relation(fields: [branchId], references: [id])
```

---

## Configuration Object: PlanLimits (src/lib/plan-limits.ts)

Not a DB model. TypeScript object:

```typescript
interface PlanLimits {
  maxOrdersPerMonth: number | null;   // null = unlimited
  maxMenuItems: number | null;
  maxStaffAccounts: number | null;
  modules: {
    delivery: boolean;
    inventory: boolean;
    loyalty: boolean;
    qrMenu: boolean;
    offers: boolean;
    reservations: boolean;
    advancedReports: boolean;
    customBranding: boolean;
    multiBranch: boolean;
    analytics: boolean;
  };
}

const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  TRIAL: {
    maxOrdersPerMonth: 50,
    maxMenuItems: 10,
    maxStaffAccounts: 3,
    modules: {
      delivery: false, inventory: false, loyalty: false,
      qrMenu: false, offers: false, reservations: false,
      advancedReports: false, customBranding: false,
      multiBranch: false, analytics: false
    }
  },
  BASIC: {
    maxOrdersPerMonth: null,
    maxMenuItems: null,
    maxStaffAccounts: 8,
    modules: {
      delivery: false, inventory: false, loyalty: false,
      qrMenu: false, offers: false, reservations: true,
      advancedReports: false, customBranding: false,
      multiBranch: false, analytics: false
    }
  },
  PRO: {
    maxOrdersPerMonth: null,
    maxMenuItems: null,
    maxStaffAccounts: 20,
    modules: {
      delivery: true, inventory: true, loyalty: true,
      qrMenu: true, offers: true, reservations: true,
      advancedReports: true, customBranding: false,
      multiBranch: false, analytics: true
    }
  },
  ENTERPRISE: {
    maxOrdersPerMonth: null,
    maxMenuItems: null,
    maxStaffAccounts: null,
    modules: {
      delivery: true, inventory: true, loyalty: true,
      qrMenu: true, offers: true, reservations: true,
      advancedReports: true, customBranding: true,
      multiBranch: true, analytics: true
    }
  }
};
```

---

## Entity Relationships (additions only)

```
Tenant
  └── Branch[] (1:N) — only populated when multiBranchEnabled = true
        ├── Order[] (1:N)
        ├── Table[] (1:N)
        └── User[] (1:N)
```

All FK relations are **optional** (nullable) to preserve backward compatibility with existing records.

---

## State Transitions

### Branch.isActive
```
true ──(deactivate)──► false
false ──(activate)───► true
```
When deactivated: branch orders/tables still accessible for history; no new orders can be created for this branch.

### Tenant.multiBranchEnabled
```
false ──(enable, auto-creates main branch)──► true
true  ──(disable, falls back to main branch)──► false
```
