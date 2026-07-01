import { getPlanPricing, getPlanConfigs } from '@/lib/actions/superadmin';
import { prisma } from '@/lib/prisma';
import PlansPageClient from './plans-client';

export const metadata = {
    title: 'الباقات',
};

export const dynamic = 'force-dynamic';

export default async function PlansPage() {
    const [pricing, tenantStats, planConfigs] = await Promise.all([
        getPlanPricing(),
        prisma.tenant.groupBy({
            by: ['plan'],
            _count: { _all: true },
        }),
        getPlanConfigs(),
    ]);

    const statsByPlan: Record<string, number> = {};
    tenantStats.forEach(s => { statsByPlan[s.plan] = s._count._all; });

    return (
        <PlansPageClient
            pricing={pricing}
            tenantCounts={statsByPlan}
            planConfigs={planConfigs as any}
        />
    );
}
