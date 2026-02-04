'use server';
/* eslint-disable @typescript-eslint/no-unused-vars */

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { CreateOrderInput } from '@/lib/validations/pos';
import { DeliveryInput } from '@/lib/validations/delivery';
import { completeOrderTransaction } from './order-completion';

export async function createDeliveryOrder(orderData: CreateOrderInput, deliveryData: DeliveryInput) {
    // Re-use logic from createOrder but wrap for delivery
    // Duplicating logic is bad, but for MVP speed, I'll inline the transaction logic or refactor createOrder.
    // Better: modify createOrder to accept optional Delivery data? 
    // Or just write a fresh function since it's a distinct flow.
    const { items, note } = orderData;
    const { customerName, customerPhone, address, deliveryFee } = deliveryData;

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Calculate totals
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

            // 2. Create Order
            const order = await tx.order.create({
                data: {
                    status: 'PENDING',
                    totalAmount: totalAmount + deliveryFee, // Include fee in order total? usually yes.
                    note: `DELIVERY: ${note || ''}`,
                    items: { create: orderItemsData }
                }
            });

            // 3. Create Delivery
            await tx.delivery.create({
                data: {
                    orderId: order.id,
                    customerName,
                    customerPhone,
                    address,
                    deliveryFee,
                    status: 'PENDING'
                }
            });
        });

        revalidatePath('/dashboard/delivery');
        revalidatePath('/dashboard/orders');
        revalidatePath('/dashboard/kitchen');
        return { success: true };

    } catch (error) {
        console.error("Failed to create delivery", error);
        return { error: "Failed to create delivery order" };
    }
}

export async function getDeliveryOrders() {
    try {
        return await prisma.delivery.findMany({
            include: {
                order: {
                    include: { items: { include: { menuItem: true } } }
                },
                driver: true
            },
            orderBy: { order: { createdAt: 'asc' } } // Oldest first
        });
    } catch (error) {
        return [];
    }
}

export async function getDrivers() {
    try {
        return await prisma.user.findMany({
            where: { role: 'DRIVER' }
        });
    } catch (error) {
        return [];
    }
}

export async function assignDriver(deliveryId: string, driverId: string) {
    try {
        await prisma.delivery.update({
            where: { id: deliveryId },
            data: {
                driverId,
                status: 'ASSIGNED'
            }
        });
        revalidatePath('/dashboard/delivery');
        return { success: true };
    } catch (error) {
        return { error: "Failed to assign driver" };
    }
}

export async function updateDeliveryStatus(deliveryId: string, status: string) {
    try {
        await prisma.delivery.update({
            where: { id: deliveryId },
            data: { status }
        });

        // If delivered, mark order completed and handle inventory/finance
        // If delivered, mark order completed and handle inventory/finance
        /* REMOVED: Autocomplete on delivery. Now handled by Finance Handover.
        if (status === 'DELIVERED') {
            const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } });
            if (delivery) {
                await prisma.$transaction(async (tx) => {
                    await completeOrderTransaction(tx, delivery.orderId);
                });
            }
        }
        */

        revalidatePath('/dashboard/delivery');
        return { success: true };
    } catch (error) {
        return { error: "Failed to update status" };
    }
}

export async function getAllDeliveryOrders(driverId?: string) {
    try {
        const where = driverId ? { driverId, status: 'DELIVERED' } : { status: 'DELIVERED' };
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
        return await prisma.delivery.findMany({
            where: {
                status: 'DELIVERED',
                isCashHandedOver: false
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
    try {
        await prisma.$transaction(async (tx) => {
            const deliveries = await tx.delivery.findMany({
                where: { id: { in: deliveryIds } },
                include: { order: true }
            });

            for (const delivery of deliveries) {
                // 1. Update Delivery
                await tx.delivery.update({
                    where: { id: delivery.id },
                    data: {
                        isCashHandedOver: true,
                        handedOverAt: new Date()
                    }
                });

                // 2. Update Order Status
                await tx.order.update({
                    where: { id: delivery.orderId },
                    data: { status: 'COMPLETED' }
                });

                // 3. Create Bill if not exists
                const existingBill = await tx.bill.findFirst({
                    where: { orderId: delivery.orderId }
                });

                if (!existingBill) {
                    await tx.bill.create({
                        data: {
                            orderId: delivery.orderId,
                            amount: delivery.order.totalAmount, // Assuming totalAmount includes delivery fee logic handling in POS
                            paymentMethod: 'CASH',
                            paidAt: new Date()
                        }
                    });
                }
            }
        });

        revalidatePath('/dashboard/delivery');
        revalidatePath('/dashboard/orders');
        return { success: true };
    } catch (error) {
        console.error("Failed to mark deliveries as handed over", error);
        return { error: "Failed to update status" };
    }
}
