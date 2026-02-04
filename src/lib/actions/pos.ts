'use server';
/* eslint-disable @typescript-eslint/no-unused-vars */

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { createOrderSchema, CreateOrderInput } from '@/lib/validations/pos';

export async function getPOSData() {
    try {
        const [categories, menuItems, tables] = await Promise.all([
            prisma.category.findMany({
                orderBy: { name: 'asc' },
            }),
            prisma.menuItem.findMany({
                where: { isAvailable: true },
                include: {
                    category: true,
                    offers: {
                        where: {
                            isActive: true,
                            startDate: { lte: new Date() },
                            endDate: { gte: new Date() }
                        }
                    }
                },
                orderBy: { name: 'asc' },
            }),
            prisma.table.findMany({
                orderBy: { number: 'asc' }
            })
        ]);

        // Compute effective price if offer exists?
        // For now, let's just return raw data. The UI can display badges.
        // Actually, handling offers logic in backend for creating order is crucial.

        return { categories, menuItems, tables };
    } catch (error) {
        console.error("Failed to load POS data", error);
        return { categories: [], menuItems: [], tables: [] };
    }
}

export async function getPendingCaptainOrders() {
    try {
        return await prisma.order.findMany({
            where: {
                status: 'PENDING',
                // Maybe filter by createdBy role if we tracked that, but PENDING is enough for now.
                // Assuming Captain creates PENDING orders.
            },
            include: {
                table: true,
                items: {
                    include: {
                        menuItem: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    } catch (error) {
        console.error("Failed to fetch pending orders", error);
        return [];
    }
}

import { auth } from '@/lib/auth';

export async function createOrder(data: CreateOrderInput) {
    const session = await auth();
    const userRole = session?.user?.role;

    const validated = createOrderSchema.safeParse(data);
    if (!validated.success) return { error: "Invalid order data" };

    const { tableId, items, note } = validated.data;

    try {
        let newOrderId = "";

        await prisma.$transaction(async (tx) => {
            // 1. Fetch settings and menu items
            const settings = await tx.systemSetting.findFirst();
            const taxRate = settings?.taxRate || 0;
            const serviceFeePct = settings?.serviceFee || 0;

            const menuItems = await tx.menuItem.findMany({
                where: {
                    id: { in: items.map(i => i.menuItemId) }
                },
                include: {
                    offers: {
                        where: {
                            isActive: true,
                            startDate: { lte: new Date() },
                            endDate: { gte: new Date() }
                        }
                    },
                    recipe: {
                        include: {
                            material: true
                        }
                    }
                }
            });

            const menuItemMap = new Map(menuItems.map(item => [item.id, item]));
            let subtotal = 0;
            const orderItemsData = [];

            for (const item of items) {
                const menuItem = menuItemMap.get(item.menuItemId);

                if (!menuItem) throw new Error(`Item ${item.menuItemId} not found`);

                // Price Logic
                let unitPrice = menuItem.price;
                let discount = 0;

                if (menuItem.offers.length > 0) {
                    const bestOffer = menuItem.offers.reduce((prev, curr) => {
                        return (curr.discountPct > prev.discountPct) ? curr : prev;
                    });

                    discount = (unitPrice * bestOffer.discountPct) / 100;
                    unitPrice = unitPrice - discount;
                }

                const totalPrice = unitPrice * item.quantity;
                subtotal += totalPrice;

                // Cost Logic
                let itemCost = 0;
                if (menuItem.recipe && menuItem.recipe.length > 0) {
                    itemCost = menuItem.recipe.reduce((acc, r) => {
                        return acc + (r.quantity * (r.material.costPerUnit || 0));
                    }, 0);
                    itemCost = itemCost * item.quantity;
                }

                orderItemsData.push({
                    menuItemId: item.menuItemId,
                    quantity: item.quantity,
                    unitPrice: unitPrice,
                    totalPrice: totalPrice,
                    notes: item.notes,
                    cost: itemCost
                });
            }

            // Calculate Totals
            const taxAmount = (subtotal * taxRate) / 100;
            const serviceAmount = (subtotal * serviceFeePct) / 100;
            const totalAmount = subtotal + taxAmount + serviceAmount;

            // 2. Create Order
            const order = await tx.order.create({
                data: {
                    tableId: tableId || null,
                    status: 'PENDING',
                    totalAmount,
                    tax: taxAmount,
                    serviceFee: serviceAmount,
                    note,
                    items: {
                        create: orderItemsData
                    }
                }
            });
            newOrderId = order.id;

            // 3. Update Table Status if needed
            if (tableId) {
                await tx.table.update({
                    where: { id: tableId },
                    data: { status: 'OCCUPIED' }
                });
            } else {
                // If no tableId, it's a Takeaway/Delivery order
                const isDelivery = validated.data.deliveryType === 'delivery';

                if (isDelivery) {
                    await tx.delivery.create({
                        data: {
                            orderId: order.id,
                            customerName: validated.data.customerName || "زبون توصيل",
                            customerPhone: validated.data.customerPhone || "-",
                            address: validated.data.customerAddress || "عنوان غير محدد",
                            deliveryFee: 5000,
                            status: 'PENDING'
                        }
                    });
                }
            }

            // 4. Auto-Payment for Cashier/Manager (Takeaway/Hall)
            const isDelivery = validated.data.deliveryType === 'delivery';
            const isAuthorized = userRole === 'CASHIER' || userRole === 'MANAGER' || userRole === 'ADMIN';

            if (isAuthorized && !isDelivery) {
                await tx.bill.create({
                    data: {
                        orderId: order.id,
                        amount: totalAmount,
                        paymentMethod: 'CASH',
                        paidAt: new Date()
                    }
                });

                // Update order to SERVED status (Waiting for Payment -> Done?) 
                // Previous requirement: "If made from Captain... needs confirmation".
                // "When order made from this page... consider paid".
                // If it's paid, it should probably show as SERVED or COMPLETED in Cashier list?
                // Cashier List shows READY/SERVED.
                // If I mark it COMPLETED locally in CashierView via handlePayment, it disappears from list.
                // But here I am creating it.
                // If I create it and it is PAID, I should probably set status to SERVED immediately?
                // Or leave it PENDING so Kitchen sees it?
                // Kitchen needs to see it. So status PENDING.
                // Cashier will see it when Kitchen finishes (READY).
                // Then Cashier can "Confirm Payment" (which is already done?).
                // If Bill exists, maybe we don't need to pay again?
                // ReadyOrdersList check: If order has bills, show "Paid"?
                // "handlePayment" marks it COMPLETED.
                // If it is already paid, standard flow might be confusing.
                // But for now, user just asked to "Consider it paid".
                // I will add a note or assume the Bill record is the source of truth.
            }
        }, {
            timeout: 20000
        });

        revalidatePath('/dashboard/pos');
        revalidatePath('/dashboard/tables');
        revalidatePath('/dashboard/orders');
        return { success: true, orderId: newOrderId };

    } catch (error) {
        console.error("Failed to create order", error);
        return { error: "Failed to create order" };
    }
}
