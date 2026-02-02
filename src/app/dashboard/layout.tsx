import Header from '@/components/layout/header';
import Sidebar from '@/components/layout/sidebar';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Toaster } from '@/components/ui/toaster';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Double check auth here or rely on middleware. 
    // Doing it here allows access to session data for sidebar.
    const session = await auth();

    if (!session?.user) {
        // Middleware should handle this, but as a safety net:
        // redirect('/login');
    }

    return (
        <div className="flex h-screen w-full overflow-hidden flex-row">
            <Sidebar userRole={session?.user?.role} />
            <div className="flex flex-col flex-1 overflow-hidden relative">
                <Header />
                <main className="flex-1 overflow-y-auto bg-gray-100 p-6 relative">
                    {children}
                </main>
                <Toaster />
            </div>
        </div>
    );
}
