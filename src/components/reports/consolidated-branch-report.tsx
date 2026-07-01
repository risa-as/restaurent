'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { exportConsolidatedReport } from '@/lib/actions/consolidated-reports';
import {
    Download, BarChart3, Building2, TrendingUp, Banknote,
    CreditCard, ShoppingBag, Trophy, Loader2, Lock,
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid,
} from 'recharts';
import { useChartColors } from '@/hooks/use-chart-colors';
import { useFmt } from '@/contexts/number-locale-context';

interface BranchRow {
    branchId: string;
    branchName: string;
    totalRevenue: number;
    orderCount: number;
    avgOrderValue: number;
    cashRevenue: number;
    cardRevenue: number;
    cogs?: number;
    grossProfit?: number;
    grossMarginPct?: number;
}

interface Totals {
    totalRevenue: number;
    orderCount: number;
    cashRevenue: number;
    cardRevenue: number;
    cogs?: number;
    grossProfit?: number;
}

interface Props {
    rows: BranchRow[];
    totals: Totals;
    from: Date;
    to: Date;
    showCOGS?: boolean;
}

const fmtK = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
    : n >= 1000 ? `${(n / 1000).toFixed(0)}k`
    : String(Math.round(n));

const RANK_STYLES = [
    'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400',
    'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
    'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400',
];

export function ConsolidatedBranchReport({ rows, totals, from, to, showCOGS = false }: Props) {
    const fmt = useFmt();
    const [isPending, startTransition] = useTransition();
    const colors = useChartColors();

    const handleExport = () => {
        startTransition(async () => {
            const result = await exportConsolidatedReport(rows, from, to);
            const link = document.createElement('a');
            link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${result.base64}`;
            link.download = result.filename;
            link.click();
        });
    };

    if (rows.length === 0) {
        return (
            <Card className="shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="p-4 rounded-full bg-muted/60 mb-4">
                        <Building2 className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                    <p className="font-semibold text-muted-foreground">لا توجد بيانات للفترة المحددة</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">جرّب تغيير نطاق التاريخ أو الفرع</p>
                </CardContent>
            </Card>
        );
    }

    const sortedRows = [...rows].sort((a, b) => b.totalRevenue - a.totalRevenue);
    const topBranch = sortedRows[0];

    const chartData = sortedRows.map(r => ({
        name: r.branchName.length > 10 ? r.branchName.slice(0, 10) + '…' : r.branchName,
        fullName: r.branchName,
        cash: r.cashRevenue,
        card: r.cardRevenue,
        total: r.totalRevenue,
    }));

    const tooltipStyle = {
        borderRadius: '12px',
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.tooltip.bg,
        color: colors.tooltip.text,
        fontSize: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
    };

    const kpiCards = [
        {
            label: 'إجمالي الإيرادات',
            value: fmt(totals.totalRevenue),
            unit: 'د.ع',
            icon: TrendingUp,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 dark:bg-emerald-950/30',
            border: 'border-emerald-200 dark:border-emerald-800',
        },
        {
            label: 'إجمالي الطلبات',
            value: fmt(totals.orderCount),
            unit: 'طلب',
            icon: ShoppingBag,
            color: 'text-primary',
            bg: 'bg-primary/5',
            border: 'border-primary/20',
        },
        {
            label: 'المبيعات النقدية',
            value: fmt(totals.cashRevenue),
            unit: 'د.ع',
            icon: Banknote,
            color: 'text-green-600 dark:text-green-400',
            bg: 'bg-green-50 dark:bg-green-950/30',
            border: 'border-green-200 dark:border-green-800',
        },
        {
            label: 'مبيعات البطاقة',
            value: fmt(totals.cardRevenue),
            unit: 'د.ع',
            icon: CreditCard,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-50 dark:bg-blue-950/30',
            border: 'border-blue-200 dark:border-blue-800',
        },
        ...(showCOGS ? [
            {
                label: 'تكلفة البضاعة (COGS)',
                value: fmt(totals.cogs ?? 0),
                unit: 'د.ع',
                icon: BarChart3,
                color: 'text-orange-500',
                bg: 'bg-orange-50 dark:bg-orange-950/30',
                border: 'border-orange-200 dark:border-orange-800',
            },
            {
                label: 'الربح الإجمالي',
                value: fmt(totals.grossProfit ?? 0),
                unit: 'د.ع',
                icon: TrendingUp,
                color: (totals.grossProfit ?? 0) >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-500',
                bg: (totals.grossProfit ?? 0) >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30',
                border: (totals.grossProfit ?? 0) >= 0 ? 'border-emerald-200' : 'border-red-200',
            },
        ] : []),
    ];

    return (
        <div className="space-y-5" dir="rtl">

            {/* ── KPI Cards ── */}
            <div className={`grid gap-3 ${showCOGS ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6' : 'grid-cols-2 md:grid-cols-4'}`}>
                {kpiCards.map(k => {
                    const Icon = k.icon;
                    return (
                        <Card key={k.label} className={`shadow-sm border ${k.border} overflow-hidden`}>
                            <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                    <p className="text-xs text-muted-foreground leading-tight">{k.label}</p>
                                    <div className={`p-1.5 rounded-lg ${k.bg}`}>
                                        <Icon className={`h-3.5 w-3.5 ${k.color}`} />
                                    </div>
                                </div>
                                <p className={`text-xl font-black tabular-nums ${k.color}`}>{k.value}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{k.unit} · {rows.length} فرع</p>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* ── Top performer banner ── */}
            {rows.length > 1 && (
                <div className="flex items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 px-5 py-3">
                    <Trophy className="h-5 w-5 text-amber-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                            أعلى فرع إيراداً: {topBranch.branchName}
                        </span>
                        <span className="text-xs text-amber-600 dark:text-amber-400 ms-2">
                            {fmt(topBranch.totalRevenue)} د.ع · {topBranch.orderCount} طلب
                        </span>
                    </div>
                    {totals.totalRevenue > 0 && (
                        <Badge variant="outline" className="border-amber-300 text-amber-700 dark:text-amber-400 shrink-0 text-xs">
                            {Math.round((topBranch.totalRevenue / totals.totalRevenue) * 100)}% من الإجمالي
                        </Badge>
                    )}
                </div>
            )}

            {/* ── COGS upsell ── */}
            {!showCOGS && (
                <div className="flex items-center gap-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40 px-4 py-3">
                    <Lock className="h-4 w-4 text-slate-400 shrink-0" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        أعمدة <strong>COGS</strong> وهامش الربح لكل فرع متاحة في خطة{' '}
                        <strong className="text-slate-600 dark:text-slate-300">المؤسسات (ENTERPRISE)</strong>
                    </p>
                </div>
            )}

            {/* ── Chart ── */}
            {rows.length > 1 && (
                <Card className="shadow-sm">
                    <CardHeader className="pb-0 pt-5 px-5">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-primary" />
                                مقارنة الإيرادات بين الفروع
                            </CardTitle>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: colors.success }} />
                                    نقد
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: colors.info }} />
                                    بطاقة
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="px-5 pb-5 pt-4">
                        <div className="h-[260px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barSize={32}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.border} opacity={0.5} />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        style={{ fontSize: '11px' }}
                                        stroke={colors.muted}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        style={{ fontSize: '11px' }}
                                        stroke={colors.muted}
                                        tickFormatter={fmtK}
                                    />
                                    <Tooltip
                                        contentStyle={tooltipStyle}
                                        cursor={{ fill: 'rgba(0,0,0,0.04)', radius: 6 }}
                                        formatter={((v: any, n: any) => [
                                            `${fmt(v)} د.ع`,
                                            n === 'cash' ? 'نقد' : 'بطاقة',
                                        ]) as any}
                                        labelFormatter={((_: any, payload: any) => payload?.[0]?.payload?.fullName ?? '') as any}
                                    />
                                    <Bar dataKey="cash" stackId="a" fill={colors.success} radius={[0, 0, 0, 0]} name="cash" />
                                    <Bar dataKey="card" stackId="a" fill={colors.info} radius={[6, 6, 0, 0]} name="card" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* ── Detailed table ── */}
            <Card className="shadow-sm overflow-hidden">
                <CardHeader className="pb-3 pt-5 px-5 border-b flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-semibold">تفاصيل الفروع</CardTitle>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExport}
                        disabled={isPending}
                        className="h-8 text-xs gap-1.5"
                    >
                        {isPending
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Download className="w-3.5 h-3.5" />
                        }
                        تصدير Excel
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-muted/40 border-b">
                                    <th className="text-right px-5 py-3 font-medium text-muted-foreground text-xs w-8">#</th>
                                    <th className="text-right px-4 py-3 font-medium text-muted-foreground text-xs">الفرع</th>
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">الإيرادات</th>
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">الطلبات</th>
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">متوسط الطلب</th>
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">نقد</th>
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">بطاقة</th>
                                    {showCOGS && <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">COGS</th>}
                                    {showCOGS && <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">الربح</th>}
                                    {showCOGS && <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">الهامش</th>}
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground text-xs">الحصة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {sortedRows.map((row, idx) => {
                                    const sharePct = totals.totalRevenue > 0
                                        ? Math.round((row.totalRevenue / totals.totalRevenue) * 100)
                                        : 0;
                                    const rankStyle = RANK_STYLES[idx] ?? 'bg-muted text-muted-foreground border-border';
                                    return (
                                        <tr key={row.branchId} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-5 py-3.5">
                                                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border text-[10px] font-black ${rankStyle}`}>
                                                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-primary/60 shrink-0" />
                                                    <span className="font-semibold text-foreground">{row.branchName}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3.5 text-left">
                                                <span className="font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                                                    {fmt(row.totalRevenue)}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground ms-1">د.ع</span>
                                            </td>
                                            <td className="px-4 py-3.5 text-left">
                                                <span className="font-semibold tabular-nums">{fmt(row.orderCount)}</span>
                                            </td>
                                            <td className="px-4 py-3.5 text-left">
                                                <span className="tabular-nums text-muted-foreground">{fmt(Math.round(row.avgOrderValue))}</span>
                                            </td>
                                            <td className="px-4 py-3.5 text-left">
                                                <span className="tabular-nums text-green-600 dark:text-green-400">{fmt(row.cashRevenue)}</span>
                                            </td>
                                            <td className="px-4 py-3.5 text-left">
                                                <span className="tabular-nums text-blue-600 dark:text-blue-400">{fmt(row.cardRevenue)}</span>
                                            </td>
                                            {showCOGS && (
                                                <td className="px-4 py-3.5 text-left">
                                                    <span className="tabular-nums text-orange-500">{row.cogs !== undefined ? fmt(row.cogs) : '—'}</span>
                                                </td>
                                            )}
                                            {showCOGS && (
                                                <td className="px-4 py-3.5 text-left">
                                                    <span className={`font-bold tabular-nums ${(row.grossProfit ?? 0) >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-500'}`}>
                                                        {row.grossProfit !== undefined ? fmt(row.grossProfit) : '—'}
                                                    </span>
                                                </td>
                                            )}
                                            {showCOGS && (
                                                <td className="px-4 py-3.5 text-left">
                                                    {row.grossMarginPct !== undefined ? (
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[10px] font-bold ${row.grossMarginPct >= 30 ? 'border-emerald-300 text-emerald-700 dark:text-emerald-400' : row.grossMarginPct >= 15 ? 'border-amber-300 text-amber-700' : 'border-red-300 text-red-600'}`}
                                                        >
                                                            {row.grossMarginPct}%
                                                        </Badge>
                                                    ) : '—'}
                                                </td>
                                            )}
                                            <td className="px-4 py-3.5 text-left">
                                                <div className="flex items-center gap-2 min-w-[80px]">
                                                    <div className="flex-1 bg-muted rounded-full h-1.5">
                                                        <div
                                                            className="h-1.5 rounded-full bg-primary transition-all"
                                                            style={{ width: `${sharePct}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-xs font-bold tabular-nums text-muted-foreground w-8 text-left">
                                                        {sharePct}%
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            {/* Totals row */}
                            <tfoot>
                                <tr className="bg-muted/50 border-t-2 border-border font-bold">
                                    <td className="px-5 py-3.5" />
                                    <td className="px-4 py-3.5 text-sm font-bold">الإجمالي</td>
                                    <td className="px-4 py-3.5 text-left">
                                        <span className="font-black tabular-nums text-emerald-600 dark:text-emerald-400">{fmt(totals.totalRevenue)}</span>
                                        <span className="text-[10px] text-muted-foreground ms-1">د.ع</span>
                                    </td>
                                    <td className="px-4 py-3.5 text-left font-bold tabular-nums">{fmt(totals.orderCount)}</td>
                                    <td className="px-4 py-3.5 text-left text-muted-foreground">—</td>
                                    <td className="px-4 py-3.5 text-left tabular-nums text-green-600 dark:text-green-400">{fmt(totals.cashRevenue)}</td>
                                    <td className="px-4 py-3.5 text-left tabular-nums text-blue-600 dark:text-blue-400">{fmt(totals.cardRevenue)}</td>
                                    {showCOGS && <td className="px-4 py-3.5 text-left tabular-nums text-orange-500">{totals.cogs !== undefined ? fmt(totals.cogs) : '—'}</td>}
                                    {showCOGS && (
                                        <td className={`px-4 py-3.5 text-left font-bold tabular-nums ${(totals.grossProfit ?? 0) >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-500'}`}>
                                            {totals.grossProfit !== undefined ? fmt(totals.grossProfit) : '—'}
                                        </td>
                                    )}
                                    {showCOGS && <td className="px-4 py-3.5 text-left text-muted-foreground">—</td>}
                                    <td className="px-4 py-3.5 text-left text-xs font-bold text-muted-foreground">100%</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
