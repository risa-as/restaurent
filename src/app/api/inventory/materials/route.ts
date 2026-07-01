import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-guard';
import { getActiveBranchId } from '@/lib/utils/branch-filter';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) {
            return NextResponse.json({ materials: [] });
        }

        const branchId = await getActiveBranchId(tenantId);
        const branchWhere = branchId ? { branchId } : {};

        const materials = await prisma.rawMaterial.findMany({
            where: { tenantId, isDeleted: false, ...branchWhere },
            orderBy: { name: 'asc' },
            select: { id: true, name: true, unit: true },
        });

        return NextResponse.json({ materials });
    } catch (error) {
        console.error('GET /api/inventory/materials error:', error);
        return NextResponse.json({ materials: [] });
    }
}
