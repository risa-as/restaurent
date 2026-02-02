import { getDashboardStats, getSalesTrends, getTopSellingItems, getEmployeePerformance } from '@/lib/actions/reports';
import { SalesChart } from '@/components/reports/sales-chart';
import { TopItems } from '@/components/reports/top-items';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, DollarSign, Users, AlertCircle } from 'lucide-react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const session = await auth();
    const userRole = session?.user?.role;

    // Role-based redirection - fallback if middleware allows access to /dashboard
    if (userRole === 'WAITER') {
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

    // Only fetch report data for Admin/Manager
    // Use Promise.all to fetch data in parallel to reduce latency
    const [stats, salesData, topItems, employees] = await Promise.all([
        getDashboardStats(),
        getSalesTrends(),
        getTopSellingItems(),
        getEmployeePerformance()
    ]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">لوحة المعلومات</h1>

            {/* KPI Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">الإيرادات اليومية</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.revenueToday.toFixed(0)} د.ع</div>
                        <p className="text-xs text-muted-foreground">دخل اليوم</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">الطلبات النشطة</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.activeOrders}</div>
                        <p className="text-xs text-muted-foreground">معلق / قيد التحضير</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">تنبيهات المخزون المنخفض</CardTitle>
                        <AlertCircle className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.lowStockCount}</div>
                        <p className="text-xs text-muted-foreground">عناصر تحت الحد الأدنى</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">الأكثر أداءً</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{employees[0]?.name || '-'}</div>
                        <p className="text-xs text-muted-foreground">{employees[0]?.orders || 0} طلبات تم تقديمها</p>
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
