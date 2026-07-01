import { getDashboardStats, getSalesTrends, getTopSellingItems, getEmployeePerformance } from '@/lib/actions/reports';
import { SalesChart } from '@/components/reports/sales-chart';
import { TopItems } from '@/components/reports/top-items';
import { Card, CardContent } from '@/components/ui/card';
import { StatCard } from '@/components/ui/stat-card';
import { PageHeader } from '@/components/ui/page-header';
import { Activity, DollarSign, Users, AlertCircle, Armchair, Truck } from 'lucide-react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getPendingVoidRequests } from '@/lib/actions/void-requests';
import { VoidRequestManager } from '@/components/finance/void-request-manager';
import { formatNum } from '@/lib/number-locale';
import { getNumberLocale } from '@/lib/utils/get-number-locale';

export const metadata = {
    title: 'لوحة التحكم',
};

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const session = await auth();
    const userRole = session?.user?.role;

    if (userRole === 'SUPER_ADMIN') {
        redirect('/superadmin');
    } else if (userRole === 'WAITER') {
        redirect('/waiter');
    } else if (userRole === 'CHEF') {
        redirect('/kitchen');
    } else if (userRole === 'DRIVER' || userRole === 'DELIVERY_MANAGER') {
        redirect('/delivery');
    } else if (userRole === 'CASHIER') {
        redirect('/cashier');
    } else if (userRole === 'CAPTAIN') {
        redirect('/captain');
    }

    const user = session?.user as { branchId?: string; tenantId?: string } | undefined;
    const isAdminOrManager = userRole === 'ADMIN' || userRole === 'MANAGER';

    const [stats, salesData, topItems, employees, voidRequests, locale] = await Promise.all([
        getDashboardStats(),
        getSalesTrends(),
        getTopSellingItems(),
        getEmployeePerformance(),
        isAdminOrManager ? getPendingVoidRequests() : Promise.resolve([]),
        getNumberLocale(),
    ]);

    const { tableStats, deliveryStats } = stats;
    const tableOccupiedPct = tableStats.total > 0
        ? Math.round((tableStats.occupied / tableStats.total) * 100)
        : 0;
    const activeDeliveries = deliveryStats.pending + deliveryStats.assigned + deliveryStats.onTheWay;

    return (
        <div className="space-y-6">
            <PageHeader title="لوحة المعلومات" subtitle="نظرة عامة على أداء المطعم اليوم" />

            {/* Pending Void Requests — ADMIN/MANAGER only */}
            {isAdminOrManager && user?.tenantId && voidRequests.length > 0 && (
                <VoidRequestManager
                    initialRequests={voidRequests}
                    branchId={user.branchId}
                    tenantId={user.tenantId}
                />
            )}

            {/* KPI Row 1 — Financial & Operational */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    label="الإيرادات اليومية"
                    value={`${formatNum(stats.revenueToday, locale, { maximumFractionDigits: 0 })} د.ع`}
                    icon={DollarSign}
                />
                <StatCard
                    label="الطلبات النشطة"
                    value={stats.activeOrders}
                    icon={Activity}
                />
                <StatCard
                    label="تنبيهات المخزون"
                    value={stats.lowStockCount}
                    icon={AlertCircle}
                    className={stats.lowStockCount > 0 ? 'border-destructive/40' : ''}
                />
                <StatCard
                    label="الأكثر أداءً"
                    value={employees[0]?.name || '—'}
                    icon={Users}
                />
            </div>

            {/* KPI Row 2 — Operational (Tables + Delivery) */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Table Occupancy */}
                <Card className="relative overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">إشغال الطاولات</p>
                                <p className="text-3xl font-black text-foreground tabular-nums">
                                    {tableStats.occupied}
                                    <span className="text-lg font-medium text-muted-foreground">/{tableStats.total}</span>
                                </p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-[hsl(var(--chart-2)/0.15)] shrink-0">
                                <Armchair className="h-5 w-5 text-[hsl(var(--chart-2))]" />
                            </div>
                        </div>
                        {/* Progress bar */}
                        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                            <div
                                className="h-full rounded-full bg-[hsl(var(--chart-2))] transition-all"
                                style={{ width: `${tableOccupiedPct}%` }}
                            />
                        </div>
                        <div className="flex gap-4 mt-2 text-xs">
                            <span className="text-green-600 font-medium">متاح: {tableStats.available}</span>
                            <span className="text-orange-500 font-medium">محجوز: {tableStats.reserved}</span>
                            <span className="text-yellow-600 font-medium">تنظيف: {tableStats.dirty}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Delivery Pipeline */}
                <Card className="relative overflow-hidden">
                    <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-3">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">طلبات التوصيل النشطة</p>
                                <p className={`text-3xl font-black tabular-nums ${activeDeliveries > 0 ? 'text-primary' : 'text-muted-foreground'}`}>
                                    {activeDeliveries}
                                </p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-primary/10 shrink-0">
                                <Truck className="h-5 w-5 text-primary" />
                            </div>
                        </div>
                        <div className="flex gap-6 text-xs">
                            <div className="flex flex-col items-center gap-0.5">
                                <span className="font-black text-lg tabular-nums">{deliveryStats.pending}</span>
                                <span className="text-muted-foreground">معلق</span>
                            </div>
                            <div className="flex flex-col items-center gap-0.5">
                                <span className="font-black text-lg tabular-nums">{deliveryStats.assigned}</span>
                                <span className="text-muted-foreground">مُعيَّن</span>
                            </div>
                            <div className="flex flex-col items-center gap-0.5">
                                <span className="font-black text-lg tabular-nums">{deliveryStats.onTheWay}</span>
                                <span className="text-muted-foreground">في الطريق</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                <SalesChart data={salesData} />
                <TopItems items={topItems} />
            </div>
        </div>
    );
}
