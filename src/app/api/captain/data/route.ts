import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getCaptainMenu, getTables } from '@/lib/actions/captain';
import { getEffectiveServiceMode } from '@/lib/actions/config';
import { getActiveBranchId } from '@/lib/utils/branch-filter';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });

  const tenantId = (session.user as any).tenantId as string | undefined;
  const branchId = tenantId ? await getActiveBranchId(tenantId) : null;
  const branchWhere = branchId ? { branchId } : {};

  const [categories, tables, serviceMode, readyCount] = await Promise.all([
    getCaptainMenu(),
    getTables(),
    getEffectiveServiceMode(),
    tenantId
      ? prisma.order.count({ where: { tenantId, status: 'READY', tableId: { not: null }, ...branchWhere } })
      : Promise.resolve(0),
  ]);

  return NextResponse.json({ categories, tables, serviceMode, readyCount, tenantId, branchId });
}
