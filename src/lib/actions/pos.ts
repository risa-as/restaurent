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

export async function createOrder(data: CreateOrderInput) {
    const validated = createOrderSchema.safeParse(data);
    if (!validated.success) return { error: "Invalid order data" };

    const { tableId, items, note } = validated.data;

    try {
        await prisma.$transaction(async (tx) => {
            // 1. Fetch settings and menu items
            const settings = await tx.systemSetting.findFirst();
            const taxRate = settings?.taxRate || 0;
            const serviceFeePct = settings?.serviceFee || 0; // Assuming percentage, user prompt said "serviceFee" in schema is Float, likely rate or fixed? 
            // Schema: serviceFee Float @default(0). Logic in pos.ts usually treats it as percentage or fixed?
            // User requirement: "Apply Tax/Service Fees".
            // Let's assume standard logic: Tax is %, Service is % usually.
            // Wait, schema says "serviceFee" in SystemSetting. In Order model it has "serviceFee Float".
            // Let's treat them as percentages in settings, and amounts in Order.

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

                // Cost Logic (Snapshot)
                let itemCost = 0;
                if (menuItem.recipe && menuItem.recipe.length > 0) {
                    // Sum of (qty * material_cost)
                    itemCost = menuItem.recipe.reduce((acc, r) => {
                        return acc + (r.quantity * (r.material.costPerUnit || 0));
                    }, 0);
                    // This is cost per UNIT of menu item.
                    // Total cost for this line item = itemCost * item.quantity
                    // But we store unit cost or total cost? 
                    // Validator check: Schema says `cost Float`. Usually meaningful to store TOTAL cost of this line item or UNIT cost? 
                    // OrderItem has `unitPrice` and `totalPrice`.
                    // Let's store `cost` as total cost for this line item (to match totalPrice) OR unit cost?
                    // "cost Float @default(0) // Cost of ingredients at time of order" in the plan.
                    // To be consistent with `totalPrice` (which is unitPrice * quantity), it implies `cost` might be total.
                    // However, `cost` on OrderItem usually implies unit cost in some systems, but total in others.
                    // Let's store TOTAL cost of this line item to simplify summation later. 
                    // Wait, if I delete item, does cost disappear? Yes.
                    // Let's store TOTAL cost: itemCost * item.quantity.
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
            // Tax and Service Fee are usually on Subtotal.
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

            // 3. Update Table Status if needed
            if (tableId) {
                await tx.table.update({
                    where: { id: tableId },
                    data: { status: 'OCCUPIED' }
                });
            } else {
                // If no tableId, it's a Takeaway/Delivery order
                const isDelivery = validated.data.deliveryType === 'delivery';

                await tx.delivery.create({
                    data: {
                        orderId: order.id,
                        customerName: isDelivery ? "زبون توصيل" : "زبون سفري",
                        customerPhone: validated.data.customerPhone || "-",
                        address: isDelivery ? (validated.data.customerAddress || "عنوان غير محدد") : "استلام من المطعم",
                        deliveryFee: isDelivery ? 5000 : 0,
                        status: 'PENDING'
                    }
                });
            }
        });

        revalidatePath('/dashboard/pos');
        revalidatePath('/dashboard/tables');
        revalidatePath('/dashboard/orders');
        return { success: true };

    } catch (error) {
        console.error("Failed to create order", error);
        return { error: "Failed to create order" };
    }
}
