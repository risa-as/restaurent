'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, TrendingUp, Clock } from 'lucide-react';
import type { DriverPerformanceRow } from '@/lib/actions/delivery';
import { useFmt } from '@/contexts/number-locale-context';

interface Props { rows: DriverPerformanceRow[] }

export function DriverPerformance({ rows }: Props) {
    const fmt = useFmt();
    if (rows.length === 0) {
        return (
            <div className="text-center py-16 text-muted-foreground">
                <Truck className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>لا توجد بيانات توصيل للفترة المحددة</p>
            </div>
        );
    }

    const totalDelivered = rows.reduce((s, r) => s + r.delivered, 0);
    const totalOrders = rows.reduce((s, r) => s + r.total, 0);
    const totalFees = rows.reduce((s, r) => s + r.totalDeliveryFee, 0);
    const avgMinutes = (() => {
        const withTimes = rows.filter(r => r.avgDeliveryMinutes !== null);
        if (!withTimes.length) return null;
        return Math.round(withTimes.reduce((s, r) => s + r.avgDeliveryMinutes!, 0) / withTimes.length);
    })();

    return (
        <div className="space-y-5" dir="rtl">
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="shadow-sm">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-muted-foreground mb-1">إجمالي الطلبات</p>
                        <p className="text-2xl font-black">{totalOrders}</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-muted-foreground mb-1">تم التوصيل</p>
                        <p className="text-2xl font-black text-green-600">{totalDelivered}</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-muted-foreground mb-1">إجمالي رسوم التوصيل</p>
                        <p className="text-lg font-black text-primary">{fmt(totalFees)} د.ع</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-muted-foreground mb-1">متوسط وقت التوصيل</p>
                        <p className="text-2xl font-black">{avgMinutes !== null ? `${avgMinutes} د` : '—'}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Driver table */}
            <Card className="shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Truck className="h-4 w-4 text-primary" />
                        أداء السائقين
                    </CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/30">
                                <th className="text-right px-4 py-3 font-medium text-muted-foreground">السائق</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">الإجمالي</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">تم التوصيل</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">معلق</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">مُعاد</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">نسبة النجاح</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">متوسط الوقت</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">رسوم التوصيل</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(row => (
                                <tr key={row.driverId} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                    <td className="px-4 py-3 font-semibold flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                            <Truck className="h-3.5 w-3.5 text-primary" />
                                        </div>
                                        {row.driverName}
                                    </td>
                                    <td className="px-4 py-3 text-left font-bold">{row.total}</td>
                                    <td className="px-4 py-3 text-left text-green-600 font-bold">{row.delivered}</td>
                                    <td className="px-4 py-3 text-left text-amber-600">{row.pending}</td>
                                    <td className="px-4 py-3 text-left text-red-500">{row.returned}</td>
                                    <td className="px-4 py-3 text-left">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-muted rounded-full h-1.5 max-w-[50px]">
                                                <div
                                                    className={`h-1.5 rounded-full ${row.successRate >= 80 ? 'bg-green-500' : row.successRate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                                                    style={{ width: `${row.successRate}%` }}
                                                />
                                            </div>
                                            <span className="text-xs font-bold">{row.successRate}%</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-left">
                                        {row.avgDeliveryMinutes !== null ? (
                                            <span className="flex items-center gap-1 text-xs">
                                                <Clock className="h-3 w-3 text-muted-foreground" />
                                                {row.avgDeliveryMinutes} دقيقة
                                            </span>
                                        ) : <span className="text-muted-foreground">—</span>}
                                    </td>
                                    <td className="px-4 py-3 text-left font-mono font-bold text-primary">
                                        {fmt(row.totalDeliveryFee)} د.ع
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </CardContent>
            </Card>

            {/* Performance badges */}
            {rows.length > 0 && (() => {
                const sorted = [...rows].sort((a, b) => b.delivered - a.delivered);
                const top = sorted[0];
                const fastest = rows.filter(r => r.avgDeliveryMinutes !== null).sort((a, b) => a.avgDeliveryMinutes! - b.avgDeliveryMinutes!)[0];
                return (
                    <div className="flex flex-wrap gap-3">
                        {top && (
                            <div className="flex items-center gap-2 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-4 py-2 text-sm font-medium">
                                <TrendingUp className="h-4 w-4" />
                                الأكثر توصيلاً: {top.driverName} ({top.delivered} طلب)
                            </div>
                        )}
                        {fastest && (
                            <div className="flex items-center gap-2 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 text-sm font-medium">
                                <Clock className="h-4 w-4" />
                                الأسرع: {fastest.driverName} ({fastest.avgDeliveryMinutes} دقيقة متوسط)
                            </div>
                        )}
                    </div>
                );
            })()}
        </div>
    );
}
