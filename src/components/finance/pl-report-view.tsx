'use client';

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
    Printer, TrendingUp, TrendingDown, Minus,
    ShoppingCart, Receipt,
    BarChart3, Wallet, ArrowDown, DollarSign,
} from 'lucide-react';
import type { PLReport } from '@/lib/actions/reports';
import { cn } from '@/lib/utils';
import { useFmt, useDateFmt } from '@/contexts/number-locale-context';

const pct = (n: number, total: number) =>
    total > 0 ? `${Math.round((n / total) * 100)}%` : '—';

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({
    label, value, sub, icon: Icon, variant = 'default',
}: {
    label: string;
    value: string;
    sub?: string;
    icon: React.ElementType;
    variant?: 'default' | 'green' | 'red' | 'blue';
}) {
    const styles = {
        default: 'bg-card border',
        green:   'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800',
        red:     'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',
        blue:    'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
    };
    const iconStyles = {
        default: 'bg-muted text-muted-foreground',
        green:   'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400',
        red:     'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400',
        blue:    'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400',
    };
    const valueStyles = {
        default: 'text-foreground',
        green:   'text-emerald-700 dark:text-emerald-400',
        red:     'text-red-700 dark:text-red-400',
        blue:    'text-blue-700 dark:text-blue-400',
    };

    return (
        <div className={cn('rounded-2xl border p-4 flex flex-col gap-3', styles[variant])}>
            <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">{label}</span>
                <div className={cn('p-2 rounded-xl', iconStyles[variant])}>
                    <Icon className="w-4 h-4" />
                </div>
            </div>
            <div>
                <p className={cn('text-2xl font-black tracking-tight tabular-nums', valueStyles[variant])}>
                    {value}
                </p>
                {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

// ── Section Card ──────────────────────────────────────────────────────────────
function Section({
    title, icon: Icon, accentColor = 'indigo', children,
}: {
    title: string;
    icon: React.ElementType;
    accentColor?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="rounded-2xl border overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-3.5 bg-muted/30 border-b">
                <div className={`p-1.5 rounded-lg bg-${accentColor}-100 dark:bg-${accentColor}-900/40`}>
                    <Icon className={`w-4 h-4 text-${accentColor}-600 dark:text-${accentColor}-400`} />
                </div>
                <span className="font-bold text-sm">{title}</span>
            </div>
            <div className="px-5 py-2">{children}</div>
        </div>
    );
}

// ── Report Row ────────────────────────────────────────────────────────────────
function Row({
    label, value, revenue, indent, bold, colorClass, showBar, separator,
}: {
    label: string;
    value: number;
    revenue?: number;
    indent?: boolean;
    bold?: boolean;
    colorClass?: string;
    showBar?: boolean;
    separator?: boolean;
}) {
    const fmt = useFmt();
    const barPct = revenue && revenue > 0 ? Math.min(100, Math.round((value / revenue) * 100)) : 0;

    return (
        <>
            {separator && <div className="my-1 border-t border-dashed border-border/60" />}
            <div className={cn('py-2.5', indent && 'pr-4')}>
                <div className="flex items-center justify-between gap-4">
                    <span className={cn('text-sm', bold ? 'font-bold' : 'text-muted-foreground')}>
                        {label}
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                        {revenue !== undefined && revenue > 0 && (
                            <span className="text-[11px] text-muted-foreground/60 font-mono w-10 text-left">
                                {pct(value, revenue)}
                            </span>
                        )}
                        <span className={cn('text-sm font-mono font-bold tabular-nums', colorClass ?? (bold ? '' : 'text-foreground'))}>
                            {fmt(value)} <span className="text-[10px] font-normal text-muted-foreground">د.ع</span>
                        </span>
                    </div>
                </div>
                {showBar && barPct > 0 && (
                    <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                        <div
                            className={cn('h-full rounded-full transition-all', colorClass?.includes('red') ? 'bg-red-400' : 'bg-emerald-400')}
                            style={{ width: `${barPct}%` }}
                        />
                    </div>
                )}
            </div>
        </>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function PLReportView({ data }: { data: PLReport }) {
    const fmt = useFmt();
    const dateFmt = useDateFmt();
    const printRef = useRef<HTMLDivElement>(null);

    const netIsPositive = data.netProfit >= 0;
    const NetIcon = data.netProfit > 0 ? TrendingUp : data.netProfit < 0 ? TrendingDown : Minus;

    const handlePrint = () => {
        const w = window.open('', '_blank', 'width=820,height=1000');
        if (!w) return;
        w.document.write(`<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<title>تقرير P&L — ${data.restaurantName}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;padding:40px;color:#111;font-size:13px;line-height:1.5}
.header{border-bottom:3px solid #4f46e5;padding-bottom:16px;margin-bottom:24px}
h1{font-size:20px;font-weight:900;color:#1e1b4b}
.sub{color:#6b7280;font-size:12px;margin-top:2px}
.kpi-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
.kpi{border:1px solid #e5e7eb;border-radius:10px;padding:12px}
.kpi-label{font-size:10px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}
.kpi-value{font-size:16px;font-weight:900;font-family:monospace}
.green{color:#16a34a}.red{color:#dc2626}.blue{color:#2563eb}.purple{color:#7c3aed}
.section{margin-bottom:16px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden}
.section-header{background:#f9fafb;padding:8px 14px;font-weight:700;font-size:12px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:8px}
.section-header::before{content:'';display:inline-block;width:3px;height:14px;border-radius:2px;background:#4f46e5}
.row{display:flex;justify-content:space-between;padding:6px 14px;border-bottom:1px solid #f3f4f6}
.row:last-child{border-bottom:none}
.row.indent{padding-right:28px}
.row.bold{font-weight:700;background:#fafafa}
.row.total{font-weight:900;font-size:15px;background:#f0fdf4;border-top:2px solid #16a34a}
.row.total.loss{background:#fef2f2;border-top-color:#dc2626}
.mono{font-family:monospace}
.pct{font-size:10px;color:#9ca3af;margin-left:8px}
.net-banner{border-radius:8px;padding:16px 20px;display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}
.net-banner.profit{background:#f0fdf4;border:2px solid #86efac}
.net-banner.loss{background:#fef2f2;border:2px solid #fca5a5}
.footer{margin-top:32px;text-align:center;font-size:10px;color:#9ca3af;border-top:1px solid #f3f4f6;padding-top:12px}
@media print{body{padding:20px}.kpi-grid{break-inside:avoid}}
</style>
</head>
<body>
<div class="header">
  <h1>${data.restaurantName}</h1>
  <div class="sub">قائمة الأرباح والخسائر (P&L) — ${data.period.label}</div>
</div>

<div class="net-banner ${netIsPositive ? 'profit' : 'loss'}">
  <div>
    <div style="font-size:11px;color:#6b7280;margin-bottom:2px">صافي الربح / الخسارة</div>
    <div style="font-size:22px;font-weight:900;font-family:monospace;color:${netIsPositive ? '#16a34a' : '#dc2626'}">${fmt(data.netProfit)} د.ع</div>
  </div>
  <div style="text-align:left">
    <div style="font-size:11px;color:#6b7280;margin-bottom:2px">هامش الربح الإجمالي</div>
    <div style="font-size:18px;font-weight:900;color:${data.grossMarginPct >= 0 ? '#16a34a' : '#dc2626'}">${data.grossMarginPct}%</div>
  </div>
</div>

<div class="kpi-grid">
  <div class="kpi"><div class="kpi-label">الإيرادات</div><div class="kpi-value green">${fmt(data.revenue)} د.ع</div></div>
  <div class="kpi"><div class="kpi-label">تكلفة البضاعة</div><div class="kpi-value red">${fmt(data.cogs)} د.ع</div></div>
  <div class="kpi"><div class="kpi-label">المصروفات</div><div class="kpi-value red">${fmt(data.totalExpenses)} د.ع</div></div>
  <div class="kpi"><div class="kpi-label">المعاملات</div><div class="kpi-value blue">${fmt(data.transactionCount)}</div></div>
</div>

<div class="section">
  <div class="section-header">الإيرادات</div>
  <div class="row indent"><span>إيرادات نقدية</span><span class="mono">${fmt(data.cashRevenue)} د.ع <span class="pct">${pct(data.cashRevenue, data.revenue)}</span></span></div>
  <div class="row indent"><span>إيرادات بطاقة</span><span class="mono">${fmt(data.cardRevenue)} د.ع <span class="pct">${pct(data.cardRevenue, data.revenue)}</span></span></div>
  <div class="row bold"><span>إجمالي الإيرادات</span><span class="mono green">${fmt(data.revenue)} د.ع</span></div>
</div>

<div class="section">
  <div class="section-header">تكلفة البضاعة المباعة (COGS)</div>
  <div class="row indent"><span>تكلفة الخامات المستخدمة</span><span class="mono red">${fmt(data.cogs)} د.ع <span class="pct">${pct(data.cogs, data.revenue)}</span></span></div>
  <div class="row bold"><span>إجمالي الربح</span><span class="mono ${data.grossProfit >= 0 ? 'green' : 'red'}">${fmt(data.grossProfit)} د.ع (هامش ${data.grossMarginPct}%)</span></div>
</div>

${data.expensesByCategory.length > 0 ? `
<div class="section">
  <div class="section-header">المصروفات التشغيلية</div>
  ${data.expensesByCategory.map(e => `<div class="row indent"><span>${e.category}</span><span class="mono red">${fmt(e.amount)} د.ع <span class="pct">${pct(e.amount, data.revenue)}</span></span></div>`).join('')}
  <div class="row bold"><span>إجمالي المصروفات</span><span class="mono red">${fmt(data.totalExpenses)} د.ع</span></div>
</div>` : ''}

${data.taxRate > 0 ? `
<div class="section">
  <div class="section-header">الضرائب (${data.taxRate}%)</div>
  <div class="row indent"><span>الضريبة المحسوبة</span><span class="mono red">${fmt(data.taxAmount)} د.ع</span></div>
</div>` : ''}

<div class="section">
  <div class="row total ${netIsPositive ? '' : 'loss'}">
    <span>صافي الربح / الخسارة</span>
    <span class="mono ${netIsPositive ? 'green' : 'red'}">${fmt(data.netProfit)} د.ع</span>
  </div>
</div>

<div class="footer">
  عدد المعاملات: ${fmt(data.transactionCount)} &nbsp;|&nbsp; تاريخ الإنشاء: ${dateFmt(new Date())} &nbsp;|&nbsp; ${data.restaurantName}
</div>
</body></html>`);
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 400);
    };

    return (
        <div className="space-y-6" dir="rtl">

            {/* ── Print Button + Period ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black tracking-tight">{data.restaurantName}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        قائمة الأرباح والخسائر — <span className="font-semibold text-foreground">{data.period.label}</span>
                        <span className="mx-2 text-border">|</span>
                        <span>{fmt(data.transactionCount)} معاملة</span>
                    </p>
                </div>
                <Button onClick={handlePrint} variant="outline" size="sm" className="gap-2 h-9">
                    <Printer className="w-4 h-4" />
                    طباعة / PDF
                </Button>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    label="إجمالي الإيرادات"
                    value={`${fmt(data.revenue)} د.ع`}
                    sub={`نقد: ${fmt(data.cashRevenue)} | بطاقة: ${fmt(data.cardRevenue)}`}
                    icon={DollarSign}
                    variant="green"
                />
                <KpiCard
                    label="تكلفة البضاعة (COGS)"
                    value={`${fmt(data.cogs)} د.ع`}
                    sub={`${pct(data.cogs, data.revenue)} من الإيرادات`}
                    icon={ShoppingCart}
                    variant="red"
                />
                <KpiCard
                    label="إجمالي الربح"
                    value={`${fmt(data.grossProfit)} د.ع`}
                    sub={`هامش ${data.grossMarginPct}%`}
                    icon={BarChart3}
                    variant={data.grossProfit >= 0 ? 'green' : 'red'}
                />
                <KpiCard
                    label="صافي الربح / الخسارة"
                    value={`${fmt(data.netProfit)} د.ع`}
                    sub={data.totalExpenses > 0 ? `بعد خصم مصروفات ${fmt(data.totalExpenses)} د.ع` : 'بعد جميع التكاليف'}
                    icon={netIsPositive ? TrendingUp : TrendingDown}
                    variant={netIsPositive ? 'green' : 'red'}
                />
            </div>

            {/* ── Net Profit Banner ── */}
            <div className={cn(
                'rounded-2xl border-2 p-5 flex items-center gap-5',
                netIsPositive
                    ? 'border-emerald-300 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-800'
                    : 'border-red-300 bg-red-50/60 dark:bg-red-950/20 dark:border-red-800'
            )}>
                <div className={cn(
                    'p-3 rounded-2xl',
                    netIsPositive ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-red-100 dark:bg-red-900/50'
                )}>
                    <NetIcon className={cn('w-7 h-7', netIsPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')} />
                </div>
                <div className="flex-1">
                    <p className="text-xs text-muted-foreground font-medium">صافي الربح / الخسارة لشهر {data.period.label}</p>
                    <p className={cn('text-3xl font-black tabular-nums mt-0.5', netIsPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400')}>
                        {fmt(data.netProfit)} <span className="text-base font-semibold">د.ع</span>
                    </p>
                </div>
                <div className="hidden sm:flex flex-col items-end gap-1 text-left">
                    <span className="text-xs text-muted-foreground">هامش الربح الإجمالي</span>
                    <span className={cn('text-2xl font-black', data.grossMarginPct >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400')}>
                        {data.grossMarginPct}%
                    </span>
                </div>
            </div>

            {/* ── Flow: Revenue → Costs → Profit ── */}
            <div ref={printRef} className="space-y-3">

                {/* Revenue */}
                <Section title="الإيرادات" icon={DollarSign} accentColor="emerald">
                    <Row label="إيرادات نقدية" value={data.cashRevenue} revenue={data.revenue} indent
                        showBar colorClass="text-emerald-600 dark:text-emerald-400" />
                    <Row label="إيرادات بطاقة" value={data.cardRevenue} revenue={data.revenue} indent
                        showBar colorClass="text-blue-600 dark:text-blue-400" />
                    <Row label="إجمالي الإيرادات" value={data.revenue} bold
                        colorClass="text-emerald-700 dark:text-emerald-400" separator />
                </Section>

                {/* COGS */}
                <Section title="تكلفة البضاعة المباعة — COGS" icon={ShoppingCart} accentColor="red">
                    <Row label="تكلفة الخامات المستخدمة" value={data.cogs} revenue={data.revenue} indent
                        showBar colorClass="text-red-600 dark:text-red-400" />
                    <Row label="إجمالي التكلفة" value={data.cogs} bold
                        colorClass="text-red-700 dark:text-red-400" separator />
                </Section>

                {/* Gross Profit */}
                <div className={cn(
                    'rounded-2xl border-2 px-5 py-4 flex items-center justify-between',
                    data.grossProfit >= 0
                        ? 'border-emerald-200 bg-emerald-50/60 dark:bg-emerald-950/20 dark:border-emerald-800'
                        : 'border-red-200 bg-red-50/60 dark:bg-red-950/20 dark:border-red-800'
                )}>
                    <div className="flex items-center gap-2.5">
                        <ArrowDown className={cn('w-4 h-4', data.grossProfit >= 0 ? 'text-emerald-500' : 'text-red-500')} />
                        <span className="font-bold text-sm">إجمالي الربح</span>
                        <span className={cn(
                            'text-xs font-bold px-2 py-0.5 rounded-full',
                            data.grossProfit >= 0
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
                        )}>
                            هامش {data.grossMarginPct}%
                        </span>
                    </div>
                    <span className={cn(
                        'text-lg font-black font-mono tabular-nums',
                        data.grossProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
                    )}>
                        {fmt(data.grossProfit)} <span className="text-xs font-normal text-muted-foreground">د.ع</span>
                    </span>
                </div>

                {/* Expenses */}
                {data.expensesByCategory.length > 0 && (
                    <Section title="المصروفات التشغيلية" icon={Wallet} accentColor="orange">
                        {data.expensesByCategory.map(exp => (
                            <Row
                                key={exp.category}
                                label={exp.category}
                                value={exp.amount}
                                revenue={data.revenue}
                                indent
                                showBar
                                colorClass="text-orange-600 dark:text-orange-400"
                            />
                        ))}
                        <Row label="إجمالي المصروفات" value={data.totalExpenses} bold
                            colorClass="text-red-700 dark:text-red-400" separator />
                    </Section>
                )}

                {/* Tax */}
                {data.taxRate > 0 && (
                    <Section title={`الضرائب — ${data.taxRate}%`} icon={Receipt} accentColor="purple">
                        <Row
                            label={`ضريبة ${data.taxRate}% على الإيرادات`}
                            value={data.taxAmount}
                            revenue={data.revenue}
                            indent
                            showBar
                            colorClass="text-purple-600 dark:text-purple-400"
                        />
                    </Section>
                )}

                {/* Net Profit — final row */}
                <div className={cn(
                    'rounded-2xl border-2 px-5 py-4',
                    netIsPositive
                        ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-700'
                        : 'border-red-400 bg-red-50 dark:bg-red-950/30 dark:border-red-700'
                )}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <NetIcon className={cn('w-5 h-5', netIsPositive ? 'text-emerald-600' : 'text-red-600')} />
                            <span className="font-black text-base">صافي الربح / الخسارة</span>
                        </div>
                        <span className={cn(
                            'text-xl font-black font-mono tabular-nums',
                            netIsPositive ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'
                        )}>
                            {fmt(data.netProfit)} <span className="text-sm font-normal text-muted-foreground">د.ع</span>
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 pr-8">
                        بناءً على {fmt(data.transactionCount)} معاملة خلال {data.period.label}
                    </p>
                </div>
            </div>
        </div>
    );
}
