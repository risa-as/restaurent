'use server';
/* eslint-disable @typescript-eslint/no-unused-vars */

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { hash } from 'bcryptjs';

const userSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.union([z.string().min(6), z.literal('')]).optional(), // Optional for edit
    role: z.enum(['ADMIN', 'MANAGER', 'WAITER', 'CHEF', 'ACCOUNTANT', 'DRIVER', 'CAPTAIN', 'DELIVERY_MANAGER', 'CASHIER']),
    phone: z.string().optional(),
});

export type UserInput = z.infer<typeof userSchema>;

export async function getUsers() {
    try {
        return await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
    } catch { return []; }
}

export async function upsertUser(data: UserInput, id?: string) {
    const validated = userSchema.safeParse(data);
    if (!validated.success) return { error: "Invalid data" };

    try {
        const { password, ...rest } = validated.data;

        let passwordHash = undefined;
        if (password) {
            passwordHash = await hash(password, 12);
        }

        if (id) {
            // Edit
            await prisma.user.update({
                where: { id },
                data: {
                    ...rest,
                    ...(passwordHash && { password: passwordHash }),
                }
            });
        } else {
            // Create
            if (!password) return { error: "Password required for new user" };
            await prisma.user.create({
                data: {
                    ...rest,
                    password: passwordHash!,
                }
            });
        }
        revalidatePath('/dashboard/admin');
        return { success: true };
    } catch (e) {
        return { error: "Failed to save user" };
    }
}

export async function deleteUser(id: string) {
    try {
        await prisma.user.delete({ where: { id } });
        revalidatePath('/dashboard/admin');
        return { success: true };
    } catch { return { error: "Failed to delete" }; }
}

export async function getSystemSettings() {
    try {
        const settings = await prisma.systemSetting.findFirst();
        if (!settings) {
            // Initialize default if not exists
            return await prisma.systemSetting.create({
                data: {}
            });
        }
        return settings;
    } catch { return null; }
}

export async function updateSystemSettings(data: {
    restaurantName: string;
    currency: string;
    taxRate: number;
    serviceFee: number;
}) {
    try {
        const updateData = {
            restaurantName: data.restaurantName,
            currency: data.currency,
            taxRate: data.taxRate,
            serviceFee: data.serviceFee,
        };

        const existing = await prisma.systemSetting.findFirst();
        if (existing) {
            await prisma.systemSetting.update({
                where: { id: existing.id },
                data: updateData
            });
        } else {
            await prisma.systemSetting.create({
                data: updateData
            });
        }
        revalidatePath('/dashboard/admin');
        revalidatePath('/dashboard'); // Might be used on dashboard too
        return { success: true };
    } catch (error) {
        console.error("Settings Update Error:", error);
        return { error: "فشل في تحديث الإعدادات" };
    }
}
