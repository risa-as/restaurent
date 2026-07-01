'use client';

import { useState, useTransition, useEffect } from 'react';
import { DateRange } from 'react-day-picker';
import { subDays, format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { getFinancialComparison, FinancialStats } from '@/lib/actions/finance';
import { DateRangePicker } from './date-range-picker';
import { SummaryCards } from './summary-cards';
import { RevenueChart } from './revenue-chart';
import { CategoryChart } from './category-chart';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExpenseManager } from './expense-manager';
import { DailyCloseButton } from './daily-close-button';
import { Loader2, Download, BarChart3, ListOrdered, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { exportToExcel } from '@/lib/utils/export';
import { cn } from '@/lib/utils';
import { useFmt, useDateFmt } from '@/contexts/number-locale-context';

const STATUS_MAP: Record<string, { label: string; class: string }> = {
    COMPLETED: { label: 'مكتمل', class: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    CANCELLED: { label: 'ملغى', class: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
    PENDING: { label: 'قيد الانتظار', class: 'bg-amber-100 text-amber-700' },
    PREPARING: { label: 'قيد التحضير', class: 'bg-blue-100 text-blue-700' },
    READY: { label: 'جاهز', class: 'bg-purple-100 text-purple-700' },
};

export function FinanceDashboard({ selectedBranchId }: { selectedBranchId?: string | null }) {
    const fmt = useFmt();
    const dateFmt = useDateFmt();
    const [date, setDate] = useState<DateRange | undefined>({
        from: subDays(new Date(), 29),
        to: new Date(),
    });

    const [data, setData] = useState<FinancialStats | null>(null);
    const [prevData, setPrevData] = useState<FinancialStats | null>(null);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        if (date?.from && date?.to) {
            startTransition(async () => {
                const { current, previous } = await getFinancialComparison(date.from!, date.to!);
                setData(current);
                setPrevData(previous);
            });
        }
    }, [date, selectedBranchId]);

    const dateRangeLabel = date?.from && date?.to
        ? `${format(date.from, 'd MMM', { locale: ar })} — ${format(date.to, 'd MMM yyyy', { locale: ar })}`
        : '';

    return (
        <div className="space-y-6" dir="rtl">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">التقارير المالية</h1>
                    {dateRangeLabel && (
                        <p className="text-sm text-muted-foreground mt-0.5">{dateRangeLabel}</p>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {data && (
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 text-xs"
                            onClick={() => exportToExcel(
                                data.expenseList.map(e => ({
                                    'الوصف': e.description,
                                    'الفئة': e.category,
                                    'المبلغ': e.amount,
                                    'التاريخ': dateFmt(e.date),
                                })),
                                'expenses-report',
                            )}
                        >
                            <Download className="w-3.5 h-3.5" />
                            تصدير المصاريف
                        </Button>
                    )}
                    <DateRangePicker date={date} setDate={setDate} />
                </div>
            </div>

            {/* ── Main layout: left = analytics, right = daily close ── */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 items-start">

                {/* Left column */}
                <div className="space-y-6 min-w-0">

                    {/* Summary cards */}
                    {isPending ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-28 rounded-xl border bg-card animate-pulse" />
                            ))}
                        </div>
                    ) : data ? (
                        <SummaryCards data={data} prev={prevData ?? undefined} />
                    ) : null}

                    {/* Charts */}
                    {!isPending && data && (
                        <div className="grid grid-cols-1 lg:grid-cols-6 gap-4">
                            <div className="lg:col-span-4">
                                <RevenueChart data={data.salesByDate} />
                            </div>
                            <div className="lg:col-span-2">
                                <CategoryChart data={data.salesByCategory} />
                            </div>
                        </div>
                    )}

                    {/* Loading spinner when we have no data yet */}
                    {isPending && !data && (
                        <div className="flex justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    )}

                    {/* Tabs: expenses + orders */}
                    {!isPending && data && (
                        <Tabs defaultValue="expenses" className="w-full">
                            <TabsList className="mb-1">
                                <TabsTrigger value="expenses" className="gap-1.5">
                                    <Receipt className="h-3.5 w-3.5" />
                                    المصاريف
                                </TabsTrigger>
                                <TabsTrigger value="orders" className="gap-1.5">
                                    <ListOrdered className="h-3.5 w-3.5" />
                                    الطلبات
                                    {data.orderList.length > 0 && (
                                        <Badge variant="secondary" className="h-4 px-1.5 text-[10px] font-bold ml-0.5">
                                            {data.orderList.length}
                                        </Badge>
                                    )}
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="expenses">
                                <ExpenseManager expenses={data.expenseList} />
                            </TabsContent>

                            <TabsContent value="orders">
                                <div className="rounded-xl border bg-card overflow-hidden">
                                    <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
                                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="font-semibold text-sm">سجل الطلبات للفترة المحددة</h3>
                                        <span className="text-xs text-muted-foreground mr-auto">
                                            {data.orderList.length} طلب
                                        </span>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-right">
                                            <thead>
                                                <tr className="border-b bg-muted/20">
                                                    <th className="px-4 py-2.5 font-medium text-muted-foreground text-xs">رقم الطلب</th>
                                                    <th className="px-4 py-2.5 font-medium text-muted-foreground text-xs">التاريخ</th>
                                                    <th className="px-4 py-2.5 font-medium text-muted-foreground text-xs text-left">المبلغ</th>
                                                    <th className="px-4 py-2.5 font-medium text-muted-foreground text-xs">الحالة</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.orderList.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground text-sm">
                                                            لا توجد طلبات في هذه الفترة
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    data.orderList.slice(0, 50).map((order) => {
                                                        const statusInfo = STATUS_MAP[order.status] ?? { label: order.status, class: 'bg-muted text-muted-foreground' };
                                                        return (
                                                            <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                                                <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                                                                    #{order.orderNumber}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                                                                    {dateFmt(order.createdAt)}
                                                                </td>
                                                                <td className="px-4 py-2.5 text-left font-bold font-mono tabular-nums text-sm">
                                                                    {fmt(order.totalAmount ?? 0)} <span className="text-xs font-normal text-muted-foreground">د.ع</span>
                                                                </td>
                                                                <td className="px-4 py-2.5">
                                                                    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium', statusInfo.class)}>
                                                                        {statusInfo.label}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                        {data.orderList.length > 50 && (
                                            <p className="text-xs text-muted-foreground py-3 text-center border-t">
                                                عرض آخر 50 طلب فقط من أصل {data.orderList.length}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    )}
                </div>

                {/* Right column — always visible daily close */}
                <div className="xl:sticky xl:top-6">
                    <DailyCloseButton />
                </div>
            </div>
        </div>
    );
}
