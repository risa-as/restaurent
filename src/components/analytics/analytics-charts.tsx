'use client';

import {
    BarChart, Bar, XAxis, YAxis, Tooltip as RT,
    ResponsiveContainer, Area, CartesianGrid,
    ComposedChart, Line, PieChart, Pie, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    TrendingUp, TrendingDown, Clock, Users, ShoppingBag,
    AlertTriangle, Package, Award, Banknote, CreditCard,
    Activity, BarChart2, Layers,
} from 'lucide-react';
import { useChartColors } from '@/hooks/use-chart-colors';
import { cn } from '@/lib/utils';
import { useFmt } from '@/contexts/number-locale-context';

// ── Full type matching getAnalyticsData() ────────────────────────────────────
export interface AnalyticsData {
    topItems: {
        name: string; category: string; quantity: number;
        revenue: number; cost: number; profit: number;
        marginPct: number; costSource: string;
    }[];
    slowItems: { name: string; quantity: number; revenue: number }[];
    monthlySales: {
        month: string; revenue: number; expenses: number;
        netProfit: number; orderCount: number; avgOrderValue: number;
    }[];
    peakHours: { hour: string; orderCount: number; revenue: number }[];
    last7Days: { day: string; revenue: number; orderCount: number }[];
    customerStats: {
        totalCustomers: number; newThisMonth: number;
        topSpenders: { name: string | null; totalSpent: number; totalPoints: number; phone: string }[];
    };
    inventoryAlerts: {
        lowStock: { name: string; currentStock: number; unit: string; costPerUnit: number }[];
    };
    paymentStats: { method: string; total: number; count: number }[];
    dataQuality: {
        totalOrders: number; totalBills: number; daysSinceFirstOrder: number;
        isNewRestaurant: boolean; recipeCompletionPct: number;
        itemsWithRecipe: number; totalMenuItems: number;
        hasSufficientHistory: boolean; warnings: string[];
    };
}

const fmtK = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

function TooltipStyle(colors: ReturnType<typeof useChartColors>) {
    return {
        borderRadius: '10px',
        border: `1px solid ${colors.border}`,
        backgroundColor: colors.tooltip.bg,
        color: colors.tooltip.text,
        fontSize: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    };
}

// ── Data Quality Warnings Banner ─────────────────────────────────────────────
function DataQualityBanner({ dq }: { dq: AnalyticsData['dataQuality'] }) {
    const fmt = useFmt();
    if (dq.warnings.length === 0) return null;
    return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 space-y-2">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-sm">
                <AlertTriangle className="h-4 w-4" />
                تنبيهات جودة البيانات
            </div>
            <ul className="space-y-1">
                {dq.warnings.map((w, i) => (
                    <li key={i} className="text-xs text-amber-600 dark:text-amber-500 flex items-start gap-2">
                        <span className="mt-0.5 shrink-0">•</span>
                        <span>{w}</span>
                    </li>
                ))}
            </ul>
            <div className="pt-1 flex items-center gap-3 text-xs text-muted-foreground">
                <span>اكتمال الوصفات: <strong className={cn(dq.recipeCompletionPct >= 80 ? 'text-green-600' : 'text-amber-600')}>{dq.recipeCompletionPct}%</strong></span>
                <span>·</span>
                <span>طلبات مكتملة: <strong>{fmt(dq.totalOrders)}</strong></span>
                <span>·</span>
                <span>أيام منذ البداية: <strong>{dq.daysSinceFirstOrder}</strong></span>
            </div>
        </div>
    );
}

// ── KPI Cards ────────────────────────────────────────────────────────────────
function KpiCards({ data }: { data: AnalyticsData }) {
    const fmt = useFmt();
    const last7Total = data.last7Days.reduce((s, d) => s + d.revenue, 0);
    const last7Orders = data.last7Days.reduce((s, d) => s + d.orderCount, 0);
    const avgOrder = last7Orders > 0 ? Math.round(last7Total / last7Orders) : 0;
    const today = data.last7Days[data.last7Days.length - 1];
    const yesterday = data.last7Days[data.last7Days.length - 2];
    const todayGrowth = yesterday && yesterday.revenue > 0
        ? Math.round(((today?.revenue ?? 0) - yesterday.revenue) / yesterday.revenue * 100)
        : null;

    const kpis = [
        {
            label: 'العملاء المسجلين', value: fmt(data.customerStats.totalCustomers),
            sub: `+${data.customerStats.newThisMonth} هذا الشهر`,
            icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/30',
        },
        {
            label: 'مبيعات آخر 7 أيام', value: `${fmtK(last7Total)} د.ع`,
            sub: todayGrowth !== null
                ? `اليوم ${todayGrowth >= 0 ? '+' : ''}${todayGrowth}% عن أمس`
                : `${last7Orders} طلب`,
            icon: Activity, color: 'text-primary', bg: 'bg-primary/10',
        },
        {
            label: 'متوسط قيمة الطلب', value: `${fmt(avgOrder)} د.ع`,
            sub: 'آخر 7 أيام',
            icon: BarChart2, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/30',
        },
        {
            label: 'أصناف بوصفات مكتملة', value: `${data.dataQuality.recipeCompletionPct}%`,
            sub: `${data.dataQuality.itemsWithRecipe} من ${data.dataQuality.totalMenuItems} صنف`,
            icon: Layers, color: data.dataQuality.recipeCompletionPct >= 80 ? 'text-green-600' : 'text-amber-600',
            bg: data.dataQuality.recipeCompletionPct >= 80 ? 'bg-green-50 dark:bg-green-950/30' : 'bg-amber-50 dark:bg-amber-950/30',
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map(k => (
                <Card key={k.label} className="shadow-sm">
                    <CardContent className="pt-5 pb-4">
                        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', k.bg)}>
                            <k.icon className={cn('h-5 w-5', k.color)} />
                        </div>
                        <p className="text-xs text-muted-foreground mb-0.5">{k.label}</p>
                        <p className={cn('text-xl font-black', k.color)}>{k.value}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{k.sub}</p>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

// ── Last 7 Days + Payment Methods ────────────────────────────────────────────
function Last7DaysRow({ data }: { data: AnalyticsData }) {
    const fmt = useFmt();
    const colors = useChartColors();
    const ts = TooltipStyle(colors);

    const PAYMENT_LABELS: Record<string, { label: string; color: string }> = {
        CASH: { label: 'نقد', color: colors.success },
        CARD: { label: 'بطاقة', color: colors.info },
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Last 7 days bars */}
            <Card className="lg:col-span-2 shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Activity className="h-4 w-4 text-primary" />
                        أداء آخر 7 أيام
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={data.last7Days} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.border} opacity={0.4} />
                                <XAxis dataKey="day" axisLine={false} tickLine={false} style={{ fontSize: '10px' }} stroke={colors.muted} />
                                <YAxis axisLine={false} tickLine={false} style={{ fontSize: '10px' }} stroke={colors.muted} tickFormatter={fmtK} />
                                <RT contentStyle={ts} formatter={((v: any, n: any) => [
                                    n === 'revenue' ? `${fmt(v)} د.ع` : v,
                                    n === 'revenue' ? 'الإيرادات' : 'الطلبات',
                                ]) as any} />
                                <Bar dataKey="revenue" fill={colors.primary} radius={[4, 4, 0, 0]} opacity={0.85} name="revenue" />
                                <Line type="monotone" dataKey="orderCount" stroke={colors.warning} strokeWidth={2} dot={false} name="orderCount" yAxisId={0} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>

            {/* Payment methods */}
            <Card className="shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Banknote className="h-4 w-4 text-primary" />
                        طرق الدفع
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {data.paymentStats.length === 0 ? (
                        <div className="flex items-center justify-center h-[160px] text-muted-foreground text-sm">لا توجد بيانات</div>
                    ) : (
                        <>
                            <div className="h-[140px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={data.paymentStats}
                                            dataKey="total"
                                            nameKey="method"
                                            cx="50%" cy="50%"
                                            innerRadius={40} outerRadius={60}
                                            paddingAngle={3}
                                        >
                                            {data.paymentStats.map((entry, i) => (
                                                <Cell
                                                    key={entry.method}
                                                    fill={i === 0 ? colors.success : colors.info}
                                                />
                                            ))}
                                        </Pie>
                                        <RT
                                            contentStyle={ts}
                                            formatter={((v: any, n: any) => [`${fmt(v)} د.ع`, PAYMENT_LABELS[n]?.label ?? n]) as any}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="space-y-2 mt-1">
                                {data.paymentStats.map((p, i) => {
                                    const info = PAYMENT_LABELS[p.method] ?? { label: p.method, color: colors.primary };
                                    const Icon = p.method === 'CASH' ? Banknote : CreditCard;
                                    const totalAll = data.paymentStats.reduce((s, x) => s + x.total, 0);
                                    const pct = totalAll > 0 ? Math.round(p.total / totalAll * 100) : 0;
                                    return (
                                        <div key={p.method} className="flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-1.5">
                                                <div className="w-2.5 h-2.5 rounded-full" style={{ background: i === 0 ? colors.success : colors.info }} />
                                                <Icon className="h-3 w-3 text-muted-foreground" />
                                                <span>{info.label}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono font-bold">{fmt(p.total)}</span>
                                                <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">{pct}%</Badge>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// ── Monthly Sales Trend ───────────────────────────────────────────────────────
function MonthlySalesChart({ data }: { data: AnalyticsData }) {
    const fmt = useFmt();
    const colors = useChartColors();
    const ts = TooltipStyle(colors);
    const chartData = [...data.monthlySales].reverse();

    return (
        <Card className="shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    نمو المبيعات الشهرية
                </CardTitle>
                <CardDescription className="text-xs">الإيرادات والمصاريف وصافي الربح على مدار 6 أشهر</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={colors.primary} stopOpacity={0.2} />
                                    <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.border} opacity={0.4} />
                            <XAxis dataKey="month" axisLine={false} tickLine={false} style={{ fontSize: '11px' }} stroke={colors.muted} />
                            <YAxis axisLine={false} tickLine={false} style={{ fontSize: '11px' }} stroke={colors.muted} tickFormatter={fmtK} />
                            <RT contentStyle={ts} formatter={((v: any, n: any) => [
                                `${fmt(v)} د.ع`,
                                n === 'revenue' ? 'الإيرادات' : n === 'expenses' ? 'المصاريف' : 'صافي الربح',
                            ]) as any} />
                            <Area type="monotone" dataKey="revenue" stroke={colors.primary} fill="url(#revGrad)" strokeWidth={2.5} dot={false} name="revenue" />
                            <Line type="monotone" dataKey="expenses" stroke={colors.warning} strokeWidth={1.5} dot={false} strokeDasharray="4 2" name="expenses" />
                            <Line type="monotone" dataKey="netProfit" stroke={colors.success} strokeWidth={2} dot={{ r: 3, fill: colors.success }} name="netProfit" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex items-center justify-center gap-5 mt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 rounded" style={{ background: colors.primary }} />الإيرادات</div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-px rounded border-t-2 border-dashed" style={{ borderColor: colors.warning }} />المصاريف</div>
                    <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 rounded" style={{ background: colors.success }} />صافي الربح</div>
                </div>
            </CardContent>
        </Card>
    );
}

// ── Top Items (with margin) ───────────────────────────────────────────────────
function TopItemsChart({ data }: { data: AnalyticsData }) {
    const fmt = useFmt();
    const colors = useChartColors();
    const ts = TooltipStyle(colors);

    return (
        <Card className="shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4 text-primary" />
                    الأصناف الأكثر مبيعاً
                </CardTitle>
                <CardDescription className="text-xs">الكمية والإيراد وهامش الربح لكل صنف</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.topItems.slice(0, 8)} layout="vertical" margin={{ top: 0, right: 60, left: 8, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={colors.border} opacity={0.3} />
                            <XAxis type="number" hide />
                            <YAxis
                                dataKey="name" type="category" axisLine={false} tickLine={false}
                                width={90} style={{ fontSize: '11px' }}
                                tickFormatter={n => n.length > 10 ? n.slice(0, 10) + '…' : n}
                            />
                            <RT
                                contentStyle={ts}
                                formatter={((v: any, n: any) => {
                                    if (n === 'quantity') return [v, 'الكمية'];
                                    if (n === 'revenue') return [`${fmt(v)} د.ع`, 'الإيراد'];
                                    return [v, n];
                                }) as any}
                            />
                            <Bar dataKey="quantity" fill={colors.primary} radius={[0, 4, 4, 0]} barSize={16} name="quantity">
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                {/* Margin table */}
                <div className="mt-3 space-y-1">
                    {data.topItems.slice(0, 5).map(item => (
                        <div key={item.name} className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground truncate max-w-[140px]">{item.name}</span>
                            <div className="flex items-center gap-2">
                                <span className="font-mono">{fmt(item.revenue)} د.ع</span>
                                {item.costSource !== 'missing' ? (
                                    <Badge
                                        variant="secondary"
                                        className={cn('h-4 px-1.5 text-[10px] font-bold',
                                            item.marginPct >= 60 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                            item.marginPct >= 30 ? 'bg-amber-100 text-amber-700' :
                                            'bg-red-100 text-red-700'
                                        )}
                                    >
                                        {item.marginPct}%
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="h-4 px-1.5 text-[10px] text-muted-foreground">بدون وصفة</Badge>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

// ── Peak Hours ────────────────────────────────────────────────────────────────
function PeakHoursChart({ data }: { data: AnalyticsData }) {
    const fmt = useFmt();
    const colors = useChartColors();
    const ts = TooltipStyle(colors);
    const sorted = [...data.peakHours].sort((a, b) => a.hour.localeCompare(b.hour));
    const maxCount = Math.max(...sorted.map(h => h.orderCount), 1);

    return (
        <Card className="shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    ساعات الذروة
                </CardTitle>
                <CardDescription className="text-xs">توزيع الطلبات حسب الساعة</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sorted} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={colors.border} opacity={0.3} />
                            <XAxis dataKey="hour" axisLine={false} tickLine={false} style={{ fontSize: '10px' }} stroke={colors.muted} />
                            <YAxis axisLine={false} tickLine={false} style={{ fontSize: '10px' }} stroke={colors.muted} />
                            <RT contentStyle={ts} formatter={(v: any) => [v, 'عدد الطلبات']} />
                            <Bar
                                dataKey="orderCount"
                                radius={[4, 4, 0, 0]}
                                name="orderCount"
                            >
                                {sorted.map((entry, i) => (
                                    <Cell
                                        key={i}
                                        fill={entry.orderCount === maxCount ? colors.warning : colors.primary}
                                        opacity={entry.orderCount === maxCount ? 1 : 0.7}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                {/* Peak hour callout */}
                {sorted.length > 0 && (() => {
                    const peak = sorted.reduce((a, b) => b.orderCount > a.orderCount ? b : a);
                    return (
                        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                            <div className="w-2 h-2 rounded-full bg-amber-400" />
                            ساعة الذروة: <strong className="text-foreground">{peak.hour}</strong>
                            — {peak.orderCount} طلب · {fmt(peak.revenue)} د.ع
                        </div>
                    );
                })()}
            </CardContent>
        </Card>
    );
}

// ── Slow Items + Customer Leaderboard + Inventory ─────────────────────────────
function BottomRow({ data }: { data: AnalyticsData }) {
    const fmt = useFmt();
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Slow items */}
            <Card className="shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-amber-500" />
                        أصناف تحتاج مراجعة
                    </CardTitle>
                    <CardDescription className="text-xs">الأقل مبيعاً — يُنصح بتقييمها</CardDescription>
                </CardHeader>
                <CardContent>
                    {data.slowItems.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-6">لا توجد بيانات كافية</p>
                    ) : (
                        <div className="space-y-2">
                            {data.slowItems.map((item, i) => (
                                <div key={item.name} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0">{i + 1}</span>
                                        <span className="truncate">{item.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className="font-mono text-muted-foreground">{item.quantity} قطعة</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Top spenders */}
            <Card className="shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Award className="h-4 w-4 text-amber-500" />
                        أفضل العملاء إنفاقاً
                    </CardTitle>
                    <CardDescription className="text-xs">
                        {data.customerStats.totalCustomers} عميل مسجل · +{data.customerStats.newThisMonth} هذا الشهر
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {data.customerStats.topSpenders.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-6">لا يوجد عملاء مسجلون</p>
                    ) : (
                        <div className="space-y-2">
                            {data.customerStats.topSpenders.map((c, i) => (
                                <div key={c.phone} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className={cn(
                                            'w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black shrink-0',
                                            i === 0 ? 'bg-amber-100 text-amber-700' :
                                            i === 1 ? 'bg-slate-100 text-slate-600' :
                                            'bg-orange-100 text-orange-700'
                                        )}>{i + 1}</span>
                                        <span className="truncate">{c.name || c.phone}</span>
                                    </div>
                                    <div className="shrink-0 text-left">
                                        <p className="font-mono font-bold">{fmt(c.totalSpent)} د.ع</p>
                                        {c.totalPoints > 0 && (
                                            <p className="text-[10px] text-amber-600">{c.totalPoints} نقطة</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Inventory alerts */}
            <Card className="shadow-sm">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Package className="h-4 w-4 text-red-500" />
                        تنبيهات المخزون
                    </CardTitle>
                    <CardDescription className="text-xs">المواد الأقل كمية في المخزن</CardDescription>
                </CardHeader>
                <CardContent>
                    {data.inventoryAlerts.lowStock.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-6">المخزون في حالة جيدة</p>
                    ) : (
                        <div className="space-y-2">
                            {data.inventoryAlerts.lowStock.slice(0, 6).map(m => (
                                <div key={m.name} className="flex items-center justify-between text-xs">
                                    <span className="truncate text-muted-foreground">{m.name}</span>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={cn(
                                            'font-mono font-bold',
                                            m.currentStock < 5 ? 'text-red-600' : 'text-amber-600',
                                        )}>
                                            {m.currentStock} {m.unit}
                                        </span>
                                        {m.currentStock < 5 && (
                                            <Badge variant="destructive" className="h-4 px-1 text-[10px]">منخفض</Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// ── Main Export ───────────────────────────────────────────────────────────────
export function AnalyticsCharts({ data }: { data: AnalyticsData }) {
    return (
        <div className="space-y-5">
            <DataQualityBanner dq={data.dataQuality} />
            <KpiCards data={data} />
            <Last7DaysRow data={data} />
            <MonthlySalesChart data={data} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <TopItemsChart data={data} />
                <PeakHoursChart data={data} />
            </div>
            <BottomRow data={data} />
        </div>
    );
}
