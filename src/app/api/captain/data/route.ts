import { NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/api-guard';
import { getCaptainMenu, getTables } from '@/lib/actions/captain';
import { getEffectiveServiceMode } from '@/lib/actions/config';
import { getActiveBranchId } from '@/lib/utils/branch-filter';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Same roles allowed to create captain orders (createCaptainOrder)
  const guard = await requireApiRole(['ADMIN', 'MANAGER', 'CAPTAIN', 'WAITER']);
  if (guard.response) return guard.response;

  const tenantId = guard.user.tenantId;
  const branchId = tenantId ? await getActiveBranchId(tenantId) : null;
  const branchWhere = branchId ? { branchId } : {};

  const [categories, tables, serviceMode, readyCount] = await Promise.all([
    getCaptainMenu(),
    getTables(),
    getEffectiveServiceMode(),
    tenantId
      ? prisma.order.count({ where: { tenantId, status: 'READY', tableId: { not: null }, ...branchWhere } })
      : Promise.resolve(0),
  ]);

  return NextResponse.json({ categories, tables, serviceMode, readyCount, tenantId, branchId });
}
