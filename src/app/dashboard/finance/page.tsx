import { getFinancialSummary } from '@/lib/actions/finance';
import { ExpenseManager } from '@/components/finance/expense-manager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingDown, TrendingUp, ShoppingBag } from 'lucide-react';

export default async function FinancePage() {
    const summary = await getFinancialSummary();

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">نظرة عامة مالية (آخر 30 يوماً)</h1>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{summary.revenue.toFixed(0)} د.ع</div>
                        <p className="text-xs text-muted-foreground">{summary.transactionCount} عملية</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">تكلفة البضائع (COGS)</CardTitle>
                        <ShoppingBag className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{summary.cogs.toFixed(0)} د.ع</div>
                        <p className="text-xs text-muted-foreground">تقديري من الوصفات</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">المصاريف</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{summary.expenses.toFixed(0)} د.ع</div>
                        <p className="text-xs text-muted-foreground">تكاليف إضافية</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">صافي الربح</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${summary.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {summary.netProfit.toFixed(0)} د.ع
                        </div>
                        <p className="text-xs text-muted-foreground">الإيرادات - التكلفة - المصاريف</p>
                    </CardContent>
                </Card>
            </div>

            <ExpenseManager expenses={summary.expenseList} />
        </div>
    );
}
