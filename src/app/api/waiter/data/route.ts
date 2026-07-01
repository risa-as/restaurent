import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getReadyOrders, getDirtyTables, getServedOrders } from '@/lib/actions/waiter';
import { getTablesNeedingReview } from '@/lib/actions/table-review';
import { getEffectiveServiceMode } from '@/lib/actions/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const [serviceMode, readyOrders, dirtyTables, servedOrders, tablesNeedingReview] = await Promise.all([
    getEffectiveServiceMode(),
    getReadyOrders(),
    getDirtyTables(),
    getServedOrders(),
    getTablesNeedingReview(),
  ]);

  return NextResponse.json({ serviceMode, readyOrders, dirtyTables, servedOrders, tablesNeedingReview });
}
