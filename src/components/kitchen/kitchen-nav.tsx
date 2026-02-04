'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { UtensilsCrossed, ScrollText, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

export function KitchenNav() {
    const pathname = usePathname();

    const links = [
        {
            href: '/kitchen',
            label: 'الطلبات الحالية',
            icon: LayoutDashboard,
            exact: true
        },
        {
            href: '/kitchen/recipes',
            label: 'الوصفات',
            icon: ScrollText
        },
        {
            href: '/kitchen/menu-items',
            label: 'أصناف الطعام',
            icon: UtensilsCrossed
        },
        {
            href: '/kitchen/categories',
            label: 'الأقسام',
            icon: LayoutDashboard
        }
    ];

    return (
        <nav className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
            {links.map((link) => {
                const isActive = link.exact
                    ? pathname === link.href
                    : pathname.startsWith(link.href);

                return (
                    <Link key={link.href} href={link.href}>
                        <Button
                            variant={isActive ? "secondary" : "ghost"}
                            size="sm"
                            className={cn(
                                "gap-2 transition-all active:scale-95",
                                isActive && "bg-background shadow-sm text-primary hover:bg-background"
                            )}
                        >
                            <link.icon className="w-4 h-4" />
                            {link.label}
                        </Button>
                    </Link>
                );
            })}
        </nav>
    );
}
