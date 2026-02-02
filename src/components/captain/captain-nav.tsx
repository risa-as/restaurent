'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Armchair, UtensilsCrossed, History } from 'lucide-react';

export function CaptainNav() {
    const pathname = usePathname();

    const links = [
        {
            href: '/captain',
            label: 'طلب جديد',
            icon: LayoutDashboard,
            active: pathname === '/captain'
        },
        {
            href: '/captain/tables',
            label: 'الطاولات',
            icon: Armchair,
            active: pathname === '/captain/tables'
        },
        {
            href: '/captain/orders',
            label: 'حالة الطلبات',
            icon: UtensilsCrossed,
            active: pathname === '/captain/orders'
        },
        {
            href: '/captain/history',
            label: 'الأرشيف',
            icon: History,
            active: pathname === '/captain/history'
        }
    ];

    return (
        <nav className="flex items-center gap-2">
            {links.map(link => (
                <Link key={link.href} href={link.href}>
                    <Button
                        variant={link.active ? 'default' : 'ghost'}
                        size="sm"
                        className={cn(
                            "gap-2",
                            link.active && "bg-primary text-primary-foreground"
                        )}
                    >
                        <link.icon className="w-4 h-4" />
                        {link.label}
                    </Button>
                </Link>
            ))}
        </nav>
    );
}
