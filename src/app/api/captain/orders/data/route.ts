import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCaptainActiveOrders } from '@/lib/actions/captain';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const orders = await getCaptainActiveOrders();
  return NextResponse.json({ orders });
}
