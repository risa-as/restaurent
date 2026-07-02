import { NextResponse } from 'next/server';
import { requireApiRole } from '@/lib/api-guard';
import { getDeliveryOrders, getDrivers, getUnpaidDeliveryOrders, getAllDeliveryOrders } from '@/lib/actions/delivery';
import { getMenuItems } from '@/lib/actions/menu';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requireApiRole(['ADMIN', 'MANAGER', 'DELIVERY_MANAGER', 'DRIVER']);
  if (guard.response) return guard.response;

  const isManager = ['DELIVERY_MANAGER', 'ADMIN', 'MANAGER'].includes(guard.user.role);
  const driverId = !isManager ? guard.user.userId : undefined;

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
    userId: guard.user.userId,
  });
}
