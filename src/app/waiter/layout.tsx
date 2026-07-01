import { auth } from '@/lib/auth';
import { Toaster } from '@/components/ui/toaster';
import { GlobalSidebar } from '@/components/layout/global-sidebar';
import { GlobalHeader } from '@/components/layout/global-header';
import { NetworkStatusBanner } from '@/components/offline/network-status-banner';

export default async function WaiterLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    return (
        <div className="flex h-[100dvh] w-full overflow-hidden bg-background" dir="rtl">
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
            <Toaster />
        </div>
    );
}
