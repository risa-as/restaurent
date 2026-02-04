
import { auth } from '@/lib/auth';
import { Toaster } from '@/components/ui/toaster';

import { CaptainNav } from '@/components/captain/captain-nav';
import { RoleHeader } from '@/components/layout/role-header';

export default async function CaptainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    return (
        <div className="flex flex-col h-screen w-full bg-gray-50">
            <RoleHeader title="نظام الكابتن" session={session}>
                <CaptainNav />
            </RoleHeader>
            <main className="flex-1 p-4 overflow-hidden">
                {children}
            </main>
            <Toaster />
        </div>
    );
}
