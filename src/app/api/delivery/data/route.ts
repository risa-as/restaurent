import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getDeliveryOrders, getDrivers, getUnpaidDeliveryOrders, getAllDeliveryOrders } from '@/lib/actions/delivery';
import { getMenuItems } from '@/lib/actions/menu';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const isManager = ['DELIVERY_MANAGER', 'ADMIN', 'MANAGER'].includes(session.user.role as string);
  const driverId = !isManager ? session.user.id : undefined;

  const [deliveries, drivers, unpaidDeliveries, menuItems, historyDeliveries] = await Promise.all([
    getDeliveryOrders(),
    getDrivers(),
    isManager ? getUnpaidDeliveryOrders() : Promise.resolve([]),
    isManager ? getMenuItems() : Promise.resolve([]),
    getAllDeliveryOrders(driverId),
  ]);

  return NextResponse.json({
    deliveries,
    drivers,
    unpaidDeliveries,
    menuItems,
    historyDeliveries,
    isManager,
    userId: session.user.id,
  });
}
