'use server';
/* eslint-disable @typescript-eslint/no-unused-vars */

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { hash } from 'bcryptjs';
import { verifyRole } from '@/lib/auth-guard';
import { checkPlanCount } from '@/lib/plan-limits';
import { requireTenantId } from '@/lib/utils/require-tenant';

import { unstable_noStore as noStore } from 'next/cache';

const userSchema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.union([z.string().min(6), z.literal('')]).optional(), // Optional for edit
    role: z.enum(['ADMIN', 'MANAGER', 'WAITER', 'CHEF', 'ACCOUNTANT', 'DRIVER', 'CAPTAIN', 'DELIVERY_MANAGER', 'CASHIER']),
    phone: z.string().optional(),
    branchId: z.string().nullish(),
});

export type UserInput = z.infer<typeof userSchema>;

export async function getUsers(branchId?: string | null) {
    noStore();
    try {
        const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
        requireTenantId(tenantId);
        return await prisma.user.findMany({
            where: {
                isDeleted: false,
                tenantId,
                ...(branchId ? { branchId } : {}),
            },
            include: { branch: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' }
        });
    } catch (error) {
        console.error('getUsers error:', error);
        return [];
    }
}

export async function upsertUser(data: UserInput, id?: string) {
    const { tenantId } = await verifyRole(['ADMIN']);
    requireTenantId(tenantId);
    const validated = userSchema.safeParse(data);
    if (!validated.success) return { error: "Invalid data" };

    try {
        const { password, ...rest } = validated.data;

        let passwordHash = undefined;
        if (password) {
            passwordHash = await hash(password, 12);
        }

        const { branchId, ...userRest } = rest;

        if (id) {
            const existing = await prisma.user.findFirst({
                where: { id, tenantId }
            });
            if (!existing) return { error: "User not found or access denied" };

            await prisma.user.update({
                where: { id },
                data: {
                    ...userRest,
                    branchId: branchId || null,
                    ...(passwordHash && { password: passwordHash }),
                }
            });
        } else {
            if (!password) return { error: "Password required for new user" };
            await checkPlanCount(tenantId, 'staff');
            await prisma.user.create({
                data: {
                    ...userRest,
                    password: passwordHash!,
                    tenantId,
                    branchId: branchId || null,
                }
            });
        }
        revalidatePath('/dashboard/admin');
        return { success: true };
    } catch (e: any) {
        if (e?.upgradeRequired) return { error: e.message, upgradeRequired: true };
        return { error: "Failed to save user" };
    }
}

export async function deleteUser(id: string) {
    const { tenantId } = await verifyRole(['ADMIN']);
    requireTenantId(tenantId);
    try {
        const existing = await prisma.user.findFirst({
            where: { id, tenantId }
        });
        if (!existing) return { error: "User not found or access denied" };

        await prisma.user.update({
            where: { id },
            data: { isDeleted: true, deletedAt: new Date() }
        });
        revalidatePath('/dashboard/admin');
        return { success: true };
    } catch { return { error: "Failed to delete" }; }
}

export async function getSystemSettings() {
    try {
        const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
        requireTenantId(tenantId);
        const settings = await prisma.systemSetting.findUnique({ where: { tenantId } });
        if (!settings) {
            return await prisma.systemSetting.create({ data: { tenantId } });
        }
        return settings;
    } catch { return null; }
}

export async function updateSystemSettings(data: {
    currency: string;
    taxRate: number;
    serviceFee: number;
    tableReviewMinutes: number;
    numberLocale?: string;
}) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    requireTenantId(tenantId);
    try {
        const updateData = {
            currency: data.currency,
            taxRate: data.taxRate,
            serviceFee: data.serviceFee,
            tableReviewMinutes: data.tableReviewMinutes,
            ...(data.numberLocale ? { numberLocale: data.numberLocale } : {}),
        };

        await prisma.systemSetting.upsert({
            where: { tenantId },
            update: updateData,
            create: { tenantId, ...updateData },
        });
        revalidatePath('/dashboard/admin');
        revalidatePath('/dashboard'); // Might be used on dashboard too
        return { success: true };
    } catch (error) {
        console.error("Settings Update Error:", error);
        return { error: "فشل في تحديث الإعدادات" };
    }
}

export async function updateTenantProfile(data: {
    googlePlaceId?: string | null;
    nightMenuStartTime?: string | null;
    nightMenuEndTime?: string | null;
}) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    try {
        await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                googlePlaceId: data.googlePlaceId ?? null,
                nightMenuStartTime: data.nightMenuStartTime ?? null,
                nightMenuEndTime: data.nightMenuEndTime ?? null,
            },
        });
        revalidatePath('/dashboard/settings');
        return { success: true };
    } catch (error) {
        console.error('updateTenantProfile error:', error);
        return { error: 'فشل في تحديث بيانات المطعم' };
    }
}
