'use server';
/* eslint-disable @typescript-eslint/no-unused-vars */

import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { reservationSchema, ReservationFormValues } from '@/lib/validations/reservations';

export async function getReservations(date?: Date) {
    try {
        const today = date || new Date();
        // Start of day
        const start = new Date(today);
        start.setHours(0, 0, 0, 0);
        // End of day
        const end = new Date(today);
        end.setHours(23, 59, 59, 999);

        return await prisma.reservation.findMany({
            where: {
                reservationTime: {
                    gte: start,
                    lte: end
                }
            },
            include: {
                table: true
            },
            orderBy: { reservationTime: 'asc' }
        });
    } catch (error) {
        console.error("Failed to fetch reservations", error);
        return [];
    }
}

export async function createReservation(data: ReservationFormValues) {
    const validated = reservationSchema.safeParse(data);
    if (!validated.success) return { error: "Invalid fields" };

    try {
        await prisma.reservation.create({
            data: {
                ...validated.data,
                status: 'CONFIRMED'
            }
        });
        revalidatePath('/dashboard/reservations');
        // In a real app, sendSMS(data.customerPhone, "Your reservation is confirmed!");
        return { success: true };
    } catch (error) {
        return { error: "Failed to create reservation" };
    }
}

export async function checkInReservation(reservationId: string, tableId: string) {
    try {
        await prisma.$transaction(async (tx) => {
            // 1. Update Reservation
            await tx.reservation.update({
                where: { id: reservationId },
                data: {
                    status: 'COMPLETED',
                    tableId: tableId
                }
            });

            // 2. Update Table Status
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
    try {
        await prisma.reservation.update({
            where: { id },
            data: { status: 'CANCELLED' }
        });
        revalidatePath('/dashboard/reservations');
        return { success: true };
    } catch (error) {
        return { error: "Failed to cancel" };
    }
}
