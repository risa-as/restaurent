'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

export function InventorySidebar() {
    const pathname = usePathname();

    const links = [
        { href: '/inventory', label: 'اللوحة الرئيسية', icon: LayoutDashboard },
        { href: '/inventory/stock', label: 'المخزون', icon: Package },
    ];

    return (
        <aside className="w-64 bg-card border-l h-full shrink-0 flex flex-col">
            <div className="p-6">
                <h2 className="text-xl font-black text-primary">إدارة المخزن</h2>
            </div>
            <nav className="flex-1 px-4 space-y-2">
                {links.map(link => {
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors",
                                isActive
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                        >
                            <link.icon className="w-5 h-5" />
                            {link.label}
                        </Link>
                    )
                })}
            </nav>
        </aside>
    );
}
