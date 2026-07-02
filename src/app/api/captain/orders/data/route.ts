import { NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/api-guard';
import { getCaptainActiveOrders } from '@/lib/actions/captain';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireApiRole(['ADMIN', 'MANAGER', 'CAPTAIN', 'WAITER']);
  if (guard.response) return guard.response;

  const orders = await getCaptainActiveOrders();
  return NextResponse.json({ orders });
}
