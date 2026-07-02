import { NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/api-guard';
import { getKitchenOrders } from '@/lib/actions/kitchen';
import { getCategories } from '@/lib/actions/menu';
import { getStations } from '@/lib/actions/kitchen-stations';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireApiRole(['ADMIN', 'MANAGER', 'CHEF', 'CASHIER']);
  if (guard.response) return guard.response;

  const [orders, categories, stations] = await Promise.all([
    getKitchenOrders(),
    getCategories(),
    getStations(),
  ]);

  return NextResponse.json({ orders, categories, stations });
}
