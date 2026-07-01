import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { triggerPusher } from '@/lib/pusher';
import { deductOrderStock } from '@/lib/actions/order-completion';
import type { QueuedAction } from '@/lib/offline/db';
import { OrderStatus } from '@prisma/client';

// Roles permitted to submit offline-queued operations
const SYNC_ALLOWED_ROLES = ['ADMIN', 'MANAGER', 'CAPTAIN', 'CASHIER', 'WAITER', 'CHEF'];

// Roles permitted to update order / item status (kitchen + management only)
const STATUS_UPDATE_ROLES = ['ADMIN', 'MANAGER', 'CHEF', 'CASHIER'];

// Valid order status transitions from offline clients
const ALLOWED_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.PREPARING,
  OrderStatus.READY,
  OrderStatus.SERVED,
];

// Valid item status values from offline clients (no COMPLETED — cashier flow required).
// OrderItem.status uses the shared OrderStatus enum (there is no OrderItemStatus).
const ALLOWED_ITEM_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.PREPARING,
  OrderStatus.READY,
];

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const action = (await req.json()) as QueuedAction;
    if (!action?.type || !action?.tenantId) {
      return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 });
    }

    // Security: verify session tenant matches payload tenant
    const sessionTenantId = (session.user as unknown as Record<string, unknown>).tenantId as string | undefined;
    if (!sessionTenantId || sessionTenantId !== action.tenantId) {
      return NextResponse.json({ error: 'غير مصرح للوصول لهذا المطعم' }, { status: 403 });
    }

    // Verify role is allowed to use offline sync
    const userRole = (session.user as unknown as Record<string, unknown>).role as string | undefined;
    if (!userRole || !SYNC_ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'دورك لا يملك صلاحية المزامنة' }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { tenantId: true, id: true, role: true, branchId: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 403 });
    }

    switch (action.type) {
      case 'CREATE_ORDER':
        return handleCreateOrder(action, user.tenantId!, user.role, user.id, user.branchId);

      case 'UPDATE_ORDER_STATUS':
        return handleUpdateOrderStatus(action, user.tenantId!, user.role);

      case 'UPDATE_ITEM_STATUS':
        return handleUpdateItemStatus(action, user.tenantId!, user.role);

      case 'CLOSE_BILL':
        return handleCloseBill(action, user.tenantId!, user.role);

      default:
        return NextResponse.json({ error: 'نوع إجراء غير معروف' }, { status: 400 });
    }
  } catch (error) {
    console.error('[offline-sync] error:', error);
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 });
  }
}

async function handleCreateOrder(action: QueuedAction, tenantId: string, userRole: string, userId: string, userBranchId: string | null) {
  const {
    tableId, items, note,
    deliveryType, paymentMethod, pointsRedeemed, orderStatus,
    customerPhone, customerName, customerAddress, customerLat, customerLng,
  } = action.payload as {
    tableId?: string;
    items: Array<{
      menuItemId: string;
      quantity: number;
      notes?: string;
      // unitPrice is intentionally ignored — price is fetched from DB
      status?: string; // carried from the live order's final offline status
      modifiers?: Array<{ modifierOptionId: string }>;
    }>;
    note?: string;
    branchId?: string | null;
    deliveryType?: string;
    paymentMethod?: 'CASH' | 'CARD';
    pointsRedeemed?: number;
    orderStatus?: string;
    customerPhone?: string;
    customerName?: string;
    customerAddress?: string;
    customerLat?: number;
    customerLng?: number;
  };

  const VALID_STATUSES = ['PENDING', 'PREPARING', 'READY', 'SERVED', 'COMPLETED'];
  const safeOrderStatus = (orderStatus && VALID_STATUSES.includes(orderStatus)) ? orderStatus : 'PENDING';
  // Inventory is deducted at serve/complete. deductOrderStock() skips COMPLETED
  // orders, so create as SERVED first when the final state is COMPLETED, deduct,
  // then promote to COMPLETED.
  const needsStockDeduction = ['SERVED', 'COMPLETED'].includes(safeOrderStatus);
  const createStatus = safeOrderStatus === 'COMPLETED' ? 'SERVED' : safeOrderStatus;

  // Only order-taking roles can create orders
  if (!['ADMIN', 'MANAGER', 'CAPTAIN', 'CASHIER', 'WAITER'].includes(userRole)) {
    return NextResponse.json({ error: 'دورك لا يملك صلاحية إنشاء الطلبات' }, { status: 403 });
  }

  if (!items || items.length === 0) {
    return NextResponse.json({ error: 'لا توجد أصناف في الطلب' }, { status: 400 });
  }

  const isDelivery = deliveryType === 'delivery';
  const isAuthorizedCashier = ['ADMIN', 'MANAGER', 'CASHIER'].includes(userRole);

  // The shift cookie is long gone by sync time — resolve by cashierId.
  const activeShift = await prisma.cashierShift.findFirst({
    where: { cashierId: userId, tenantId, closedAt: null },
    orderBy: { openedAt: 'desc' },
    select: { id: true },
  });

  const order = await prisma.$transaction(async (tx) => {
    const settings = await tx.systemSetting.findFirst({ where: { tenantId } });
    const taxRate = settings?.taxRate || 0;
    const serviceFeePct = settings?.serviceFee || 0;

    let subtotal = 0;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orderItemsData: any[] = [];

    for (const item of items) {
      // VULN-06 fix: fetch price from DB — never trust client-supplied price
      const menuItem = await tx.menuItem.findFirst({
        where: { id: item.menuItemId, tenantId, isDeleted: false, isAvailable: true },
        include: {
          offers: {
            where: { isActive: true, startDate: { lte: new Date() }, endDate: { gte: new Date() } },
          },
        },
      });
      if (!menuItem) {
        throw new Error(`صنف غير موجود أو غير متاح: ${item.menuItemId}`);
      }

      // Apply the best active offer (same as online createOrder)
      let unitPrice = menuItem.price;
      if (menuItem.offers.length > 0) {
        const best = menuItem.offers.reduce((p, c) => (c.discountPct > p.discountPct ? c : p));
        unitPrice = unitPrice - (unitPrice * best.discountPct) / 100;
      }

      let modifierTotal = 0;
      const resolvedModifiers: Array<{ modifierOptionId: string; appliedPrice: number }> = [];
      if (item.modifiers && item.modifiers.length > 0) {
        const optionIds = item.modifiers.map((m) => m.modifierOptionId);
        const options = await tx.modifierOption.findMany({
          where: { id: { in: optionIds }, group: { tenantId } },
          select: { id: true, priceAdjustment: true },
        });
        for (const opt of options) {
          modifierTotal += opt.priceAdjustment;
          resolvedModifiers.push({ modifierOptionId: opt.id, appliedPrice: opt.priceAdjustment });
        }
      }

      unitPrice += modifierTotal;
      const lineTotal = unitPrice * item.quantity;
      subtotal += lineTotal;

      orderItemsData.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        notes: item.notes ?? null,
        unitPrice,
        totalPrice: lineTotal,
        status: (item.status && VALID_STATUSES.includes(item.status)) ? item.status : 'PENDING',
        modifiers: resolvedModifiers.length > 0 ? { create: resolvedModifiers } : undefined,
      });
    }

    const taxAmount = (subtotal * taxRate) / 100;
    const serviceAmount = (subtotal * serviceFeePct) / 100;
    const totalAmount = subtotal + taxAmount + serviceAmount - (pointsRedeemed || 0);

    const created = await tx.order.create({
      data: {
        tenantId,
        // Server-derived from the cashier's assigned branch — never trust the
        // client payload for branch attribution.
        branchId: userBranchId ?? null,
        tableId: tableId ?? null,
        status: createStatus as any,
        tax: taxAmount,
        serviceFee: serviceAmount,
        totalAmount,
        note: note ?? null,
        waiterId: userRole === 'CAPTAIN' ? userId : null,
        items: { create: orderItemsData },
      },
    });

    if (tableId) {
      await tx.table.update({ where: { id: tableId }, data: { status: 'OCCUPIED' } });
    } else if (isDelivery) {
      await tx.delivery.create({
        data: {
          orderId: created.id,
          customerName: customerName || 'زبون توصيل',
          customerPhone: customerPhone || '-',
          address: customerAddress || 'عنوان غير محدد',
          lat: customerLat,
          lng: customerLng,
          deliveryFee: 5000,
          status: 'PENDING',
        },
      });
    }

    // Record the payment + attribute to the cashier's shift (cashier/manager, non-delivery)
    if (isAuthorizedCashier && !isDelivery) {
      const pm = paymentMethod ?? 'CASH';
      await tx.bill.create({
        data: {
          orderId: created.id,
          tenantId,
          amount: totalAmount,
          paymentMethod: pm,
          paidAt: new Date(),
          shiftId: activeShift?.id ?? null,
        },
      });
      if (activeShift?.id) {
        await tx.cashierShift.update({
          where: { id: activeShift.id },
          data: {
            totalSales: { increment: totalAmount },
            totalCash: pm === 'CASH' ? { increment: totalAmount } : undefined,
            totalCard: pm === 'CARD' ? { increment: totalAmount } : undefined,
          },
        });
      }
    }

    return created;
  }, { timeout: 20000 });

  // Deduct inventory for served/completed offline orders — in a SEPARATE
  // transaction so insufficient stock never rolls back the (financial) order.
  if (needsStockDeduction) {
    try {
      await prisma.$transaction(async (tx) => {
        await deductOrderStock(tx, order.id);
        if (safeOrderStatus === 'COMPLETED') {
          await tx.order.update({ where: { id: order.id }, data: { status: 'COMPLETED' } });
        }
      }, { timeout: 20000 });
    } catch (err) {
      // Order is kept; inventory just wasn't deducted (e.g. stock ran out).
      console.error('[offline-sync] inventory deduction failed (order preserved):', err);
    }
  }

  // Notify kitchen + order screens so the synced order enters the normal flow
  // (kitchen → ready → waiter/captain → customer).
  await Promise.allSettled([
    triggerPusher(`tenant-${tenantId}-kitchen`, 'new-order', { orderId: order.id, timestamp: Date.now() }),
    triggerPusher(`tenant-${tenantId}-orders`, 'new-order', { orderId: order.id, timestamp: Date.now() }),
    ...(tableId
      ? [triggerPusher(`tenant-${tenantId}-orders`, 'table-status-changed', { tableId, status: 'OCCUPIED', timestamp: Date.now() })]
      : []),
  ]);

  return NextResponse.json({ orderId: order.id, synced: true }, { status: 201 });
}

async function handleUpdateOrderStatus(action: QueuedAction, tenantId: string, userRole: string) {
  // VULN-07 fix: restrict roles + validate status against allowlist
  if (!STATUS_UPDATE_ROLES.includes(userRole)) {
    return NextResponse.json({ error: 'دورك لا يملك صلاحية تحديث حالة الطلب' }, { status: 403 });
  }

  const { orderId, status } = action.payload as { orderId: string; status: string };

  if (!ALLOWED_ORDER_STATUSES.includes(status as OrderStatus)) {
    return NextResponse.json(
      { error: `حالة الطلب غير مسموح بها: ${status}` },
      { status: 400 },
    );
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    select: { id: true },
  });
  if (!order) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });

  await prisma.order.update({
    where: { id: orderId },
    data: { status: status as OrderStatus },
  });

  await Promise.allSettled([
    triggerPusher(`tenant-${tenantId}-kitchen`, 'order-updated', { orderId, status }),
    triggerPusher(`tenant-${tenantId}-orders`, 'order-updated', { orderId, status }),
  ]);

  return NextResponse.json({ synced: true });
}

async function handleUpdateItemStatus(action: QueuedAction, tenantId: string, userRole: string) {
  // VULN-07 fix: restrict roles + validate status against allowlist
  if (!STATUS_UPDATE_ROLES.includes(userRole)) {
    return NextResponse.json({ error: 'دورك لا يملك صلاحية تحديث حالة الصنف' }, { status: 403 });
  }

  const { orderId, itemId, status } = action.payload as {
    orderId: string;
    itemId: string;
    status: string;
  };

  if (!ALLOWED_ITEM_STATUSES.includes(status as OrderStatus)) {
    return NextResponse.json(
      { error: `حالة الصنف غير مسموح بها: ${status}` },
      { status: 400 },
    );
  }

  const item = await prisma.orderItem.findFirst({
    where: { id: itemId, order: { tenantId } },
    select: { id: true },
  });
  if (!item) return NextResponse.json({ error: 'الصنف غير موجود' }, { status: 404 });

  await prisma.orderItem.update({
    where: { id: itemId },
    data: { status: status as OrderStatus },
  });

  await Promise.allSettled([
    triggerPusher(`tenant-${tenantId}-kitchen`, 'item-updated', { orderId, itemId, status }),
  ]);

  return NextResponse.json({ synced: true });
}

async function handleCloseBill(action: QueuedAction, tenantId: string, userRole: string) {
  // Only cashier/admin can close bills
  if (!['ADMIN', 'MANAGER', 'CASHIER'].includes(userRole)) {
    return NextResponse.json({ error: 'دورك لا يملك صلاحية إغلاق الفواتير' }, { status: 403 });
  }

  const { orderId } = action.payload as { orderId: string; paymentMethod: string };

  const order = await prisma.order.findFirst({
    where: { id: orderId, tenantId },
    select: { id: true, totalAmount: true },
  });
  if (!order) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 });

  await prisma.order.update({
    where: { id: orderId },
    data: { status: 'COMPLETED' },
  });

  return NextResponse.json({ synced: true });
}
