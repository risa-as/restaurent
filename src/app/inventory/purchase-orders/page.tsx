import { getPurchaseOrders } from '@/lib/actions/purchase-orders';
import { PurchaseOrderList } from '@/components/inventory/purchase-order-list';
import { PlanUpgradePrompt } from '@/components/plan/plan-upgrade-prompt';
import { getTenantWithPlan, getEffectiveLimits } from '@/lib/plan-limits';
import { getCurrentUser } from '@/lib/auth-guard';

export const metadata = {
    title: 'أوامر الشراء',
};

export const dynamic = 'force-dynamic';

export default async function PurchaseOrdersPage() {
    // Plan gate — purchase orders are PRO+ only
    try {
        const user = await getCurrentUser();
        if (user?.tenantId) {
            const tenant = await getTenantWithPlan(user.tenantId);
            if (tenant && !getEffectiveLimits(tenant).modules.inventory) {
                return <PlanUpgradePrompt feature="طلبات الشراء" requiredPlan="PRO" />;
            }
        }
    } catch { /* non-critical */ }

    const orders = await getPurchaseOrders();
    return <PurchaseOrderList orders={orders} />;
}
