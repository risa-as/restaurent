import { getUsers } from '@/lib/actions/admin';
import { getBranches, getSelectedBranchId } from '@/lib/actions/branches';
import { getStations } from '@/lib/actions/kitchen-stations';
import { getCategories } from '@/lib/actions/menu';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const metadata = {
    title: 'لوحة المدير',
};

export const dynamic = 'force-dynamic';
import { UserManagement } from '@/components/admin/user-management';
import { KitchenStationManager } from '@/components/kitchen/kitchen-station-manager';

export default async function AdminPage() {
    const session = await auth();
    const user = session?.user as any;
    const tenantId = user?.tenantId as string | undefined;
    const role = user?.role as string;
    const isAdmin = role === 'ADMIN';

    // Branch selector only for ADMIN — MANAGER is locked to their own branch
    const [branches, selectedBranchId] = await Promise.all([
        (async () => {
            if (!isAdmin || !tenantId) return [];
            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { multiBranchEnabled: true },
            });
            return tenant?.multiBranchEnabled ? getBranches() : [];
        })(),
        isAdmin ? getSelectedBranchId() : Promise.resolve(user?.branchId ?? null),
    ]);

    // For ADMIN: filter by selected branch (if any); for MANAGER: filter by own branchId
    const filterBranchId = isAdmin
        ? (branches.length > 1 ? selectedBranchId : null)
        : (user?.branchId ?? null);

    const [users, stations, categories] = await Promise.all([
        getUsers(filterBranchId),
        getStations(filterBranchId),
        getCategories(),
    ]);

    return (
        <div className="space-y-8" dir="rtl">
            <div>
                <h1 className="text-3xl font-bold">إدارة الموظفين</h1>
                <p className="text-muted-foreground mt-1">إضافة وإدارة أعضاء الفريق وصلاحياتهم</p>
            </div>
            <UserManagement
                users={users}
                branches={branches}
                selectedBranchId={selectedBranchId}
                isAdmin={isAdmin}
            />
            <KitchenStationManager stations={stations} categories={categories.map(c => ({ id: c.id, name: c.name, stationId: (c as any).stationId ?? null }))} />
        </div>
    );
}
