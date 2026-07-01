'use client';

import { useState, useMemo } from 'react';
import TenantCard from '@/components/superadmin/tenant-card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, SlidersHorizontal, LayoutGrid, List } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TenantData {
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
    plan: string;
    subscriptionStatus: string;
    serviceMode: string;
    createdAt: Date;
    trialEndsAt: Date | null;
    currentPeriodEnd: Date | null;
    adminName: string;
    adminEmail: string;
    ordersCount: number;
    menuItemsCount: number;
    usersCount: number;
    aiDailyLimit: number;
}

export default function TenantsClientPage({ tenants }: { tenants: TenantData[] }) {
    const [search, setSearch] = useState('');
    const [planFilter, setPlanFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [modeFilter, setModeFilter] = useState('ALL');
    const [aiFilter, setAiFilter] = useState('ALL');
    const [sortBy, setSortBy] = useState('newest');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showFilters, setShowFilters] = useState(false);

    const filtered = useMemo(() => {
        let result = tenants;

        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(t =>
                t.name.toLowerCase().includes(q) ||
                t.slug.toLowerCase().includes(q) ||
                t.adminEmail.toLowerCase().includes(q)
            );
        }

        if (planFilter !== 'ALL') result = result.filter(t => t.plan === planFilter);

        if (statusFilter !== 'ALL') {
            if (statusFilter === 'ACTIVE') result = result.filter(t => t.isActive && t.subscriptionStatus === 'ACTIVE');
            else if (statusFilter === 'SUSPENDED') result = result.filter(t => !t.isActive);
            else result = result.filter(t => t.subscriptionStatus === statusFilter);
        }

        if (modeFilter !== 'ALL') result = result.filter(t => t.serviceMode === modeFilter);

        if (aiFilter === 'LIMITED') result = result.filter(t => t.aiDailyLimit > 0);
        else if (aiFilter === 'UNLIMITED') result = result.filter(t => t.aiDailyLimit === 0);

        if (sortBy === 'newest') result = [...result].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        else if (sortBy === 'oldest') result = [...result].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        else if (sortBy === 'orders') result = [...result].sort((a, b) => b.ordersCount - a.ordersCount);
        else if (sortBy === 'name') result = [...result].sort((a, b) => a.name.localeCompare(b.name, 'ar'));
        else if (sortBy === 'ai_limit') result = [...result].sort((a, b) => b.aiDailyLimit - a.aiDailyLimit);

        return result;
    }, [tenants, search, planFilter, statusFilter, modeFilter, aiFilter, sortBy]);

    const activeFiltersCount = [
        planFilter !== 'ALL',
        statusFilter !== 'ALL',
        modeFilter !== 'ALL',
        aiFilter !== 'ALL',
    ].filter(Boolean).length;

    return (
        <div className="space-y-4">
            {/* Search + filter toggle */}
            <div className="flex gap-3 items-center">
                <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder="ابحث بالاسم أو الـ slug أو البريد..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pr-9 h-10"
                        dir="rtl"
                    />
                </div>
                <Button
                    variant={showFilters || activeFiltersCount > 0 ? 'default' : 'outline'}
                    size="icon"
                    className="h-10 w-10 shrink-0 relative"
                    onClick={() => setShowFilters(v => !v)}
                    title="فلاتر"
                >
                    <SlidersHorizontal className="w-4 h-4" />
                    {activeFiltersCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                            {activeFiltersCount}
                        </span>
                    )}
                </Button>
                <div className="flex border rounded-lg overflow-hidden shrink-0">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={cn('p-2.5 transition-colors', viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
                        title="شبكة"
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={cn('p-2.5 transition-colors', viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
                        title="قائمة"
                    >
                        <List className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Filters panel */}
            {showFilters && (
                <div className="bg-card border rounded-xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-muted-foreground">فلترة وترتيب</p>
                        {activeFiltersCount > 0 && (
                            <button
                                onClick={() => { setPlanFilter('ALL'); setStatusFilter('ALL'); setModeFilter('ALL'); setAiFilter('ALL'); }}
                                className="text-xs text-destructive hover:underline"
                            >
                                مسح الفلاتر
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                        <Select value={planFilter} onValueChange={setPlanFilter}>
                            <SelectTrigger className="text-sm h-9">
                                <SelectValue placeholder="الخطة" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">كل الخطط</SelectItem>
                                <SelectItem value="TRIAL">TRIAL</SelectItem>
                                <SelectItem value="BASIC">BASIC</SelectItem>
                                <SelectItem value="PRO">PRO</SelectItem>
                                <SelectItem value="ENTERPRISE">ENTERPRISE</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="text-sm h-9">
                                <SelectValue placeholder="الحالة" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">كل الحالات</SelectItem>
                                <SelectItem value="ACTIVE">نشط</SelectItem>
                                <SelectItem value="TRIAL">تجريبي</SelectItem>
                                <SelectItem value="SUSPENDED">موقوف</SelectItem>
                                <SelectItem value="PAST_DUE">متأخر</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={modeFilter} onValueChange={setModeFilter}>
                            <SelectTrigger className="text-sm h-9">
                                <SelectValue placeholder="نظام الخدمة" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">كل الأنظمة</SelectItem>
                                <SelectItem value="TABLE_SERVICE">خدمة طاولات</SelectItem>
                                <SelectItem value="QUICK_SERVICE">خدمة سريعة</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={aiFilter} onValueChange={setAiFilter}>
                            <SelectTrigger className="text-sm h-9">
                                <SelectValue placeholder="المساعد الذكي" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">كل الحدود</SelectItem>
                                <SelectItem value="LIMITED">محدود</SelectItem>
                                <SelectItem value="UNLIMITED">غير محدود</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={sortBy} onValueChange={setSortBy}>
                            <SelectTrigger className="text-sm h-9">
                                <SelectValue placeholder="ترتيب" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="newest">الأحدث أولاً</SelectItem>
                                <SelectItem value="oldest">الأقدم أولاً</SelectItem>
                                <SelectItem value="orders">حسب الطلبات</SelectItem>
                                <SelectItem value="name">حسب الاسم</SelectItem>
                                <SelectItem value="ai_limit">حسب حد الذكاء</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            {/* Results count */}
            <p className="text-xs text-muted-foreground">
                عرض <span className="font-semibold text-foreground">{filtered.length}</span> من {tenants.length} مطعم
            </p>

            {/* Cards */}
            {filtered.length === 0 ? (
                <div className="text-center text-muted-foreground py-20 bg-card rounded-2xl border border-dashed">
                    <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="text-base font-medium">لا توجد نتائج مطابقة</p>
                    <p className="text-sm mt-1 opacity-70">جرّب تغيير الفلاتر أو مصطلح البحث</p>
                </div>
            ) : (
                <div className={cn(
                    viewMode === 'grid'
                        ? 'grid md:grid-cols-2 xl:grid-cols-3 gap-4'
                        : 'flex flex-col gap-3'
                )}>
                    {filtered.map(tenant => (
                        <TenantCard key={tenant.id} tenant={tenant} viewMode={viewMode} />
                    ))}
                </div>
            )}
        </div>
    );
}
