import { verifyRole } from '@/lib/auth-guard';
import { requireTenantId } from '@/lib/utils/require-tenant';
import { getModifierGroups } from '@/lib/actions/modifiers';
import { ModifierGroupsClient } from './modifiers-client';
import { prisma } from '@/lib/prisma';

export const metadata = {
    title: 'الإضافات والخيارات',
};

export default async function ModifiersPage() {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);
    requireTenantId(tenantId);

    const [groups, rawMaterials] = await Promise.all([
        getModifierGroups(tenantId),
        prisma.rawMaterial.findMany({
            where: { tenantId, isDeleted: false },
            select: { id: true, name: true, unit: true },
            orderBy: { name: 'asc' },
        }),
    ]);

    return <ModifierGroupsClient groups={groups} rawMaterials={rawMaterials} />;
}
