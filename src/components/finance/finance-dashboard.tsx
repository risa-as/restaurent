'use client';

import { useState, useTransition, useEffect } from 'react';
import { DateRange } from "react-day-picker";
import { startOfDay, endOfDay, subDays } from "date-fns";
import { getFinancialStats, FinancialStats } from '@/lib/actions/finance';
import { DateRangePicker } from './date-range-picker';
import { SummaryCards } from './summary-cards';
import { RevenueChart } from './revenue-chart';
import { CategoryChart } from './category-chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExpenseManager } from './expense-manager'; // Reuse existing if suitable, or create new list
import { Loader2 } from 'lucide-react';

export function FinanceDashboard() {
    // Default to last 30 days
    const [date, setDate] = useState<DateRange | undefined>({
        from: subDays(new Date(), 29),
        to: new Date(),
    });

    const [data, setData] = useState<FinancialStats | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (date?.from && date?.to) {
            startTransition(async () => {
                const stats = await getFinancialStats(date.from!, date.to!);
                setData(stats);
            });
        }
    }, [date]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-3xl font-bold">التقارير المالية</h1>
                <DateRangePicker date={date} setDate={setDate} />
            </div>

            {isPending && <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>}

            {!isPending && data && (
                <>
                    <SummaryCards data={data} />

                    <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
                        <div className="lg:col-span-4">
                            <RevenueChart data={data.salesByDate} />
                        </div>
                        <div className="lg:col-span-2">
                            <CategoryChart data={data.salesByCategory} />
                        </div>
                    </div>

                    <Tabs defaultValue="expenses" className="w-full">
                        <TabsList>
                            <TabsTrigger value="expenses">المصاريف</TabsTrigger>
                            <TabsTrigger value="orders">أحدث الطلبات</TabsTrigger>
                        </TabsList>
                        <TabsContent value="expenses">
                            <ExpenseManager expenses={data.expenseList} />
                        </TabsContent>
                        <TabsContent value="orders">
                            {/* Simple Order List Table for now */}
                            <div className="border rounded-md p-4 bg-white">
                                <h3 className="font-bold mb-4">سجل الطلبات للفترة المحددة</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-right">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="p-2">رقم الطلب</th>
                                                <th className="p-2">التاريخ</th>
                                                <th className="p-2">المبلغ</th>
                                                <th className="p-2">الحالة</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.orderList.length === 0 ? (
                                                <tr><td colSpan={4} className="p-4 text-center text-muted-foreground">لا توجد طلبات</td></tr>
                                            ) : (
                                                data.orderList.slice(0, 50).map((order: any) => (
                                                    <tr key={order.id} className="border-b">
                                                        <td className="p-2">#{order.orderNumber}</td>
                                                        <td className="p-2">{new Date(order.createdAt).toLocaleDateString('ar-EG')}</td>
                                                        <td className="p-2">{order.totalAmount} د.ع</td>
                                                        <td className="p-2">{order.status}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                    {data.orderList.length > 50 && <p className="text-xs text-muted-foreground mt-2 text-center">عرض آخر 50 طلب فقط</p>}
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </>
            )}
        </div>
    );
}
