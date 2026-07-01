import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { OrderClient } from './order-client';
import { activeBranchOr } from '@/lib/utils/branch-where';

interface QROrderPageProps {
    params: { slug: string };
    searchParams: { t?: string };
}

export const metadata = {
    title: 'الطلب',
};

export default async function QROrderPage({ params, searchParams }: QROrderPageProps) {
    const { slug } = params;
    const tableId = searchParams.t;

    const tenant = await prisma.tenant.findUnique({
        where: { slug },
        select: { id: true, name: true, logoUrl: true, primaryColor: true },
    });
    if (!tenant) notFound();

    // Fetch table including its branchId for data isolation
    const table = tableId
        ? await prisma.table.findFirst({
              where: { id: tableId, tenantId: tenant.id },
              select: { id: true, number: true, status: true, branchId: true },
          })
        : null;

    const branchId = table?.branchId ?? null;

    // Use branch-level branding when available (name/logo/primaryColor)
    let branchBranding: {
        name: string;
        appName: string | null;
        logoUrl: string | null;
        primaryColor: string | null;
    } | null = null;

    if (branchId) {
        branchBranding = await prisma.branch.findUnique({
            where: { id: branchId },
            select: { name: true, appName: true, logoUrl: true, primaryColor: true },
        });
    }

    // Strict branch filter: only show items/categories explicitly assigned to this branch.
    // With no table (no branch), fall back to ACTIVE branches only so a disabled
    // branch's menu is never served to customers.
    const categoryWhere = branchId
        ? { tenantId: tenant.id, branchId }
        : { tenantId: tenant.id, ...activeBranchOr() };

    const categories = await prisma.category.findMany({
        where: categoryWhere,
        orderBy: { name: 'asc' },
    });

    const menuItemWhere = branchId
        ? { tenantId: tenant.id, isAvailable: true, isDeleted: false, branchId }
        : { tenantId: tenant.id, isAvailable: true, isDeleted: false, ...activeBranchOr() };

    const menuItems = await prisma.menuItem.findMany({
        where: menuItemWhere,
        include: {
            offers: { where: { isActive: true } },
            _count: { select: { modifierGroups: true } },
        },
        orderBy: { name: 'asc' },
    });

    // Merge branding: branch values take priority over tenant defaults
    const displayTenant = {
        id: tenant.id,
        name: branchBranding?.appName || branchBranding?.name || tenant.name,
        logoUrl: branchBranding?.logoUrl || tenant.logoUrl,
        primaryColor: branchBranding?.primaryColor || tenant.primaryColor || '#2563eb',
    };

    // Issue or reuse qr_session cookie
    const cookieStore = cookies();
    let sessionToken = cookieStore.get('qr_session')?.value;
    if (!sessionToken) {
        sessionToken = randomUUID();
    }

    return (
        <OrderClient
            tenant={displayTenant}
            table={table}
            categories={categories}
            menuItems={menuItems}
            sessionToken={sessionToken}
            tenantSlug={slug}
        />
    );
}
