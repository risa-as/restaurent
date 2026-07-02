import { NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/api-guard';
import { getReadyOrders, getDirtyTables, getServedOrders } from '@/lib/actions/waiter';
import { getTablesNeedingReview } from '@/lib/actions/table-review';
import { getEffectiveServiceMode } from '@/lib/actions/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireApiRole(['ADMIN', 'MANAGER', 'WAITER', 'CAPTAIN']);
  if (guard.response) return guard.response;

  const [serviceMode, readyOrders, dirtyTables, servedOrders, tablesNeedingReview] = await Promise.all([
    getEffectiveServiceMode(),
    getReadyOrders(),
    getDirtyTables(),
    getServedOrders(),
    getTablesNeedingReview(),
  ]);

  return NextResponse.json({ serviceMode, readyOrders, dirtyTables, servedOrders, tablesNeedingReview });
}
