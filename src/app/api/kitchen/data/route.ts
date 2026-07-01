import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getKitchenOrders } from '@/lib/actions/kitchen';
import { getCategories } from '@/lib/actions/menu';
import { getStations } from '@/lib/actions/kitchen-stations';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const [orders, categories, stations] = await Promise.all([
    getKitchenOrders(),
    getCategories(),
    getStations(),
  ]);

  return NextResponse.json({ orders, categories, stations });
}
