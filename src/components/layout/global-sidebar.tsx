'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Armchair,
    Truck,
    BarChart3,
    Users,
    Settings,
    CalendarDays,
    DollarSign,
    UtensilsCrossed,
    ShoppingBag,
    Warehouse,
    ChevronRight,
    ChevronLeft,
    ChevronDown,
    Utensils,
    Lock,
    GitBranch,
    Tag,
    Package,
    ClipboardList,
    CreditCard,
    LineChart,
    UserCircle,
    Palette,
    QrCode,
    Receipt,
    ShoppingCart,
    CalendarRange,
    Star,
    BarChart2,
    Layers,
    FileText,
    Percent,
    ScanSearch,
    Bell,
    Crown,
    Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LogoutButton } from '@/components/layout/logout-button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface NavItem {
    name: string;
    href: string;
    icon: React.ElementType;
    roles: string[];
    badge?: string;
    planModule?: string;
    planTier?: 'BASIC' | 'PRO' | 'ENTERPRISE';
    exact?: boolean;
}

interface NavGroup {
    id: string;
    name: string;
    icon: React.ElementType;
    roles: string[]; // roles that can see this group at all
    items: NavItem[];
    planModule?: string; // if group itself requires a module
}

interface GlobalSidebarProps {
    userRole?: string;
    userName?: string;
    userEmail?: string;
    lowStockBadge?: number;
    serviceMode?: string;
    planModules?: Record<string, boolean>;
    restaurantName?: string;
    logoUrl?: string;
    taxRate?: number;
}

const NAV_GROUPS: NavGroup[] = [
    // ── الرئيسية ────────────────────────────────────────────────────────────
    {
        id: 'home',
        name: 'الرئيسية',
        icon: LayoutDashboard,
        roles: ['ADMIN', 'MANAGER'],
        items: [
            { name: 'لوحة التحكم', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER'], exact: true },
        ],
    },

    // ── العمليات اليومية ────────────────────────────────────────────────────
    {
        id: 'operations',
        name: 'العمليات اليومية',
        icon: Armchair,
        roles: ['ADMIN', 'MANAGER', 'CAPTAIN', 'CASHIER', 'WAITER'],
        items: [
            { name: 'الطاولات', href: '/dashboard/tables', icon: Armchair, roles: ['ADMIN', 'MANAGER', 'CAPTAIN'] },
            { name: 'الكاشير (POS)', href: '/cashier', icon: DollarSign, roles: ['ADMIN', 'MANAGER', 'CASHIER'] },
            { name: 'الكابتن', href: '/captain', icon: Users, roles: ['ADMIN', 'MANAGER', 'CAPTAIN'] },
            { name: 'النادل', href: '/waiter', icon: ShoppingBag, roles: ['ADMIN', 'MANAGER', 'WAITER'] },
            { name: 'الحجوزات', href: '/dashboard/reservations', icon: CalendarDays, roles: ['ADMIN', 'MANAGER'], planModule: 'reservations', planTier: 'BASIC' },
        ],
    },

    // ── المطبخ ──────────────────────────────────────────────────────────────
    {
        id: 'kitchen',
        name: 'المطبخ',
        icon: UtensilsCrossed,
        roles: ['ADMIN', 'MANAGER', 'CHEF'],
        items: [
            { name: 'لوحة المطبخ', href: '/kitchen', icon: ClipboardList, roles: ['ADMIN', 'MANAGER', 'CHEF'], exact: true },
            { name: 'الوصفات', href: '/kitchen/recipes', icon: Package, roles: ['ADMIN', 'MANAGER', 'CHEF'] },
        ],
    },

    // ── قائمة الطعام ────────────────────────────────────────────────────────
    {
        id: 'menu',
        name: 'قائمة الطعام',
        icon: Utensils,
        roles: ['ADMIN', 'MANAGER'],
        items: [
            { name: 'إدارة القائمة', href: '/dashboard/menu', icon: Utensils, roles: ['ADMIN', 'MANAGER'], exact: true },
            { name: 'الخيارات والإضافات', href: '/dashboard/menu/modifiers', icon: Layers, roles: ['ADMIN', 'MANAGER'] },
            { name: 'العروض والخصومات', href: '/dashboard/menu/offers', icon: Tag, roles: ['ADMIN', 'MANAGER'], planModule: 'offers', planTier: 'BASIC' },
            { name: 'تحليل الربحية', href: '/dashboard/menu/analysis', icon: LineChart, roles: ['ADMIN', 'MANAGER'] },
        ],
    },

    // ── التوصيل ─────────────────────────────────────────────────────────────
    {
        id: 'delivery',
        name: 'التوصيل',
        icon: Truck,
        roles: ['ADMIN', 'MANAGER', 'DELIVERY_MANAGER', 'DRIVER'],
        planModule: 'delivery',
        items: [
            { name: 'لوحة التوصيل', href: '/delivery', icon: Truck, roles: ['ADMIN', 'MANAGER', 'DELIVERY_MANAGER', 'DRIVER'], planModule: 'delivery', planTier: 'PRO' },
        ],
    },

    // ── المخزون ─────────────────────────────────────────────────────────────
    {
        id: 'inventory',
        name: 'المخزون',
        icon: Warehouse,
        roles: ['ADMIN', 'MANAGER', 'STORE_MANAGER'],
        items: [
            { name: 'لوحة المخزون', href: '/inventory', icon: Warehouse, roles: ['ADMIN', 'MANAGER', 'STORE_MANAGER'], exact: true },
            { name: 'قائمة المخزون', href: '/inventory/stock', icon: Package, roles: ['ADMIN', 'MANAGER', 'STORE_MANAGER'] },
            { name: 'الموردون', href: '/inventory/suppliers', icon: Truck, roles: ['ADMIN', 'MANAGER', 'STORE_MANAGER'], planModule: 'inventory', planTier: 'PRO' },
            { name: 'طلبات الشراء', href: '/inventory/purchase-orders', icon: ClipboardList, roles: ['ADMIN', 'MANAGER', 'STORE_MANAGER'], planModule: 'inventory', planTier: 'PRO' },
        ],
    },

    // ── المحاسب والمالية ────────────────────────────────────────────────────
    {
        id: 'accountant',
        name: 'المحاسب والمالية',
        icon: Receipt,
        roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'],
        items: [
            { name: 'التقارير المالية', href: '/dashboard/accountant/finance', icon: BarChart3, roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] },
            { name: 'تقرير P&L', href: '/dashboard/accountant/pl-report', icon: FileText, roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'], planModule: 'advancedReports', planTier: 'PRO' },
            { name: 'التقرير الضريبي', href: '/dashboard/accountant/tax-report', icon: Percent, roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] },
            { name: 'كشف التناقضات', href: '/dashboard/accountant/discrepancies', icon: ScanSearch, roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'], planModule: 'advancedReports', planTier: 'PRO' },
            { name: 'تقارير موحدة', href: '/dashboard/reports/consolidated', icon: BarChart2, roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'], planModule: 'advancedReports', planTier: 'PRO' },
            { name: 'تصفيات الكاشير', href: '/dashboard/accountant/cashier', icon: DollarSign, roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] },
            { name: 'تصفيات التوصيل', href: '/dashboard/accountant/delivery', icon: Truck, roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] },
            { name: 'أداء السائقين', href: '/dashboard/accountant/drivers', icon: Truck, roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'DELIVERY_MANAGER'], planModule: 'delivery', planTier: 'PRO' },
            { name: 'تحليلات الذكاء الاصطناعي', href: '/dashboard/accountant/analytics', icon: LineChart, roles: ['ADMIN', 'MANAGER'], planModule: 'analytics', planTier: 'PRO' },
            { name: 'التغذية الراجعة', href: '/dashboard/feedback', icon: Star, roles: ['ADMIN', 'MANAGER'] },
            { name: 'التنبيهات الذكية', href: '/dashboard/alerts', icon: Bell, roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT'] },
        ],
    },

    // ── نظام الولاء ─────────────────────────────────────────────────────────
    {
        id: 'loyalty',
        name: 'نظام الولاء',
        icon: UserCircle,
        roles: ['ADMIN', 'MANAGER'],
        items: [
            { name: 'العملاء والنقاط', href: '/dashboard/customers', icon: UserCircle, roles: ['ADMIN', 'MANAGER'], planModule: 'loyalty', planTier: 'PRO' },
        ],
    },

    // ── إدارة الفريق ────────────────────────────────────────────────────────
    {
        id: 'team',
        name: 'إدارة الفريق',
        icon: Users,
        roles: ['ADMIN'],
        items: [
            { name: 'الموظفون', href: '/dashboard/admin', icon: Users, roles: ['ADMIN'] },
        ],
    },

    // ── الإعدادات ───────────────────────────────────────────────────────────
    {
        id: 'settings',
        name: 'الإعدادات',
        icon: Settings,
        roles: ['ADMIN', 'MANAGER'],
        items: [
            { name: 'الإعدادات العامة', href: '/dashboard/settings', icon: Settings, roles: ['ADMIN', 'MANAGER'], exact: true },
            { name: 'الهوية التجارية', href: '/dashboard/settings/branding', icon: Palette, roles: ['ADMIN', 'MANAGER'], planModule: 'customBranding', planTier: 'ENTERPRISE' },
            { name: 'رمز QR', href: '/dashboard/settings/qr', icon: QrCode, roles: ['ADMIN', 'MANAGER'], planModule: 'qrMenu', planTier: 'PRO' },
            { name: 'الأفرع', href: '/dashboard/settings/branches', icon: GitBranch, roles: ['ADMIN'], planModule: 'multiBranch', planTier: 'ENTERPRISE' },
            { name: 'تكامل Talabat', href: '/dashboard/settings/talabat', icon: ShoppingCart, roles: ['ADMIN', 'MANAGER'] },
            { name: 'القوائم الموسمية', href: '/dashboard/settings/seasonal', icon: CalendarRange, roles: ['ADMIN', 'MANAGER'] },
            { name: 'الفوترة والاشتراك', href: '/dashboard/billing', icon: CreditCard, roles: ['ADMIN'] },
        ],
    },
];

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

export function GlobalSidebar({ userRole, userName, userEmail, lowStockBadge, serviceMode, planModules, restaurantName, logoUrl, taxRate }: GlobalSidebarProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
    const pathname = usePathname();

    // Responsive collapse on mobile by default
    useEffect(() => {
        const checkScreen = () => setIsCollapsed(window.innerWidth < 1024);
        checkScreen();
        window.addEventListener('resize', checkScreen);
        return () => window.removeEventListener('resize', checkScreen);
    }, []);

    const isItemActive = (item: NavItem) => {
        const base = item.href.split('?')[0];
        if (item.exact || base === '/dashboard') return pathname === base;
        return pathname.startsWith(base);
    };

    const isGroupActive = (group: NavGroup) =>
        group.items.some(isItemActive);

    // Initialize open groups based on active path
    useEffect(() => {
        const active = NAV_GROUPS
            .filter(isGroupActive)
            .map(g => g.id);
        setOpenGroups(new Set(active.length > 0 ? active : ['home']));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    const toggleGroup = (id: string) => {
        setOpenGroups(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleCollapsed = () => {
        const next = !isCollapsed;
        setIsCollapsed(next);
        localStorage.setItem('sidebar-collapsed', String(next));
    };

    // Filter groups and items by role, service mode, plan modules
    const visibleGroups = NAV_GROUPS.map(group => {
        if (!userRole || !group.roles.includes(userRole)) return null;

        const visibleItems = group.items.filter(item => {
            if (!item.roles.includes(userRole)) return false;
            // Hide captain in QUICK_SERVICE only for non-admin roles
            if (serviceMode === 'QUICK_SERVICE' && item.href === '/captain' && userRole === 'CAPTAIN') return false;
            // Hide tax report when tax rate is explicitly 0
            if (item.href === '/dashboard/accountant/tax-report' && taxRate !== undefined && taxRate === 0) return false;
            return true;
        }).map(item =>
            item.href === '/inventory' && lowStockBadge
                ? { ...item, badge: String(lowStockBadge) }
                : item
        );

        if (visibleItems.length === 0) return null;
        return { ...group, items: visibleItems };
    }).filter(Boolean) as (NavGroup & { items: NavItem[] })[];

    const renderItem = (item: NavItem) => {
        const Icon = item.icon;
        const active = isItemActive(item);
        const isLocked = item.planModule && planModules && planModules[item.planModule] === false;
        const dest = isLocked ? '/dashboard/billing' : item.href;

        const planBadge = isLocked && item.planTier ? (
            item.planTier === 'ENTERPRISE' ? (
                <span className="ms-auto shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white leading-tight">
                    ENT
                </span>
            ) : item.planTier === 'PRO' ? (
                <span className="ms-auto shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-purple-700 text-white leading-tight">
                    PRO
                </span>
            ) : (
                <span className="ms-auto shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-gradient-to-r from-slate-400 to-slate-600 text-white leading-tight">
                    BASIC
                </span>
            )
        ) : null;

        return (
            <Link
                key={item.href + item.name}
                href={dest}
                className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                    isCollapsed && 'justify-center px-0',
                    isLocked
                        ? 'opacity-50 text-muted-foreground cursor-not-allowed'
                        : active
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                )}
            >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!isCollapsed && <span className="truncate flex-1">{item.name}</span>}
                {!isCollapsed && isLocked && !item.planTier && <Lock className="h-3 w-3 ms-auto shrink-0" />}
                {!isCollapsed && planBadge}
                {/* Premium tier marker for AVAILABLE (unlocked) features — with hover tooltip */}
                {!isCollapsed && !isLocked && !item.badge && item.planTier === 'ENTERPRISE' && (
                    <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                            <span className="ms-auto shrink-0 cursor-help"><Crown className="h-3.5 w-3.5 text-amber-500" /></span>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="font-bold">ميزة خطة المؤسسات</TooltipContent>
                    </Tooltip>
                )}
                {!isCollapsed && !isLocked && !item.badge && item.planTier === 'PRO' && (
                    <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                            <span className="ms-auto shrink-0 cursor-help"><Sparkles className="h-3.5 w-3.5 text-purple-500" /></span>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="font-bold">ميزة الخطة الاحترافية</TooltipContent>
                    </Tooltip>
                )}
                {!isCollapsed && !isLocked && item.badge && (
                    <Badge variant="destructive" className="ms-auto text-xs px-1.5 h-4 min-w-[18px] flex items-center justify-center">
                        {item.badge}
                    </Badge>
                )}
            </Link>
        );
    };

    return (
        <>
            {/* Mobile Overlay */}
            {!isCollapsed && (
                <div
                    className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsCollapsed(true)}
                />
            )}

            {/* Sidebar content */}
            <aside
                className={cn(
                    'fixed inset-y-0 right-0 z-50 flex flex-col bg-card border-l shadow-2xl transition-all duration-300 ease-in-out',
                    isCollapsed ? 'w-[80px]' : 'w-[280px]',
                    'lg:static lg:shadow-none shrink-0'
                )}
            >
                {/* Header */}
                <div className="flex h-[72px] shrink-0 items-center justify-between px-4 border-b">
                    {!isCollapsed && (
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            {logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                    src={logoUrl}
                                    alt="logo"
                                    className="w-10 h-10 rounded-lg object-contain shrink-0"
                                />
                            ) : (
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[hsl(246,80%,14%)] shrink-0 shadow-sm overflow-hidden">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src="/logo.png" alt="نظام المطعم" className="w-full h-full object-contain" />
                                </div>
                            )}
                            <div className="overflow-hidden flex-1 min-w-0">
                                <p className="font-bold text-lg leading-tight truncate">{restaurantName || 'نظام المطعم'}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                    {userRole ? ROLE_LABELS[userRole] ?? userRole : ''}
                                </p>
                            </div>
                        </div>
                    )}
                    <button
                        onClick={toggleCollapsed}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border bg-background hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all"
                        aria-label={isCollapsed ? 'توسيع القائمة' : 'طي القائمة'}
                    >
                        {isCollapsed ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-hide">
                    {visibleGroups.map(group => {
                        const GroupIcon = group.icon;
                        const isOpen = openGroups.has(group.id);
                        const groupActive = isGroupActive(group);
                        const isSingleItem = group.items.length === 1;

                        // Collapsed mode: just show icons with tooltip for each item
                        if (isCollapsed) {
                            return group.items.map(item => {
                                const Icon = item.icon;
                                const active = isItemActive(item);
                                const isLocked = item.planModule && planModules && planModules[item.planModule] === false;
                                return (
                                    <Tooltip key={item.href + item.name} delayDuration={0}>
                                        <TooltipTrigger asChild>
                                            <Link
                                                href={isLocked ? '/dashboard/billing' : item.href}
                                                className={cn(
                                                    'relative flex items-center justify-center rounded-lg px-0 py-2.5 transition-all duration-150',
                                                    isLocked
                                                        ? 'opacity-50 text-muted-foreground'
                                                        : active
                                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                                            : 'text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
                                                )}
                                            >
                                                <Icon className="h-[18px] w-[18px] shrink-0" />
                                                {!isLocked && item.planTier === 'ENTERPRISE' && (
                                                    <Crown className="absolute top-1 left-1 h-2.5 w-2.5 text-amber-500" />
                                                )}
                                                {!isLocked && item.planTier === 'PRO' && (
                                                    <Sparkles className="absolute top-1 left-1 h-2.5 w-2.5 text-purple-500" />
                                                )}
                                            </Link>
                                        </TooltipTrigger>
                                        <TooltipContent side="left" className="font-bold">
                                            {item.name}
                                            {!isLocked && item.planTier === 'ENTERPRISE' && (
                                                <span className="block text-[10px] font-normal text-amber-400">ميزة خطة المؤسسات</span>
                                            )}
                                            {!isLocked && item.planTier === 'PRO' && (
                                                <span className="block text-[10px] font-normal text-purple-400">ميزة الخطة الاحترافية</span>
                                            )}
                                        </TooltipContent>
                                    </Tooltip>
                                );
                            });
                        }

                        // Single-item groups — render as a plain link without dropdown
                        if (isSingleItem) {
                            return renderItem(group.items[0]);
                        }

                        // Multi-item groups — render as collapsible section
                        return (
                            <div key={group.id}>
                                <button
                                    onClick={() => toggleGroup(group.id)}
                                    className={cn(
                                        'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-150',
                                        groupActive
                                            ? 'text-primary'
                                            : 'text-foreground hover:bg-secondary hover:text-secondary-foreground'
                                    )}
                                >
                                    <GroupIcon className={cn('h-[18px] w-[18px] shrink-0', groupActive && 'text-primary')} />
                                    <span className="flex-1 text-right truncate">{group.name}</span>
                                    <ChevronDown
                                        className={cn(
                                            'h-4 w-4 shrink-0 transition-transform duration-200 text-muted-foreground',
                                            isOpen && 'rotate-180'
                                        )}
                                    />
                                </button>
                                {isOpen && (
                                    <div className="mt-1 ms-4 ps-3 border-s border-border space-y-0.5">
                                        {group.items.map(renderItem)}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>

                {/* Footer */}
                <div className="mt-auto border-t p-4 bg-muted/20">
                    {!isCollapsed && userEmail && (
                        <div className="mb-3 px-3 py-2 rounded-xl bg-background border shadow-sm">
                            <p className="text-sm font-bold truncate">{userName || 'مستخدم'}</p>
                            <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                        </div>
                    )}
                    <LogoutButton variant={isCollapsed ? 'sidebar-collapsed' : 'sidebar'} />
                </div>
            </aside>
        </>
    );
}
