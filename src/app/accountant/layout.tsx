import { AccountantSidebar } from '@/components/layout/accountant-sidebar';
import { RoleHeader } from '@/components/layout/role-header';

import { auth } from '@/lib/auth';

export default async function AccountantLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    return (
        <div className="h-full relative">
            <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] bg-gray-900">
                <AccountantSidebar />
            </div>
            <main className="md:pr-72 pb-10">
                <RoleHeader title="لوحة تحكم المحاسب" session={session}>
                    {/* Add any accountant specific header actions here if needed */}
                </RoleHeader>
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}
