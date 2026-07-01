import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantContext } from '@/lib/tenant';
import { getOperationalBranchWhere } from '@/lib/utils/branch-filter';

export async function GET() {
    try {
        const tenantCtx = await getTenantContext();
        if (!tenantCtx) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const branchWhere = await getOperationalBranchWhere(tenantCtx.id);

        const tables = await prisma.table.findMany({
            where: { tenantId: tenantCtx.id, ...branchWhere },
            select: { id: true, number: true, status: true },
            orderBy: { number: 'asc' },
        });

        return NextResponse.json(tables);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
