'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    Truck,
    Banknote,
    FileSpreadsheet
} from 'lucide-react';

const routes = [
    {
        label: 'التقارير المالية',
        icon: FileSpreadsheet,
        href: '/accountant/reports',
        color: "text-sky-500",
    },
    {
        label: 'تصفيات الكاشير',
        icon: Banknote,
        href: '/accountant/cashier',
        color: "text-emerald-500",
    },
    {
        label: 'سجل الكاشير',
        icon: FileSpreadsheet,
        href: '/accountant/cashier/history',
        color: "text-emerald-700",
    },
    {
        label: 'تصفيات التوصيل',
        icon: Truck,
        href: '/accountant/delivery',
        color: "text-violet-500",
    },
    {
        label: 'سجل التوصيل',
        icon: FileSpreadsheet,
        href: '/accountant/delivery/history',
        color: "text-violet-700",
    },
];

export function AccountantSidebar() {
    const pathname = usePathname();

    return (
        <div className="space-y-4 py-4 flex flex-col h-full bg-[#111827] text-white">
            <div className="px-3 py-2 flex-1">
                <Link href="/accountant/reports" className="flex items-center pl-3 mb-14">
                    <h1 className="text-2xl font-bold">المحاسب</h1>
                </Link>
                <div className="space-y-1">
                    {routes.map((route) => (
                        <Link
                            key={route.href}
                            href={route.href}
                            className={cn(
                                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-white hover:bg-white/10 rounded-lg transition",
                                pathname === route.href ? "text-white bg-white/10" : "text-zinc-400",
                            )}
                        >
                            <div className="flex items-center flex-1">
                                <route.icon className={cn("h-5 w-5 ml-3", route.color)} />
                                {route.label}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
