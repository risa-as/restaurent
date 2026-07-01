'use server';
/* eslint-disable @typescript-eslint/no-unused-vars */

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { reservationSchema, ReservationFormValues } from '@/lib/validations/reservations';
import { ReservationStatus } from '@prisma/client';
import { verifyRole, getCurrentUser } from '@/lib/auth-guard';
import { getActiveBranchId, resolveCreateBranchId } from '@/lib/utils/branch-filter';
import { checkPlanModule } from '@/lib/plan-limits';

export async function getReservations() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;

        // Show from today midnight onwards (today + future reservations)
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const branchId = tenantId ? await getActiveBranchId(tenantId) : null;

        const reservations = await prisma.reservation.findMany({
            where: {
                reservationTime: { gte: todayStart },
                ...(tenantId ? { tenantId } : {}),
                ...(branchId ? { branchId } : {}),
            },
            include: { tables: true },
            orderBy: { reservationTime: 'asc' },
        });

        return reservations;
    } catch (error) {
        console.error("Failed to fetch reservations", error);
        return [];
    }
}

export async function createReservation(data: ReservationFormValues) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'CAPTAIN', 'WAITER']);
    await checkPlanModule(tenantId, 'reservations');
    const validated = reservationSchema.safeParse(data);
    if (!validated.success) return { error: "Invalid fields" };

    try {
        const { tableIds, ...rest } = validated.data;
        const branchId = await getActiveBranchId(tenantId);

        await prisma.reservation.create({
            data: {
                ...rest,
                status: ReservationStatus.CONFIRMED,
                ...(tenantId ? { tenantId } : {}),
                branchId: await resolveCreateBranchId(tenantId, branchId),
                ...(tableIds && tableIds.length > 0 && tableIds[0] !== 'none'
                    ? { tables: { connect: tableIds.map(id => ({ id })) } }
                    : {}
                ),
            }
        });
        revalidatePath('/dashboard/reservations');
        return { success: true };
    } catch (error) {
        return { error: "Failed to create reservation" };
    }
}

export async function checkInReservation(reservationId: string, tableId: string) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'CAPTAIN', 'WAITER']);
    try {
        // Verify ownership
        const reservation = await prisma.reservation.findFirst({
            where: { id: reservationId, ...(tenantId ? { tenantId } : {}) }
        });
        if (!reservation) return { error: "Reservation not found or access denied" };

        await prisma.$transaction(async (tx) => {
            await tx.reservation.update({
                where: { id: reservationId },
                data: {
                    status: ReservationStatus.COMPLETED,
                    tables: { connect: { id: tableId } }
                }
            });

            await tx.table.update({
                where: { id: tableId },
                data: { status: 'OCCUPIED' }
            });
        });

        revalidatePath('/dashboard/reservations');
        revalidatePath('/dashboard/tables');
        return { success: true };
    } catch (error) {
        console.error("Failed to check-in", error);
        return { error: "Failed to process check-in" };
    }
}

export async function cancelReservation(id: string) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'CAPTAIN', 'WAITER']);
    try {
        const existing = await prisma.reservation.findFirst({
            where: { id, ...(tenantId ? { tenantId } : {}) }
        });
        if (!existing) return { error: "Reservation not found or access denied" };

        await prisma.reservation.update({
            where: { id },
            data: { status: ReservationStatus.CANCELLED }
        });
        revalidatePath('/dashboard/reservations');
        return { success: true };
    } catch (error) {
        return { error: "Failed to cancel" };
    }
}

export async function updateReservation(id: string, data: ReservationFormValues) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'CAPTAIN', 'WAITER']);
    const validated = reservationSchema.safeParse(data);
    if (!validated.success) return { error: "Invalid fields" };

    try {
        const existing = await prisma.reservation.findFirst({
            where: { id, ...(tenantId ? { tenantId } : {}) }
        });
        if (!existing) return { error: "Reservation not found or access denied" };

        const { tableIds, ...rest } = validated.data;

        await prisma.reservation.update({
            where: { id },
            data: {
                ...rest,
                tables: {
                    set: [],
                    ...(tableIds && tableIds.length > 0 && tableIds[0] !== 'none'
                        ? { connect: tableIds.map(tid => ({ id: tid })) }
                        : {}
                    ),
                }
            }
        });
        revalidatePath('/dashboard/reservations');
        return { success: true };
    } catch (error) {
        return { error: "Failed to update reservation" };
    }
}
