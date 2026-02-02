
import { auth } from '@/lib/auth';
import { Toaster } from '@/components/ui/toaster';
import { UserNav } from '@/components/layout/user-nav';
import { CaptainNav } from '@/components/captain/captain-nav';

export default async function CaptainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    return (
        <div className="flex flex-col h-screen w-full bg-gray-50">
            <div className="bg-white border-b px-6 py-3 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="font-bold text-xl">نظام الكابتن</div>
                    <CaptainNav />
                </div>
                <div className="flex items-center gap-4">
                    <UserNav session={session} />
                </div>
            </div>
            <main className="flex-1 p-4 overflow-hidden">
                {children}
            </main>
            <Toaster />
        </div>
    );
}
