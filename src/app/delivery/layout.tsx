import { auth } from '@/lib/auth';
import { Toaster } from '@/components/ui/toaster';
import { RoleHeader } from '@/components/layout/role-header';

export default async function DeliveryLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    const isManager = session?.user?.role === 'DELIVERY_MANAGER' || session?.user?.role === 'ADMIN' || session?.user?.role === 'MANAGER';
    const title = isManager ? 'إدارة التوصيل' : 'خدمة التوصيل';

    return (
        <div className="flex flex-col h-screen w-full bg-gray-50">
            <RoleHeader title={title} session={session} />
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
            <Toaster />
        </div>
    );
}
