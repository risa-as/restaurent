import { auth } from '@/lib/auth';
import { Toaster } from '@/components/ui/toaster';
import { GlobalSidebar } from '@/components/layout/global-sidebar';
import { GlobalHeader } from '@/components/layout/global-header';
import { NetworkStatusBanner } from '@/components/offline/network-status-banner';
import { OrderLog } from '@/components/offline/order-log';
import { PlanUpgradePrompt } from '@/components/plan/plan-upgrade-prompt';
import { getEffectiveLimits } from '@/lib/plan-limits';
import { prisma } from '@/lib/prisma';

export default async function DeliveryLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    const tenantId = (session?.user as any)?.tenantId as string | undefined;

    // Plan gate — delivery is PRO+ only (single DB query)
    if (tenantId) {
        try {
            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { plan: true, featureOverrides: true },
            });
            if (tenant && !getEffectiveLimits(tenant).modules.delivery) {
                return (
                    <div className="flex h-screen w-full overflow-hidden bg-background" dir="rtl">
                        <GlobalSidebar
                            userRole={session?.user?.role}
                            userName={session?.user?.name ?? undefined}
                            userEmail={session?.user?.email ?? undefined}
                        />
                        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                            <GlobalHeader />
                            <main className="flex-1 overflow-y-auto p-6">
                                <PlanUpgradePrompt feature="التوصيل" requiredPlan="PRO" />
                            </main>
                        </div>
                    </div>
                );
            }
        } catch { /* non-critical — allow access on error */ }
    }

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background" dir="rtl">
            <GlobalSidebar
                userRole={session?.user?.role}
                userName={session?.user?.name ?? undefined}
                userEmail={session?.user?.email ?? undefined}
            />
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                <NetworkStatusBanner />
                <GlobalHeader />
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
            <OrderLog tenantId={tenantId} />
            <Toaster />
        </div>
    );
}
