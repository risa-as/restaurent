import { GlobalSidebar } from '@/components/layout/global-sidebar';
import { GlobalHeader } from '@/components/layout/global-header';
import { auth } from '@/lib/auth';
import { Toaster } from '@/components/ui/toaster';

export default async function InventoryLayout({
    children,
}: {
    children: React.ReactNode
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
                <GlobalHeader />
                <main className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-auto p-6">
                        {children}
                    </div>
                </main>
            </div>
            <Toaster />
        </div>
    );
}
