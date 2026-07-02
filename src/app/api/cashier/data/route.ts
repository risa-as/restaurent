import { NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/api-guard';
import { getCashierOrders, getPendingBills, getActiveTableOrders, getQrPendingBills } from '@/lib/actions/cashier';
import { getPOSData } from '@/lib/actions/pos';
import { getEffectiveServiceMode } from '@/lib/actions/config';
import { getCurrentShift } from '@/lib/actions/shifts';
import { getTenantWithPlan, getEffectiveLimits } from '@/lib/plan-limits';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Financial data (shift totals, sales) — cashier chain only
  const guard = await requireApiRole(['ADMIN', 'MANAGER', 'CASHIER']);
  if (guard.response) return guard.response;

  const tenantId = guard.user.tenantId;

  // Wave 1 — all independent queries run in parallel (was sequential ~7s, now ~1-2s)
  const [
    serviceMode,
    currentShift,
    posData,
    orders,
    activeTableOrders,
    tenant,
    tenantSettings,
  ] = await Promise.all([
    getEffectiveServiceMode(),
    getCurrentShift(),
    getPOSData(),
    getCashierOrders(),
    getActiveTableOrders(),
    tenantId ? getTenantWithPlan(tenantId) : Promise.resolve(null),
    tenantId
      ? prisma.tenant.findUnique({ where: { id: tenantId }, select: { loyaltyEnabled: true } })
      : Promise.resolve(null),
  ]);

  const { categories, menuItems, tables } = posData;
  const planSupportsLoyalty = tenant ? getEffectiveLimits(tenant).modules.loyalty : false;
  const loyaltyEnabled = planSupportsLoyalty && (tenantSettings?.loyaltyEnabled ?? false);

  // Wave 2 — the only query that depends on serviceMode
  if (serviceMode === 'QUICK_SERVICE') {
    const qrBills = await getQrPendingBills();
    return NextResponse.json({
      serviceMode, currentShift, loyaltyEnabled,
      categories, menuItems, tables,
      orders,
      qrBills, activeTableOrders,
      tenantId,
    });
  }

  const pendingBills = await getPendingBills();
  return NextResponse.json({
    serviceMode, currentShift, loyaltyEnabled,
    categories, menuItems, tables,
    orders,
    pendingBills, activeTableOrders,
    tenantId,
  });
}
