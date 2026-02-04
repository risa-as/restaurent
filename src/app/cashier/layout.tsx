

import { auth } from '@/lib/auth';
import { Toaster } from '@/components/ui/toaster';
import { RoleHeader } from '@/components/layout/role-header';

export default async function CashierLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    return (
        <div className="flex flex-col h-screen w-full bg-gray-50">
            {/* Minimal Header or Custom Header for Cashier */}
            {/* Minimal Header or Custom Header for Cashier */}
            <RoleHeader title="نظام الكاشير" session={session} />
            <main className="flex-1 p-6 overflow-hidden">
                {children}
            </main>
            <Toaster />
        </div>
    );
}
