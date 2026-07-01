'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Printer, Percent } from 'lucide-react';
import type { TaxReport } from '@/lib/actions/reports';
import { useFmt, useDateFmt } from '@/contexts/number-locale-context';

export function TaxReportView({ data }: { data: TaxReport }) {
    const fmt = useFmt();
    const dateFmt = useDateFmt();
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        const el = printRef.current;
        if (!el) return;
        const w = window.open('', '_blank', 'width=800,height=900');
        if (!w) return;
        w.document.write(`
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8"/>
                <title>التقرير الضريبي — ${data.restaurantName}</title>
                <style>
                    * { margin:0; padding:0; box-sizing:border-box; }
                    body { font-family:'Segoe UI',Tahoma,sans-serif; direction:rtl; padding:32px; color:#111; font-size:13px; }
                    h1 { font-size:20px; font-weight:900; margin-bottom:4px; }
                    .sub { color:#666; margin-bottom:20px; }
                    .rate-badge { display:inline-block; background:#4f46e5; color:#fff; padding:4px 12px; border-radius:20px; font-weight:700; margin-bottom:20px; }
                    table { width:100%; border-collapse:collapse; }
                    th { background:#f3f4f6; padding:8px 12px; text-align:right; font-weight:700; border-bottom:2px solid #e5e7eb; }
                    td { padding:8px 12px; border-bottom:1px solid #f0f0f0; }
                    tr.total td { font-weight:900; background:#f9fafb; border-top:2px solid #111; }
                    .mono { font-family:monospace; }
                    .red { color:#dc2626; }
                    .green { color:#16a34a; }
                    .footer { margin-top:40px; text-align:center; font-size:11px; color:#999; }
                    @media print { body { padding:16px; } }
                </style>
            </head>
            <body>
                <h1>${data.restaurantName}</h1>
                <div class="sub">التقرير الضريبي الشهري</div>
                <div class="rate-badge">نسبة الضريبة: ${data.taxRate}%</div>

                <table>
                    <thead>
                        <tr>
                            <th>الشهر</th>
                            <th>الإيرادات</th>
                            <th>عدد المعاملات</th>
                            <th>الضريبة المحسوبة</th>
                            <th>الصافي بعد الضريبة</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.rows.map(r => `
                            <tr>
                                <td>${r.label}</td>
                                <td class="mono">${fmt(r.revenue)} د.ع</td>
                                <td>${r.transactionCount}</td>
                                <td class="mono red">${fmt(r.taxAmount)} د.ع</td>
                                <td class="mono green">${fmt(r.netAfterTax)} د.ع</td>
                            </tr>
                        `).join('')}
                        <tr class="total">
                            <td>الإجمالي</td>
                            <td class="mono">${fmt(data.totals.revenue)} د.ع</td>
                            <td>${data.totals.transactionCount}</td>
                            <td class="mono red">${fmt(data.totals.taxAmount)} د.ع</td>
                            <td class="mono green">${fmt(data.totals.revenue - data.totals.taxAmount)} د.ع</td>
                        </tr>
                    </tbody>
                </table>

                <div class="footer">
                    تم إنشاؤه في ${dateFmt(new Date())}
                </div>
            </body>
            </html>
        `);
        w.document.close();
        w.focus();
        setTimeout(() => { w.print(); }, 400);
    };

    if (data.taxRate === 0) {
        return (
            <div className="text-center py-16 text-muted-foreground">
                <Percent className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-semibold">لم يتم تفعيل الضريبة</p>
                <p className="text-sm mt-1">يمكنك تفعيلها من الإعدادات العامة</p>
            </div>
        );
    }

    if (data.rows.length === 0) {
        return (
            <div className="text-center py-16 text-muted-foreground">
                <p>لا توجد بيانات للفترة المحددة</p>
            </div>
        );
    }

    return (
        <div className="space-y-5" dir="rtl">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 px-3 py-1 text-sm font-bold text-indigo-700 dark:text-indigo-300">
                        <Percent className="h-3.5 w-3.5" />
                        نسبة الضريبة: {data.taxRate}%
                    </div>
                </div>
                <Button onClick={handlePrint} size="sm" variant="outline" className="gap-2">
                    <Printer className="h-4 w-4" />
                    طباعة / PDF
                </Button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card className="shadow-sm">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-muted-foreground mb-1">إجمالي الإيرادات</p>
                        <p className="text-lg font-black text-green-600">{fmt(data.totals.revenue)} د.ع</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-muted-foreground mb-1">إجمالي الضريبة</p>
                        <p className="text-lg font-black text-red-500">{fmt(data.totals.taxAmount)} د.ع</p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm col-span-2 md:col-span-1">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-muted-foreground mb-1">الصافي بعد الضريبة</p>
                        <p className="text-lg font-black text-primary">{fmt(data.totals.revenue - data.totals.taxAmount)} د.ع</p>
                    </CardContent>
                </Card>
            </div>

            {/* Monthly table */}
            <Card className="shadow-sm" ref={printRef}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">التفاصيل الشهرية</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b bg-muted/30">
                                <th className="text-right px-4 py-3 font-medium text-muted-foreground">الشهر</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">الإيرادات</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">نقد</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">بطاقة</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">المعاملات</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">الضريبة</th>
                                <th className="text-left px-4 py-3 font-medium text-muted-foreground">الصافي</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.rows.map(row => (
                                <tr key={row.month} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                                    <td className="px-4 py-3 font-semibold">{row.label}</td>
                                    <td className="px-4 py-3 text-left font-mono font-bold text-green-600">{fmt(row.revenue)}</td>
                                    <td className="px-4 py-3 text-left font-mono">{fmt(row.cash)}</td>
                                    <td className="px-4 py-3 text-left font-mono">{fmt(row.card)}</td>
                                    <td className="px-4 py-3 text-left">{row.transactionCount}</td>
                                    <td className="px-4 py-3 text-left font-mono text-red-500">{fmt(row.taxAmount)}</td>
                                    <td className="px-4 py-3 text-left font-mono text-primary font-bold">{fmt(row.netAfterTax)}</td>
                                </tr>
                            ))}
                            <tr className="bg-muted/40 font-bold border-t-2">
                                <td className="px-4 py-3">الإجمالي</td>
                                <td className="px-4 py-3 text-left font-mono text-green-600">{fmt(data.totals.revenue)}</td>
                                <td className="px-4 py-3 text-left">—</td>
                                <td className="px-4 py-3 text-left">—</td>
                                <td className="px-4 py-3 text-left">{data.totals.transactionCount}</td>
                                <td className="px-4 py-3 text-left font-mono text-red-500">{fmt(data.totals.taxAmount)}</td>
                                <td className="px-4 py-3 text-left font-mono text-primary">{fmt(data.totals.revenue - data.totals.taxAmount)}</td>
                            </tr>
                        </tbody>
                    </table>
                </CardContent>
            </Card>
        </div>
    );
}
