import { getOffers, getMenuItems, getCategories } from '@/lib/actions/menu';
import { PlanUpgradePrompt } from '@/components/plan/plan-upgrade-prompt';
import { getTenantWithPlan, getEffectiveLimits } from '@/lib/plan-limits';
import { getCurrentUser } from '@/lib/auth-guard';
import { getBranches, getSelectedBranchId } from '@/lib/actions/branches';
import { prisma } from '@/lib/prisma';

export const metadata = {
    title: 'العروض',
};

export const dynamic = 'force-dynamic';
import { OfferList } from '@/components/menu/offer-list';
import { AddOfferSheet } from '@/components/menu/add-offer-sheet';

export default async function OffersPage() {
    // Plan gate — offers are PRO+ only
    try {
        const user = await getCurrentUser();
        if (user?.tenantId) {
            const tenant = await getTenantWithPlan(user.tenantId);
            if (tenant && !getEffectiveLimits(tenant).modules.offers) {
                return <PlanUpgradePrompt feature="العروض والخصومات" requiredPlan="PRO" />;
            }
        }
    } catch { /* non-critical */ }

    const user = await getCurrentUser().catch(() => null);
    const tenantId = user?.tenantId;

    const [offers, menuItems, categories, branches, selectedBranchId] = await Promise.all([
        getOffers(),
        getMenuItems(),
        getCategories(),
        (async () => {
            if (!tenantId) return [];
            const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { multiBranchEnabled: true } });
            return tenant?.multiBranchEnabled ? getBranches() : [];
        })(),
        getSelectedBranchId(),
    ]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">العروض والخصومات</h1>
                <AddOfferSheet menuItems={menuItems} categories={categories.map(c => ({ id: c.id, name: c.name }))} branches={branches} defaultBranchId={selectedBranchId} />
            </div>

            <OfferList
                offers={offers}
                menuItems={menuItems}
                categories={categories.map(c => ({ id: c.id, name: c.name }))}
                branches={branches}
                defaultBranchId={selectedBranchId}
            />
        </div>
    );
}
