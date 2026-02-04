import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingDown, TrendingUp, ShoppingBag } from 'lucide-react';
import { FinancialStats } from '@/lib/actions/finance';

export function SummaryCards({ data }: { data: FinancialStats }) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
                    <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-green-600">{data.revenue.toFixed(0)} د.ع</div>
                    <p className="text-xs text-muted-foreground">{data.transactionCount} عملية بيع</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">تكلفة البضائع (COGS)</CardTitle>
                    <ShoppingBag className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-orange-600">{data.cogs.toFixed(0)} د.ع</div>
                    <p className="text-xs text-muted-foreground">التكلفة التشغيلية للوجبات</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">المصاريف</CardTitle>
                    <TrendingDown className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-red-600">{data.expenses.toFixed(0)} د.ع</div>
                    <p className="text-xs text-muted-foreground">فواتير، رواتب، صيانة</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">صافي الربح</CardTitle>
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                    <div className={`text-2xl font-bold ${data.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {data.netProfit.toFixed(0)} د.ع
                    </div>
                    <p className="text-xs text-muted-foreground">الإيرادات - التكاليف والمصاريف</p>
                </CardContent>
            </Card>
        </div>
    );
}
