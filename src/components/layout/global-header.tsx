import React from 'react';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getBranches, getSelectedBranchId } from '@/lib/actions/branches';
import { BranchSelector } from '@/components/branch/branch-selector';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { PageTitle } from '@/components/layout/page-title';
import { Settings, Bell } from 'lucide-react';
import { LogoutButton } from '@/components/layout/logout-button';
import Link from 'next/link';

const ROLE_LABELS: Record<string, string> = {
    ADMIN: 'مدير النظام',
    MANAGER: 'مدير',
    CASHIER: 'كاشير',
    CHEF: 'طاهي',
    CAPTAIN: 'كابتن',
    WAITER: 'نادل',
    DRIVER: 'سائق',
    DELIVERY_MANAGER: 'مدير التوصيل',
    STORE_MANAGER: 'مدير المخزن',
    ACCOUNTANT: 'محاسب',
};

export async function GlobalHeader({ children }: { children?: React.ReactNode } = {}) {
    const session = await auth();
    const user = session?.user;
    const role = user?.role as string;
    const tenantId = (user as any)?.tenantId as string | undefined;

    const initials = user?.name
        ?.split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('') ?? 'م';

    // Load branches for ADMIN only — managers are locked to their assigned branch
    let branches: Awaited<ReturnType<typeof getBranches>> = [];
    let selectedBranchId: string | null = null;
    const isAdminRole = role === 'ADMIN';

    if (isAdminRole && tenantId) {
        try {
            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { multiBranchEnabled: true },
            });
            if (tenant?.multiBranchEnabled) {
                [branches, selectedBranchId] = await Promise.all([
                    getBranches(),
                    getSelectedBranchId(),
                ]);
            }
        } catch {
            // DB unreachable (offline) — render header without branch selector
        }
    }

    return (
        <header className="flex h-16 items-center border-b bg-card/80 backdrop-blur-sm px-6 shrink-0 sticky top-0 z-10 gap-4">
            <PageTitle />

            {/* Optional role-specific nav (e.g. CaptainNav) */}
            {children && <div className="flex-1 flex items-center justify-center">{children}</div>}

            <div className="flex items-center gap-3 ms-auto">
                {/* Branch selector for admin/manager */}
                {isAdminRole && branches.length > 1 && (
                    <BranchSelector branches={branches} selectedBranchId={selectedBranchId} />
                )}

                <Button variant="ghost" size="icon" className="relative h-9 w-9" aria-label="الإشعارات">
                    <Bell className="h-4 w-4" />
                </Button>

                <ThemeToggle />

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="gap-2 h-9 px-2 rounded-full">
                            <Avatar className="h-7 w-7">
                                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                                    {initials}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium hidden sm:block">{user?.name ?? 'مستخدم'}</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-semibold">{user?.name ?? 'مستخدم'}</p>
                                <p className="text-xs text-muted-foreground">{user?.email}</p>
                                {user?.role && (
                                    <span className="inline-flex items-center rounded-full bg-accent/20 px-2.5 py-0.5 text-xs font-bold text-accent-foreground border border-accent/30 w-fit mt-1">
                                        {ROLE_LABELS[user.role] ?? user.role}
                                    </span>
                                )}
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <Link href="/dashboard/settings" className="cursor-pointer flex items-center gap-2">
                                <Settings className="h-4 w-4" />
                                الإعدادات
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                            <LogoutButton variant="dropdown" />
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
