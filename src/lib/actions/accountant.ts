'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { unstable_noStore as noStore } from 'next/cache';

// Fetch all COMPLETED orders where the bill is NOT settled and was paid by CASH (or any method handled by Cashier)
// We assume 'CASH' payments are held by Cashier.
// Online/Card defaults to bank, but let's assume Cashier handles Cash.
export async function getUnsettledCashierBills() {
    noStore();
    try {
        console.log("Fetching unsettled cashier bills...");
        const bills = await prisma.bill.findMany({
            where: {
                isSettled: false,
                paymentMethod: 'CASH', // Only Cash needs physical handover
                order: {
                    status: { in: ['COMPLETED', 'SERVED'] },
                    // Exclude delivery orders
                    delivery: null
                }
            },
            include: {
                order: {
                    include: {
                        waiter: true,
                        table: true
                    }
                }
            },
            orderBy: { paidAt: 'desc' }
        });
        console.log(`Found ${bills.length} unsettled cashier bills.`);
        return bills;
    } catch (error) {
        console.error("Failed to fetch cashier bills", error);
        return [];
    }
}

// Fetch all Delivery orders where the Driver has handed over cash (isCashHandedOver = true)
// but it hasn't been settled with Accountant yet (bill.isSettled = false)
export async function getUnsettledDeliveryBills() {
    noStore();
    try {
        console.log("Fetching unsettled delivery bills...");
        const bills = await prisma.bill.findMany({
            where: {
                isSettled: false,
                paymentMethod: 'CASH',
                order: {
                    delivery: {
                        isCashHandedOver: true // Money is with Delivery Manager
                    }
                }
            },
            include: {
                order: {
                    include: {
                        delivery: {
                            include: {
                                driver: true
                            }
                        }
                    }
                }
            },
            orderBy: { paidAt: 'desc' }
        });
        console.log(`Found ${bills.length} unsettled delivery bills.`);
        return bills;
    } catch (error) {
        console.error("Failed to fetch delivery bills", error);
        return [];
    }
}


export async function settleBills(billIds: string[]) {
    try {
        await prisma.bill.updateMany({
            where: {
                id: { in: billIds }
            },
            data: {
                isSettled: true,
                settledAt: new Date(),
                // collectedById: userId // ToDo: Add current user context
            }
        });
        revalidatePath('/accountant');
        return { success: true };
    } catch (error) {
        console.error("Failed to settle bills", error);
        return { error: "Failed to settle bills" };
    }
}

export async function getSettledCashierBills() {
    noStore();
    try {
        const bills = await prisma.bill.findMany({
            where: {
                isSettled: true,
                paymentMethod: 'CASH',
                order: {
                    status: { in: ['COMPLETED', 'SERVED'] },
                    delivery: null
                }
            },
            include: {
                order: {
                    include: {
                        waiter: true,
                        table: true
                    }
                }
            },
            orderBy: { settledAt: 'desc' },
            take: 100 // Limit to last 100 records for performance
        });
        return bills;
    } catch (error) {
        console.error("Failed to fetch settled cashier bills", error);
        return [];
    }
}

export async function getSettledDeliveryBills() {
    noStore();
    try {
        const bills = await prisma.bill.findMany({
            where: {
                isSettled: true,
                paymentMethod: 'CASH',
                order: {
                    delivery: {
                        isCashHandedOver: true
                    }
                }
            },
            include: {
                order: {
                    include: {
                        delivery: {
                            include: {
                                driver: true
                            }
                        }
                    }
                }
            },
            orderBy: { settledAt: 'desc' },
            take: 100 // Limit
        });
        return bills;
    } catch (error) {
        console.error("Failed to fetch settled delivery bills", error);
        return [];
    }
}
