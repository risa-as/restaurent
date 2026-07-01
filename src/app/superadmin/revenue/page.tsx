import { getRevenueAnalytics } from '@/lib/actions/superadmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign, CreditCard, Users, Building2, Smartphone } from 'lucide-react';
import RevenueLineChart from '@/components/superadmin/revenue-line-chart';

export const metadata = {
    title: 'الإيرادات',
};

export const dynamic = 'force-dynamic';

export default async function SuperAdminRevenuePage() {
    const {
        mrr, arr, totalRevenue, avgPerRestaurant,
        monthlyData, bankTotal, zainCashTotal, otherTotal
    } = await getRevenueAnalytics();

    const fmt = (n: number) => Math.round(n).toLocaleString('ar-IQ') + ' د.ع';

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">تقرير الإيرادات</h1>
                <p className="text-muted-foreground mt-1 text-sm">الإيرادات من المدفوعات اليدوية المعتمدة</p>
            </div>

            {/* KPIs */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">الإيراد الشهري (MRR)</CardTitle>
                        <TrendingUp className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{fmt(mrr)}</div>
                        <p className="text-xs text-muted-foreground mt-1">هذا الشهر</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">الإيراد السنوي (ARR)</CardTitle>
                        <DollarSign className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{fmt(arr)}</div>
                        <p className="text-xs text-muted-foreground mt-1">تقدير سنوي</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-orange-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الإيرادات</CardTitle>
                        <CreditCard className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{fmt(totalRevenue)}</div>
                        <p className="text-xs text-muted-foreground mt-1">كل الوقت</p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">متوسط / مطعم</CardTitle>
                        <Users className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-purple-600">{fmt(avgPerRestaurant)}</div>
                        <p className="text-xs text-muted-foreground mt-1">إجمالي ÷ عدد النشطاء</p>
                    </CardContent>
                </Card>
            </div>

            {/* Monthly trend chart */}
            <div className="bg-card border rounded-xl p-5 space-y-4">
                <h2 className="font-bold text-lg">الإيرادات الشهرية (آخر 6 أشهر)</h2>
                <RevenueLineChart data={monthlyData} />
            </div>

            {/* Method breakdown */}
            <div className="bg-card border rounded-xl p-5 space-y-4">
                <h2 className="font-bold text-lg">تفصيل طرق الدفع</h2>
                <div className="grid sm:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-4">
                        <Building2 className="w-8 h-8 text-blue-500" />
                        <div>
                            <p className="text-xs text-muted-foreground">حوالة مصرفية</p>
                            <p className="font-bold text-lg">{fmt(bankTotal)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-4">
                        <Smartphone className="w-8 h-8 text-green-500" />
                        <div>
                            <p className="text-xs text-muted-foreground">زين كاش</p>
                            <p className="font-bold text-lg">{fmt(zainCashTotal)}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-muted/50 rounded-lg p-4">
                        <CreditCard className="w-8 h-8 text-gray-500" />
                        <div>
                            <p className="text-xs text-muted-foreground">أخرى</p>
                            <p className="font-bold text-lg">{fmt(otherTotal)}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
