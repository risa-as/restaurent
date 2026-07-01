'use server';
/* eslint-disable @typescript-eslint/no-unused-vars */

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { CreateOrderInput } from '@/lib/validations/pos';
import { DeliveryInput } from '@/lib/validations/delivery';
import { DeliveryStatus } from '@prisma/client';
import { verifyRole, getCurrentUser } from '@/lib/auth-guard';
import { triggerPusher } from '@/lib/pusher';
import { generateTrackingToken, sendTrackingNotification } from '@/lib/delivery-tracking';
import { checkPlanModule } from '@/lib/plan-limits';
import { getBranchFilter, getActiveBranchId, getOperationalBranchWhere } from '@/lib/utils/branch-filter';
import { getActiveSeasonalMenu } from '@/lib/actions/seasonal-menus';

export async function createDeliveryOrder(orderData: CreateOrderInput, deliveryData: DeliveryInput) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'CASHIER', 'DELIVERY_MANAGER']);
    if (tenantId) await checkPlanModule(tenantId, 'delivery');
    const { items, note } = orderData;
    const { customerName, customerPhone, address, deliveryFee, lat, lng } = deliveryData;
    const branchId = tenantId ? await getActiveBranchId(tenantId) : null;

    // Check seasonal operating hours
    if (tenantId) {
        const seasonalMenu = await getActiveSeasonalMenu(branchId);
        if (seasonalMenu && seasonalMenu.hours.length > 0) {
            const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Baghdad' }));
            const dayOfWeek = now.getDay();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();

            const todayHours = (seasonalMenu.hours as { dayOfWeek: number | null; openTime: string; closeTime: string }[])
                .find(h => h.dayOfWeek === null || h.dayOfWeek === dayOfWeek);

            if (todayHours) {
                const [openH, openM] = todayHours.openTime.split(':').map(Number);
                const [closeH, closeM] = todayHours.closeTime.split(':').map(Number);
                const openMinutes = openH * 60 + openM;
                const closeMinutes = closeH * 60 + closeM;
                if (currentMinutes < openMinutes || currentMinutes > closeMinutes) {
                    throw new Error(`الطلبات متاحة من ${todayHours.openTime} حتى ${todayHours.closeTime} خلال هذه الفترة الموسمية`);
                }
            }
        }
    }

    try {
        await prisma.$transaction(async (tx) => {
            let totalAmount = 0;
            const orderItemsData = [];


            for (const item of items) {
                const menuItem = await tx.menuItem.findUnique({
                    where: { id: item.menuItemId },
                    include: {
                        offers: {
                            where: {
                                isActive: true,
                                startDate: { lte: new Date() },
                                endDate: { gte: new Date() }
                            }
                        }
                    }
                });

                if (!menuItem) throw new Error(`Item ${item.menuItemId} not found`);

                let unitPrice = menuItem.price;
                if (menuItem.offers.length > 0) {
                    const bestOffer = menuItem.offers.reduce((prev, curr) => (curr.discountPct > prev.discountPct ? curr : prev));
                    unitPrice = unitPrice * (1 - bestOffer.discountPct / 100);
                }

                orderItemsData.push({
                    menuItemId: item.menuItemId,
                    quantity: item.quantity,
                    unitPrice,
                    totalPrice: unitPrice * item.quantity,
                    notes: item.notes
                });
                totalAmount += unitPrice * item.quantity;
            }

            const order = await tx.order.create({
                data: {
                    status: 'PENDING',
                    totalAmount: totalAmount + deliveryFee,
                    note: `DELIVERY: ${note || ''}`,
                    ...(tenantId ? { tenantId } : {}),
                    ...(branchId ? { branchId } : {}),
                    items: { create: orderItemsData }
                }
            });

            await tx.delivery.create({
                data: {
                    orderId: order.id,
                    customerName,
                    customerPhone,
                    address,
                    deliveryFee,
                    status: 'PENDING',
                    lat: lat ?? null,
                    lng: lng ?? null,
                }
            });
        });

        // ── حفظ/تحديث بيانات العميل خارج الـ transaction (غير حرجة) ────────
        if (tenantId && customerPhone) {
            prisma.customer.upsert({
                where: { tenantId_phone: { tenantId, phone: customerPhone } },
                update: {
                    name: customerName,
                    address: address || undefined,
                    lastVisitAt: new Date(),
                },
                create: {
                    tenantId,
                    name: customerName,
                    phone: customerPhone,
                    address: address || null,
                    lastVisitAt: new Date(),
                },
            }).catch(err => console.warn('[customer upsert non-fatal]', err));
        }

        revalidatePath('/dashboard/delivery');
        revalidatePath('/dashboard/orders');
        revalidatePath('/dashboard/kitchen');
        revalidatePath('/dashboard/customers');
        return { success: true };

    } catch (error: any) {
        if (error?.upgradeRequired) return { error: error.message, upgradeRequired: true };
        console.error("Failed to create delivery", error);
        return { error: "Failed to create delivery order" };
    }
}


export async function getDeliveryOrders() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];
        const branchWhere = await getOperationalBranchWhere(tenantId);
        return await prisma.delivery.findMany({
            where: {
                status: { notIn: ['DELIVERED', 'CANCELLED', 'RETURNED'] },
                order: {
                    tenantId,
                    ...branchWhere,
                    status: { notIn: ['COMPLETED', 'CANCELLED'] },
                },
            },
            include: {
                order: { include: { items: { include: { menuItem: true } } } },
                driver: true,
            },
            orderBy: { order: { createdAt: 'asc' } }
        });
    } catch (error) {
        return [];
    }
}

export async function getDrivers() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];
        const branchWhere = await getOperationalBranchWhere(tenantId);
        return await prisma.user.findMany({
            where: {
                role: 'DRIVER',
                tenantId,
                ...branchWhere,
            }
        });
    } catch (error) {
        return [];
    }
}

export async function assignDriver(deliveryId: string, driverId: string) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'DELIVERY_MANAGER']);
    try {
        const delivery = await prisma.delivery.findFirst({
            where: { id: deliveryId, ...(tenantId ? { order: { tenantId } } : {}) },
            include: {
                order: {
                    select: { status: true, orderNumber: true }
                }
            }
        });
        if (!delivery) return { error: "Delivery not found or access denied" };

        if (delivery.order.status !== 'READY') {
            return { error: "لا يمكن تعيين سائق — الطلب لم يكتمل تحضيره في المطبخ بعد" };
        }

        await prisma.delivery.update({
            where: { id: deliveryId },
            data: { driverId, status: 'ASSIGNED' }
        });

        // Generate tracking token and notify customer
        try {
            const rawToken = await generateTrackingToken(deliveryId);
            await sendTrackingNotification(
                { id: deliveryId, order: delivery.order, customerPhone: delivery.customerPhone },
                rawToken
            );
        } catch (trackingErr) {
            console.error('Tracking token/notification error (non-fatal):', trackingErr);
        }

        revalidatePath('/delivery');
        revalidatePath('/dashboard/delivery');
        return { success: true };
    } catch (error) {
        return { error: "Failed to assign driver" };
    }
}

export async function updateDeliveryStatus(deliveryId: string, status: DeliveryStatus) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'DELIVERY_MANAGER', 'DRIVER']);

    try {
        const delivery = await prisma.delivery.findFirst({
            where: { id: deliveryId, ...(tenantId ? { order: { tenantId } } : {}) },
            include: { order: { select: { status: true } } }
        });
        if (!delivery) return { error: "Delivery not found or access denied" };

        // Driver cannot start delivery until kitchen has marked the order as READY
        if (status === 'ON_THE_WAY' && delivery.order.status !== 'READY') {
            return { error: "لا يمكن بدء التوصيل — الطلب لم يكتمل تحضيره في المطبخ بعد" };
        }

        await prisma.delivery.update({
            where: { id: deliveryId },
            data: { status }
        });

        if (status === 'DELIVERED' || status === 'CANCELLED' || status === 'RETURNED') {
            await triggerPusher(`delivery-${deliveryId}`, 'tracking-ended', { reason: status });
        }

        revalidatePath('/dashboard/delivery');
        revalidatePath('/delivery');
        return { success: true };
    } catch (error) {
        return { error: "Failed to update status" };
    }
}

export async function getAllDeliveryOrders(driverId?: string) {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];
        const branchId = await getActiveBranchId(tenantId);
        const where = {
            status: { in: ['DELIVERED', 'CANCELLED', 'RETURNED'] as DeliveryStatus[] },
            ...(driverId ? { driverId } : {}),
            order: { tenantId, ...(branchId ? { branchId } : {}) },
        };
        return await prisma.delivery.findMany({
            where,
            include: {
                order: {
                    include: { items: { include: { menuItem: true } } }
                },
                driver: true
            },
            orderBy: { order: { createdAt: 'desc' } }
        });
    } catch (error) {
        return [];
    }
}

export async function getUnpaidDeliveryOrders() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];
        const branchId = await getActiveBranchId(tenantId);
        return await prisma.delivery.findMany({
            where: {
                status: 'DELIVERED',
                isCashHandedOver: false,
                order: { tenantId, ...(branchId ? { branchId } : {}) },
            },
            include: {
                order: {
                    include: { items: { include: { menuItem: true } } }
                },
                driver: true
            },
            orderBy: { order: { updatedAt: 'desc' } }
        });
    } catch (error) {
        console.error("Failed to get unpaid delivery orders", error);
        return [];
    }
}

export async function markDeliveriesAsHandedOver(deliveryIds: string[]) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'DELIVERY_MANAGER', 'ACCOUNTANT']);
    try {
        // جلب إعدادات الولاء مرة واحدة خارج الـ transaction
        const tenant = tenantId ? await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { loyaltyEnabled: true, loyaltyPointsPerThousand: true }
        }) : null;

        await prisma.$transaction(async (tx) => {
            const deliveries = await tx.delivery.findMany({
                where: {
                    id: { in: deliveryIds },
                    ...(tenantId ? { order: { tenantId } } : {}),
                },
                include: { order: { include: { items: { include: { menuItem: true } } } } }
            });

            for (const delivery of deliveries) {
                await tx.delivery.update({
                    where: { id: delivery.id },
                    data: { isCashHandedOver: true, handedOverAt: new Date() }
                });

                // ── خصم المخزون (FIFO) — non-fatal so payment always records ─
                try {
                    const { deductOrderStock } = await import('@/lib/actions/order-completion');
                    await deductOrderStock(tx, delivery.orderId);
                } catch (stockErr) {
                    console.warn('[delivery handover] stock deduction skipped:', stockErr);
                }

                // ── إكمال الطلب ──────────────────────────────────────────────
                await tx.order.update({
                    where: { id: delivery.orderId },
                    data: { status: 'COMPLETED' }
                });

                // ── إنشاء الفاتورة إن لم تكن موجودة ────────────────────────
                const existingBill = await tx.bill.findFirst({
                    where: { orderId: delivery.orderId }
                });
                if (!existingBill) {
                    await tx.bill.create({
                        data: {
                            orderId: delivery.orderId,
                            amount: delivery.order.totalAmount,
                            paymentMethod: 'CASH',
                            paidAt: new Date(),
                            ...(delivery.order.tenantId ? { tenantId: delivery.order.tenantId } : {}),
                        }
                    });
                }

                // ── نقاط الولاء ─────────────────────────────────────────────
                if (tenant?.loyaltyEnabled && tenantId && delivery.customerPhone) {
                    // ابحث عن العميل بالهاتف أو أنشئه
                    let customer = await tx.customer.findUnique({
                        where: { tenantId_phone: { tenantId, phone: delivery.customerPhone } }
                    });
                    if (!customer) {
                        customer = await tx.customer.create({
                            data: {
                                tenantId,
                                phone: delivery.customerPhone,
                                name: delivery.customerName,
                                lastVisitAt: new Date(),
                            }
                        });
                    }

                    const rate = tenant.loyaltyPointsPerThousand ?? 1;
                    const pointsEarned = Math.floor((delivery.order.totalAmount / 1000) * rate);

                    await tx.customer.update({
                        where: { id: customer.id },
                        data: {
                            totalPoints: { increment: pointsEarned },
                            totalSpent: { increment: delivery.order.totalAmount },
                            lastVisitAt: new Date(),
                        }
                    });

                    // اربط الطلب بالعميل إن لم يكن مرتبطاً
                    if (!delivery.order.customerId) {
                        await tx.order.update({
                            where: { id: delivery.orderId },
                            data: { customerId: customer.id }
                        });
                    }
                }
            }
        }, { timeout: 30000 });

        revalidatePath('/dashboard/delivery');
        revalidatePath('/dashboard/orders');
        revalidatePath('/dashboard/customers');
        revalidatePath('/inventory/stock');
        revalidatePath('/dashboard/accountant/delivery');
        return { success: true };
    } catch (error) {
        console.error("Failed to mark deliveries as handed over", error);
        return { error: "Failed to update status" };
    }
}

export async function getDriverPerformance(from: Date, to: Date) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'ACCOUNTANT', 'DELIVERY_MANAGER']);

    const branchId = await getActiveBranchId(tenantId);
    const branchWhere = branchId ? { branchId } : {};

    // Collect IDs of drivers assigned to the active branch so cross-branch drivers are excluded
    const branchDriverIds = branchId
        ? (await prisma.user.findMany({
              where: { role: 'DRIVER', tenantId, branchId },
              select: { id: true },
          })).map(d => d.id)
        : null;

    const deliveries = await prisma.delivery.findMany({
        where: {
            order: { tenantId, ...branchWhere, createdAt: { gte: from, lte: to } },
            ...(branchDriverIds ? { driverId: { in: branchDriverIds } } : {}),
        },
        include: {
            driver: { select: { id: true, name: true, email: true } },
            order: { select: { createdAt: true, status: true, totalAmount: true } },
        },
    });

    type DriverAgg = {
        driverId: string; driverName: string;
        total: number; delivered: number; pending: number; returned: number;
        totalDeliveryFee: number; totalOrderValue: number;
        deliveryTimes: number[];
    };

    const map = new Map<string, DriverAgg>();

    for (const d of deliveries) {
        const key = d.driverId ?? 'unassigned';
        const cur = map.get(key) ?? {
            driverId: key,
            driverName: d.driver?.name ?? d.driver?.email ?? 'غير مسند',
            total: 0, delivered: 0, pending: 0, returned: 0,
            totalDeliveryFee: 0, totalOrderValue: 0,
            deliveryTimes: [],
        };
        cur.total += 1;
        if (d.status === 'DELIVERED') cur.delivered += 1;
        else if (d.status === 'RETURNED') cur.returned += 1;
        else cur.pending += 1;
        cur.totalDeliveryFee += d.deliveryFee;
        cur.totalOrderValue += d.order.totalAmount;
        if (d.handedOverAt && d.order.createdAt) {
            const mins = Math.round((d.handedOverAt.getTime() - d.order.createdAt.getTime()) / 60000);
            if (mins > 0 && mins < 300) cur.deliveryTimes.push(mins);
        }
        map.set(key, cur);
    }

    return Array.from(map.values()).map(d => ({
        driverId: d.driverId,
        driverName: d.driverName,
        total: d.total,
        delivered: d.delivered,
        pending: d.pending,
        returned: d.returned,
        successRate: d.total > 0 ? Math.round((d.delivered / d.total) * 100) : 0,
        totalDeliveryFee: Math.round(d.totalDeliveryFee),
        totalOrderValue: Math.round(d.totalOrderValue),
        avgDeliveryMinutes: d.deliveryTimes.length > 0
            ? Math.round(d.deliveryTimes.reduce((a, b) => a + b, 0) / d.deliveryTimes.length)
            : null,
    })).sort((a, b) => b.delivered - a.delivered);
}
export type DriverPerformanceRow = Awaited<ReturnType<typeof getDriverPerformance>>[number];
