'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import {
    LayoutDashboard,
    Armchair,
    Truck,
    BarChart3,
    Users,
    Settings,
    CalendarDays,
    LogOut,
    DollarSign,
    UtensilsCrossed,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/actions/auth';

// This would ideally come from the user's session
// For now, we'll show all links, or we could pass the role as a prop
interface SidebarProps {
    userRole?: string; // We'll implement role-based filtering later
}

// Define links with allowed roles
const links = [
    { name: 'لوحة التحكم', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER'] },
    { name: 'الطاولات', href: '/dashboard/tables', icon: Armchair, roles: ['ADMIN', 'MANAGER'] },
    { name: 'الكاشير', href: '/cashier', icon: DollarSign, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
    { name: 'الكابتن', href: '/captain', icon: Users, roles: ['ADMIN', 'MANAGER', 'CAPTAIN'] },
    { name: 'التوصيل', href: '/delivery', icon: Truck, roles: ['ADMIN', 'MANAGER', 'DELIVERY_MANAGER'] },
    { name: 'المطبخ', href: '/kitchen', icon: UtensilsCrossed, roles: ['ADMIN', 'MANAGER', 'CHEF'] },
    { name: 'الحجوزات', href: '/dashboard/reservations', icon: CalendarDays, roles: ['ADMIN', 'MANAGER'] },
    { name: 'التقارير', href: '/dashboard/finance', icon: BarChart3, roles: ['ADMIN', 'MANAGER'] },
    { name: 'الموظفين', href: '/dashboard/admin?tab=users', icon: Users, roles: ['ADMIN', 'MANAGER'] },
    { name: 'الإعدادات', href: '/dashboard/admin?tab=settings', icon: Settings, roles: ['ADMIN', 'MANAGER'] },
];

export default function Sidebar({ userRole = 'GUEST' }: SidebarProps) {
    const pathname = usePathname();

    // Filter links based on role
    const filteredLinks = links.filter(link =>
        link.roles.includes(userRole)
    );

    return (
        <div className="flex bg-gray-50/40 border-r h-full flex-col w-64">
            <div className="p-6">
                <h1 className="text-2xl font-bold tracking-tighter text-gray-900">RestoMgmt</h1>
            </div>
            <div className="flex-1 px-4 py-2 space-y-2 overflow-y-auto">
                {filteredLinks.map((link) => {
                    const LinkIcon = link.icon;
                    return (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:text-gray-900 shrink-0',
                                pathname === link.href || pathname.startsWith(link.href)
                                    ? 'bg-gray-200 text-gray-900'
                                    : 'text-gray-500 hover:bg-gray-100'
                            )}
                        >
                            <LinkIcon className="h-4 w-4 shrink-0" />
                            {link.name}
                        </Link>
                    );
                })}
            </div>
            <div className="p-4 border-t">
                <form action={async () => {
                    await signOut();
                }}>
                    <Button variant="ghost" className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50">
                        <LogOut className="h-4 w-4" />
                        تسجيل الخروج
                    </Button>
                </form>
            </div>
        </div>
    );
}
