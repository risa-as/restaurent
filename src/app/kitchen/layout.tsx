import { GlobalSidebar } from '@/components/layout/global-sidebar';
import { GlobalHeader } from '@/components/layout/global-header';
import { KitchenNav } from '@/components/kitchen/kitchen-nav';
import { NetworkStatusBanner } from '@/components/offline/network-status-banner';
import { OrderLog } from '@/components/offline/order-log';
import { Toaster } from '@/components/ui/toaster';
import { auth } from '@/lib/auth';
import { getCategories } from '@/lib/actions/menu';
import { getStations } from '@/lib/actions/kitchen-stations';

export default async function KitchenLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    // 3-second timeout so the layout renders quickly when Neon is unreachable offline.
    // Note: `<T,>` (trailing comma) — a bare `<T>` arrow generic is parsed as JSX in .tsx files.
    const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T> =>
        Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);

    const [categories, stations] = await Promise.all([
        withTimeout(getCategories(), 3000).catch(() => []),
        withTimeout(getStations(), 3000).catch(() => []),
    ]);

    // If stations exist and have categories linked, use station-based nav
    // Otherwise fall back to category-based nav
    const hasStations = stations.length > 0 && categories.some((c: any) => c.stationId);

    const navItems = hasStations
        ? stations.map(s => ({ id: s.id, name: (s as any).nameAr || s.name, type: 'station' as const }))
        : categories.map(c => ({ id: c.id, name: c.name, type: 'category' as const }));

    return (
        <div className="h-screen flex w-full overflow-hidden bg-background" dir="rtl">
            <GlobalSidebar
                userRole={session?.user?.role}
                userName={session?.user?.name ?? undefined}
                userEmail={session?.user?.email ?? undefined}
            />
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                <NetworkStatusBanner />
                <GlobalHeader>
                    <KitchenNav stations={navItems} />
                </GlobalHeader>
                <main className="flex-1 overflow-auto p-4 bg-muted/10">
                    <div className="h-full max-w-[1600px] mx-auto w-full">
                        {children}
                    </div>
                </main>
            </div>
            <OrderLog tenantId={(session?.user as { tenantId?: string } | undefined)?.tenantId} />
            <Toaster />
        </div>
    );
}
