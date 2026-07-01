'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard, Store, CreditCard, Settings,
    ClipboardList, Megaphone, TrendingUp, Crown, BarChart3,
    ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
    href: string;
    icon: React.ElementType;
    label: string;
    exact?: boolean;
}

interface NavGroup {
    id: string;
    label: string;
    items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
    {
        id: 'overview',
        label: 'الإدارة العامة',
        items: [
            { href: '/superadmin', icon: LayoutDashboard, label: 'الرئيسية', exact: true },
            { href: '/superadmin/tenants', icon: Store, label: 'المطاعم' },
            { href: '/superadmin/announcements', icon: Megaphone, label: 'الإعلانات' },
        ],
    },
    {
        id: 'billing',
        label: 'الإيرادات والفوترة',
        items: [
            { href: '/superadmin/billing', icon: BarChart3, label: 'لوحة الفوترة' },
            { href: '/superadmin/payments', icon: CreditCard, label: 'المدفوعات' },
            { href: '/superadmin/revenue', icon: TrendingUp, label: 'تقارير الإيرادات' },
            { href: '/superadmin/plans', icon: Crown, label: 'الخطط والأسعار' },
        ],
    },
    {
        id: 'system',
        label: 'النظام',
        items: [
            { href: '/superadmin/audit-log', icon: ClipboardList, label: 'سجل المراجعة' },
            { href: '/superadmin/settings', icon: Settings, label: 'إعدادات النظام' },
        ],
    },
];

export default function SuperAdminSidebar() {
    const pathname = usePathname();
    const [openGroups, setOpenGroups] = useState<Set<string>>(
        new Set(NAV_GROUPS.map(g => g.id)) // all open by default
    );

    const isActive = (item: NavItem) =>
        item.exact ? pathname === item.href : pathname.startsWith(item.href);

    const isGroupActive = (group: NavGroup) => group.items.some(isActive);

    const toggleGroup = (id: string) => {
        setOpenGroups(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    return (
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {NAV_GROUPS.map(group => {
                const isOpen = openGroups.has(group.id);
                const groupActive = isGroupActive(group);

                return (
                    <div key={group.id}>
                        <button
                            onClick={() => toggleGroup(group.id)}
                            className={cn(
                                'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors',
                                groupActive
                                    ? 'text-primary'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            <span className="flex-1 text-right">{group.label}</span>
                            <ChevronDown
                                className={cn(
                                    'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
                                    isOpen && 'rotate-180'
                                )}
                            />
                        </button>

                        {isOpen && (
                            <div className="mt-0.5 space-y-0.5">
                                {group.items.map(({ href, icon: Icon, label, exact }) => {
                                    const active = exact ? pathname === href : pathname.startsWith(href);
                                    return (
                                        <Link
                                            key={href}
                                            href={href}
                                            className={cn(
                                                'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                                                active
                                                    ? 'bg-primary/10 text-primary font-semibold border-r-2 border-primary'
                                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                            )}
                                        >
                                            <Icon className="w-4 h-4 shrink-0" />
                                            {label}
                                        </Link>
                                    );
                                })}
                            </div>
                        )}

                        <div className="my-1 border-b border-border/40" />
                    </div>
                );
            })}
        </nav>
    );
}
