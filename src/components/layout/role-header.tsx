'use client';

import { UserNav } from "@/components/layout/user-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { Session } from "next-auth";

interface RoleHeaderProps {
    title: string;
    session: Session | null;
    children?: React.ReactNode;
}

export function RoleHeader({ title, session, children }: RoleHeaderProps) {
    const canAccessDashboard = ['ADMIN', 'MANAGER'].includes(session?.user?.role ?? '');

    return (
        <div className="bg-card border-b px-6 py-3 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-6">
                <div className="font-bold text-xl">{title}</div>
                {children}
            </div>
            <div className="flex items-center gap-2">
                {canAccessDashboard && (
                    <Link href="/dashboard">
                        <Button variant="outline" size="sm" className="gap-2">
                            <LayoutDashboard className="w-4 h-4" />
                            لوحة التحكم
                        </Button>
                    </Link>
                )}
                <ThemeToggle />
                <UserNav session={session} />
            </div>
        </div>
    );
}
