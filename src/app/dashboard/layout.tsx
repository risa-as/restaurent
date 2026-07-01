import { GlobalSidebar } from '@/components/layout/global-sidebar';
import { GlobalHeader } from '@/components/layout/global-header';
import { auth } from '@/lib/auth';
import { Toaster } from '@/components/ui/toaster';
import { AIChatWidget } from '@/components/analytics/ai-chat-widget';
import { SystemTour } from '@/components/onboarding/system-tour';
import { getLowStockItems } from '@/lib/actions/reports';
import { getEffectiveServiceMode } from '@/lib/actions/config';
import { getActiveAnnouncementsForTenant } from '@/lib/actions/superadmin';
import AnnouncementBanner from '@/components/layout/announcement-banner';
import { getTenantContext } from '@/lib/tenant';
import { getEffectiveLimits } from '@/lib/plan-limits';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    // Super Admin has no tenant — redirect to their own area
    if ((session?.user as any)?.role === 'SUPER_ADMIN') {
        redirect('/superadmin');
    }

    const [lowStockItems, serviceMode, tenantCtx] = await Promise.all([
        getLowStockItems(),
        getEffectiveServiceMode(),
        getTenantContext(),
    ]);
    const lowStockCount = lowStockItems.length;

    // جلب اسم المطعم والشعار ونسبة الضريبة لعرضهما في الـ sidebar
    let restaurantName: string | undefined;
    let logoUrl: string | undefined;
    let taxRate: number | undefined;
    if (tenantCtx) {
        try {
            const { prisma } = await import('@/lib/prisma');
            const [tenantBranding, systemSettings] = await Promise.all([
                prisma.tenant.findUnique({
                    where: { id: tenantCtx.id },
                    select: { name: true, logoUrl: true }
                }),
                prisma.systemSetting.findFirst({ select: { taxRate: true } }),
            ]);
            restaurantName = tenantBranding?.name ?? undefined;
            logoUrl = tenantBranding?.logoUrl ?? undefined;
            taxRate = systemSettings?.taxRate ?? 0;
        } catch { /* non-fatal */ }
    }

    // Subscription status guard — skip for billing page itself
    const requestHeaders = headers();
    const pathname = requestHeaders.get('x-pathname') || '';
    const isBillingPage = pathname.startsWith('/dashboard/billing');

    if (!isBillingPage && tenantCtx) {
        const { prisma } = await import('@/lib/prisma');
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantCtx.id },
            select: { subscriptionStatus: true, isActive: true }
        });
        if (tenant) {
            if (!tenant.isActive) {
                redirect('/suspended');
            }
            if (tenant.subscriptionStatus === 'PAST_DUE') {
                redirect('/past-due');
            }
        }
    }

    // Fetch announcements and plan modules for tenant (non-blocking)
    let announcements: { id: string; title: string; body: string; type: string }[] = [];
    let planModules: Record<string, boolean> | undefined;
    try {
        if (tenantCtx) {
            const { prisma } = await import('@/lib/prisma');
            const tenant = await prisma.tenant.findUnique({ where: { id: tenantCtx.id }, select: { plan: true, featureOverrides: true } });
            if (tenant) {
                announcements = await getActiveAnnouncementsForTenant(tenant.plan);
                planModules = getEffectiveLimits(tenant).modules as unknown as Record<string, boolean>;
            }
        }
    } catch { /* non-critical */ }

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background">
            {/* Sidebar — RTL: on right side */}
            <GlobalSidebar
                userRole={session?.user?.role}
                userName={session?.user?.name ?? undefined}
                userEmail={session?.user?.email ?? undefined}
                lowStockBadge={lowStockCount > 0 ? lowStockCount : undefined}
                serviceMode={serviceMode}
                planModules={planModules}
                restaurantName={restaurantName}
                logoUrl={logoUrl}
                taxRate={taxRate}
            />
            {/* Main area — takes remaining space */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                <GlobalHeader />
                <main className="flex-1 overflow-y-auto bg-muted/30 p-6">
                    {announcements.length > 0 && <AnnouncementBanner announcements={announcements} />}
                    {children}
                </main>
            </div>
            <Toaster />
            <AIChatWidget />
            <SystemTour />
        </div>
    );
}
