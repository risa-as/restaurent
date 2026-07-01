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
            return NextResponse.json({ suppliers: [] });
        }

        const branchId = await getActiveBranchId(tenantId);
        const branchWhere = branchId ? { branchId } : {};

        const suppliers = await prisma.supplier.findMany({
            where: { tenantId, isDeleted: false, ...branchWhere },
            orderBy: { name: 'asc' },
            select: { id: true, name: true, contact: true, phone: true, email: true, isActive: true },
        });

        return NextResponse.json({ suppliers });
    } catch (error) {
        console.error('GET /api/inventory/suppliers error:', error);
        return NextResponse.json({ suppliers: [] });
    }
}
