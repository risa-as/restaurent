import { getTables } from '@/lib/actions/tables';
import { getCurrentUser } from '@/lib/auth-guard';
import { prisma } from '@/lib/prisma';

export const metadata = {
    title: 'الطاولات',
};

export const dynamic = 'force-dynamic';
import { TableMap } from '@/components/tables/table-map';

export default async function TablesPage() {
    const tables = await getTables();

    // Fetch tenant slug for QR URL generation
    const user = await getCurrentUser();
    const tenantSlug = user?.tenantId
        ? (await prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { slug: true } }))?.slug ?? ''
        : '';

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">إدارة الطاولات</h1>
            <TableMap initialTables={tables} tenantSlug={tenantSlug} />
        </div>
    );
}
