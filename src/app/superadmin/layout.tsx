import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { signOut } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import SuperAdminSidebar from '@/components/superadmin/superadmin-sidebar';

export default async function SuperAdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session || session.user?.role !== 'SUPER_ADMIN') {
        redirect('/');
    }

    return (
        <div className="min-h-screen bg-background flex" dir="rtl">
            {/* Sidebar */}
            <aside className="w-64 bg-card border-l flex flex-col shadow-xl shrink-0">
                {/* Header */}
                <div className="p-5 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[hsl(246,80%,14%)] flex items-center justify-center overflow-hidden">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/logo.png" alt="SaaS Admin" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold leading-tight">SaaS Admin</h1>
                            <p className="text-[10px] text-muted-foreground">لوحة الإدارة العليا</p>
                        </div>
                    </div>
                    <ThemeToggle />
                </div>

                <SuperAdminSidebar />

                <div className="p-4 border-t space-y-2">
                    <div className="px-3 py-2.5 rounded-lg bg-muted text-sm">
                        <p className="font-semibold truncate text-sm">{session.user?.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{session.user?.email}</p>
                        <span className="inline-flex mt-1 items-center px-1.5 py-0.5 rounded text-[10px] bg-orange-100 text-orange-700 font-bold">
                            SUPER ADMIN
                        </span>
                    </div>
                    <form action={async () => { 'use server'; await signOut(); }}>
                        <Button type="submit" variant="destructive" size="sm" className="w-full gap-2">
                            <LogOut className="w-3.5 h-3.5" />
                            تسجيل الخروج
                        </Button>
                    </form>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-auto bg-muted/30">
                <div className="p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
