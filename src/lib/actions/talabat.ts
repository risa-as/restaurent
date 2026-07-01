'use server';

import { prisma } from '@/lib/prisma';
import { verifyRole } from '@/lib/auth-guard';
import { requireTenantId } from '@/lib/utils/require-tenant';
import { getActiveBranchId } from '@/lib/utils/branch-filter';
import { TalabatClient } from '@/lib/talabat';
import { revalidatePath } from 'next/cache';

// T155: Sync the restaurant menu to Talabat
export async function syncMenuToTalabat(tenantId: string) {
    await verifyRole(['ADMIN', 'MANAGER']);
    requireTenantId(tenantId);
    const branchId = await getActiveBranchId(tenantId);

    try {
        const config = await prisma.talabatConfig.findFirst({
            where: { tenantId, branchId: branchId ?? null, isEnabled: true }
        });
        if (!config) return { error: 'Talabat غير مفعّل أو غير مضبوط' };

        const categories = await prisma.category.findMany({
            where: { tenantId },
            include: {
                items: {
                    where: { isAvailable: true, isDeleted: false },
                    select: { id: true, name: true, nameAr: true, price: true, isAvailable: true }
                }
            }
        });

        const client = new TalabatClient(config);
        await client.syncMenu(
            categories.map((cat: { id: string; name: string; nameAr: string | null; items: { id: string; name: string; nameAr: string | null; price: number; isAvailable: boolean }[] }) => ({
                id: cat.id,
                name: cat.name,
                nameAr: cat.nameAr ?? undefined,
                items: cat.items.map((item: { id: string; name: string; nameAr: string | null; price: number; isAvailable: boolean }) => ({
                    id: item.id,
                    name: item.name,
                    nameAr: item.nameAr ?? undefined,
                    price: item.price,
                    isAvailable: item.isAvailable,
                    categoryId: cat.id,
                }))
            }))
        );

        await prisma.talabatConfig.update({
            where: { id: config.id },
            data: { lastSyncAt: new Date() }
        });

        revalidatePath('/dashboard/settings/talabat');
        return { success: true };
    } catch (error) {
        console.error('syncMenuToTalabat error:', error);
        return { error: 'فشل في مزامنة القائمة مع Talabat' };
    }
}

// Save/update Talabat config for the current tenant + branch
export async function saveTalabatConfig(data: {
    storeId: string;
    apiKey: string;
    webhookSecret: string;
    isEnabled: boolean;
    itemMapping?: string;
}) {
    const { tenantId } = await verifyRole(['ADMIN']);
    requireTenantId(tenantId);
    const branchId = await getActiveBranchId(tenantId);

    try {
        const existing = await prisma.talabatConfig.findFirst({
            where: { tenantId, branchId: branchId ?? null }
        });
        if (existing) {
            await prisma.talabatConfig.update({ where: { id: existing.id }, data });
        } else {
            await prisma.talabatConfig.create({
                data: { ...data, tenantId, branchId: branchId ?? null }
            });
        }
        revalidatePath('/dashboard/settings/talabat');
        return { success: true };
    } catch (error) {
        console.error('saveTalabatConfig error:', error);
        return { error: 'فشل في حفظ الإعدادات' };
    }
}

// Get Talabat config for the current tenant + branch
export async function getTalabatConfig() {
    try {
        const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
        const branchId = await getActiveBranchId(tenantId);
        return await prisma.talabatConfig.findFirst({
            where: { tenantId, branchId: branchId ?? null }
        });
    } catch {
        return null;
    }
}
