import { SupplierList } from '@/components/inventory/supplier-list';
import { getSuppliersWithStats } from '@/lib/actions/suppliers';
import { PlanUpgradePrompt } from '@/components/plan/plan-upgrade-prompt';
import { getTenantWithPlan, getEffectiveLimits } from '@/lib/plan-limits';
import { getCurrentUser } from '@/lib/auth-guard';

export const metadata = {
    title: 'الموردون',
};

export const dynamic = 'force-dynamic';

export default async function SuppliersPage() {
    // Plan gate — supplier management is PRO+ only
    try {
        const user = await getCurrentUser();
        if (user?.tenantId) {
            const tenant = await getTenantWithPlan(user.tenantId);
            if (tenant && !getEffectiveLimits(tenant).modules.inventory) {
                return <PlanUpgradePrompt feature="الموردون" requiredPlan="PRO" />;
            }
        }
    } catch { /* non-critical */ }

    const suppliers = await getSuppliersWithStats();
    return <SupplierList suppliers={suppliers} />;
}
