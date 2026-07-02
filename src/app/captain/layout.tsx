import { auth } from '@/lib/auth';
import { Toaster } from '@/components/ui/toaster';
import { GlobalSidebar } from '@/components/layout/global-sidebar';
import { GlobalHeader } from '@/components/layout/global-header';
import { CaptainNav } from '@/components/captain/captain-nav';
import { NetworkStatusBanner } from '@/components/offline/network-status-banner';
import { OrderLog } from '@/components/offline/order-log';

export default async function CaptainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    return (
        <div className="flex h-screen w-full overflow-hidden bg-background" dir="rtl">
            <GlobalSidebar
                userRole={session?.user?.role}
                userName={session?.user?.name ?? undefined}
                userEmail={session?.user?.email ?? undefined}
            />
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                <NetworkStatusBanner />
                <GlobalHeader>
                    <CaptainNav />
                </GlobalHeader>
                <main className="flex-1 overflow-hidden">
                    {children}
                </main>
            </div>
            <OrderLog tenantId={(session?.user as { tenantId?: string } | undefined)?.tenantId} />
            <Toaster />
        </div>
    );
}
