import { getMenuItems, getCategories } from '@/lib/actions/menu';
import { getBranches, getSelectedBranchId } from '@/lib/actions/branches';
import { getModifierGroups } from '@/lib/actions/modifiers';
import { getStations } from '@/lib/actions/kitchen-stations';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MenuItemActions } from '@/components/menu/menu-item-actions';
import { Badge } from '@/components/ui/badge';
import { Search, UtensilsCrossed, LayoutGrid, TrendingUp, BookOpen, ChefHat } from 'lucide-react';
import Link from 'next/link';
import { AddItemSheet } from '@/components/menu/add-item-sheet';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { CategoryManager } from '@/components/menu/category-manager';
import { formatNum } from '@/lib/number-locale';
import { getNumberLocale } from '@/lib/utils/get-number-locale';

export const metadata = {
    title: 'إدارة القائمة',
};

export const dynamic = 'force-dynamic';

export default async function MenuPage({
    searchParams,
}: {
    searchParams?: { query?: string };
}) {
    const session = await auth();
    const tenantId = (session?.user as any)?.tenantId as string | undefined;
    const query = searchParams?.query || '';

    const [menuItems, categories, branches, selectedBranchId, allModifierGroups, stations, locale] = await Promise.all([
        getMenuItems(query),
        getCategories(),
        (async () => {
            if (!tenantId) return [];
            const tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { multiBranchEnabled: true },
            });
            return tenant?.multiBranchEnabled ? getBranches() : [];
        })(),
        getSelectedBranchId(),
        tenantId ? getModifierGroups(tenantId) : Promise.resolve([]),
        getStations(),
        getNumberLocale(),
    ]);

    return (
        <div className="space-y-6" dir="rtl">
            <PageHeader
                title="إدارة القائمة"
                subtitle="تنظيم الأصناف والأقسام ومجموعات التعديل ضمن واجهة أوضح وأسهل للإدارة"
                breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'القائمة' }]}
            />

            <Tabs defaultValue="items" className="space-y-4">
                <div className="rounded-2xl border border-border/60 bg-card/70 shadow-sm backdrop-blur-sm">
                    <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl bg-transparent p-2">
                        <TabsTrigger value="items" className="h-11 rounded-xl text-sm font-semibold data-[state=active]:shadow-sm">
                            <UtensilsCrossed className="ml-2 h-4 w-4" />
                            الأصناف
                            <Badge variant="secondary" className="mr-2 h-5 px-1.5 text-[10px]">{menuItems.length}</Badge>
                        </TabsTrigger>
                        <TabsTrigger value="categories" className="h-11 rounded-xl text-sm font-semibold data-[state=active]:shadow-sm">
                            <LayoutGrid className="ml-2 h-4 w-4" />
                            الأقسام
                            <Badge variant="secondary" className="mr-2 h-5 px-1.5 text-[10px]">{categories.length}</Badge>
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* ── تبويب الأصناف ── */}
                <TabsContent value="items" className="mt-0">
                    <div className="rounded-[26px] border border-border/60 bg-card shadow-sm overflow-hidden">
                        {/* Header */}
                        <div className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between border-b border-border/50">
                            <div>
                                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <UtensilsCrossed className="w-5 h-5 text-primary" />
                                    الأصناف
                                </h2>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    {menuItems.length} صنف · السعر والتكلفة والربح التقديري
                                </p>
                            </div>
                            <div className="flex gap-3 items-center">
                                <div className="relative min-w-[260px]">
                                    <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <form>
                                        <Input
                                            name="query"
                                            placeholder="ابحث في القائمة..."
                                            defaultValue={query}
                                            className="h-10 rounded-xl pr-10 text-right"
                                        />
                                    </form>
                                </div>
                                <AddItemSheet categories={categories} branches={branches} defaultBranchId={selectedBranchId} />
                            </div>
                        </div>

                        {/* Table */}
                        {menuItems.length === 0 ? (
                            <div className="p-6">
                                <EmptyState icon={UtensilsCrossed} title="القائمة فارغة" description="ابدأ بإضافة أصناف وأقسام جديدة لتظهر هنا" />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm" style={{ tableLayout: 'fixed', borderCollapse: 'collapse' }} dir="rtl">
                                    <colgroup>
                                        <col style={{ width: '50px' }} />
                                        <col style={{ width: '60px' }} />
                                        <col style={{ width: '18%' }} />
                                        <col style={{ width: '12%' }} />
                                        <col style={{ width: '13%' }} />
                                        <col style={{ width: '13%' }} />
                                        <col style={{ width: '22%' }} />
                                        <col style={{ width: '100px' }} />
                                    </colgroup>
                                    <thead>
                                        <tr className="bg-muted/50 border-b border-border/60">
                                            <th className="px-3 py-3.5 text-center text-xs font-semibold text-muted-foreground">#</th>
                                            <th className="px-3 py-3.5 text-center text-xs font-semibold text-muted-foreground">صورة</th>
                                            <th className="px-4 py-3.5 text-center text-xs font-semibold text-muted-foreground">الصنف</th>
                                            <th className="px-4 py-3.5 text-center text-xs font-semibold text-muted-foreground">القسم</th>
                                            <th className="px-4 py-3.5 text-center text-xs font-semibold text-muted-foreground">سعر البيع</th>
                                            <th className="px-4 py-3.5 text-center text-xs font-semibold text-muted-foreground">
                                                <span className="flex items-center justify-center gap-1">
                                                    <TrendingUp className="w-3 h-3 text-green-500" />
                                                    الربح التقديري
                                                </span>
                                            </th>
                                            <th className="px-4 py-3.5 text-center text-xs font-semibold text-muted-foreground">الوصفة</th>
                                            <th className="px-4 py-3.5 text-center text-xs font-semibold text-muted-foreground">إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {menuItems.map((item, idx) => {
                                            const recipeCost = item.recipe.reduce(
                                                (sum, r) => sum + (r.quantity * r.material.costPerUnit), 0
                                            );
                                            const profit = item.price - recipeCost;
                                            const margin = item.price > 0 ? Math.round((profit / item.price) * 100) : 0;
                                            const hasRecipe = item.recipe.length > 0;

                                            return (
                                                <tr
                                                    key={item.id}
                                                    className={`border-b border-border/40 transition-colors hover:bg-muted/30 ${idx % 2 !== 0 ? 'bg-muted/10' : ''}`}
                                                >
                                                    {/* الرقم التسلسلي */}
                                                    <td className="px-3 py-3 text-center">
                                                        <span className="text-xs font-mono text-muted-foreground">{idx + 1}</span>
                                                    </td>

                                                    {/* الصورة */}
                                                    <td className="px-3 py-3 text-center">
                                                        <div className="h-11 w-11 overflow-hidden rounded-xl border border-border/60 bg-muted shadow-sm mx-auto">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img
                                                                src={item.image || 'https://placehold.co/100x100/e2e8f0/64748b?text=img'}
                                                                alt={item.name}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        </div>
                                                    </td>

                                                    {/* الاسم */}
                                                    <td className="px-4 py-3 text-center">
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className="font-semibold text-foreground leading-tight">{item.name}</span>
                                                            {!item.isAvailable && (
                                                                <Badge variant="destructive" className="w-fit text-[10px] px-1.5 py-0 h-4">
                                                                    غير متوفر
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </td>

                                                    {/* القسم */}
                                                    <td className="px-4 py-3 text-center">
                                                        <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs font-medium">
                                                            {item.category.name}
                                                        </Badge>
                                                    </td>

                                                    {/* سعر البيع */}
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="font-bold font-mono text-foreground">
                                                            {formatNum(item.price, locale)}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground mr-1">د.ع</span>
                                                    </td>

                                                    {/* الربح التقديري */}
                                                    <td className="px-4 py-3 text-center">
                                                        {hasRecipe ? (
                                                            <div className="space-y-1.5 flex flex-col items-center">
                                                                <div className="flex items-center gap-1">
                                                                    <span className={`font-bold font-mono text-sm ${profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                                                        {formatNum(profit, locale)}
                                                                    </span>
                                                                    <span className="text-[10px] text-muted-foreground">د.ع</span>
                                                                </div>
                                                                {/* شريط هامش الربح */}
                                                                <div className="flex items-center gap-1.5">
                                                                    <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                                                                        <div
                                                                            className={`h-full rounded-full ${margin >= 60 ? 'bg-green-500' : margin >= 35 ? 'bg-amber-500' : 'bg-red-400'}`}
                                                                            style={{ width: `${Math.min(Math.max(margin, 0), 100)}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className={`text-[10px] font-semibold ${margin >= 60 ? 'text-green-600' : margin >= 35 ? 'text-amber-600' : 'text-red-500'}`}>
                                                                        {margin}%
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground opacity-40 italic">لا وصفة</span>
                                                        )}
                                                    </td>

                                                    {/* الوصفة */}
                                                    <td className="px-4 py-3 text-center">
                                                        {hasRecipe ? (
                                                            <Link
                                                                href={`/kitchen/recipes?itemId=${item.id}`}
                                                                className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors dark:bg-green-950/30 dark:text-green-400 dark:hover:bg-green-950/50"
                                                            >
                                                                <ChefHat className="w-3 h-3" />
                                                                {item.recipe.length} مكون
                                                            </Link>
                                                        ) : (
                                                            <Link
                                                                href={`/kitchen/recipes?itemId=${item.id}`}
                                                                className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-600 hover:bg-amber-100 transition-colors dark:border-amber-700/50 dark:bg-amber-950/20 dark:text-amber-400"
                                                            >
                                                                <BookOpen className="w-3 h-3" />
                                                                إضافة وصفة
                                                            </Link>
                                                        )}
                                                    </td>

                                                    {/* الإجراءات */}
                                                    <td className="px-4 py-3 text-left">
                                                        <MenuItemActions
                                                            item={item}
                                                            categories={categories}
                                                            branches={branches}
                                                            defaultBranchId={selectedBranchId}
                                                            tenantId={tenantId}
                                                            allModifierGroups={allModifierGroups as any}
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </TabsContent>

                {/* ── تبويب الأقسام ── */}
                <TabsContent value="categories" className="mt-0">
                    <CategoryManager
                        categories={categories}
                        branches={branches}
                        defaultBranchId={selectedBranchId}
                        stations={stations.map(s => ({ id: s.id, name: (s as any).nameAr || s.name }))}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
