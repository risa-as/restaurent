import { getMenuAnalysis } from '@/lib/actions/menu';
export const metadata = {
    title: 'تحليل القائمة',
};

export const dynamic = 'force-dynamic';

import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, ChefHat, BarChart2, AlertTriangle, Star } from 'lucide-react';

function fmt(n: number) {
    return n.toLocaleString('ar-IQ', { maximumFractionDigits: 0 });
}

function MarginBar({ pct, max }: { pct: number; max: number }) {
    const width = max > 0 ? Math.round((pct / max) * 100) : 0;
    const color = pct > 60 ? 'bg-emerald-500' : pct > 30 ? 'bg-amber-400' : 'bg-red-400';
    const textColor = pct > 60 ? 'text-emerald-600' : pct > 30 ? 'text-amber-600' : 'text-red-600';
    return (
        <div className="flex items-center gap-2 min-w-[130px]">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
            </div>
            <span className={`text-xs font-bold w-11 text-left tabular-nums ${textColor}`}>
                {pct.toFixed(1)}%
            </span>
        </div>
    );
}

export default async function MenuAnalysisPage() {
    const analysis = await getMenuAnalysis();

    const totalItems = analysis.length;
    const avgMargin = totalItems > 0
        ? analysis.reduce((s, i) => s + i.marginPct, 0) / totalItems
        : 0;
    const highCount = analysis.filter(i => i.marginPct > 60).length;
    const lowCount  = analysis.filter(i => i.marginPct < 30).length;
    const maxMargin = analysis.length > 0 ? analysis[0].marginPct : 100;

    return (
        <div className="space-y-6" dir="rtl">

            {/* ── Header ── */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                    <BarChart2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">تحليل ربحية القائمة</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        مقارنة هامش الربح لكل صنف مرتبط بوصفة — مرتبة تنازلياً
                    </p>
                </div>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-primary/30 bg-primary/5">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">متوسط هامش الربح</CardTitle>
                        <TrendingUp className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-primary">{avgMargin.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground mt-1">من {totalItems} صنف محلل</p>
                    </CardContent>
                </Card>

                <Card className="border-emerald-200 dark:border-emerald-800">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">أصناف عالية الربح</CardTitle>
                        <Star className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-emerald-600">{highCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">هامش أعلى من 60%</p>
                    </CardContent>
                </Card>

                <Card className="border-amber-200 dark:border-amber-800">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">أصناف منخفضة الربح</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-amber-600">{lowCount}</div>
                        <p className="text-xs text-muted-foreground mt-1">هامش أقل من 30%</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي الأصناف</CardTitle>
                        <ChefHat className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{totalItems}</div>
                        <p className="text-xs text-muted-foreground mt-1">مرتبطة بوصفات</p>
                    </CardContent>
                </Card>
            </div>

            {/* ── Table ── */}
            <Card className="shadow-sm border-border/60">
                <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                    <CardTitle className="text-base font-semibold">تفاصيل الأصناف</CardTitle>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            عالٍ &gt;60%
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400" />
                            متوسط 30–60%
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-400" />
                            منخفض &lt;30%
                        </span>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40 hover:bg-muted/40">
                                <TableHead className="text-right w-12">#</TableHead>
                                <TableHead className="text-right">الصنف</TableHead>
                                <TableHead className="text-right">القسم</TableHead>
                                <TableHead className="text-right font-mono">السعر</TableHead>
                                <TableHead className="text-right font-mono">التكلفة</TableHead>
                                <TableHead className="text-right font-mono">صافي الربح</TableHead>
                                <TableHead className="text-right">هامش الربح</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {analysis.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-32 text-muted-foreground">
                                        لا توجد عناصر مرتبطة بوصفات.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                analysis.map((item, idx) => {
                                    const tier = item.marginPct > 60 ? 'high' : item.marginPct > 30 ? 'mid' : 'low';
                                    const rank = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : String(idx + 1);
                                    const profitColor = tier === 'high'
                                        ? 'text-emerald-600'
                                        : tier === 'mid'
                                        ? 'text-amber-600'
                                        : 'text-red-600';

                                    return (
                                        <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="text-center text-sm font-mono text-muted-foreground">
                                                {rank}
                                            </TableCell>
                                            <TableCell className="font-semibold">{item.name}</TableCell>
                                            <TableCell>
                                                {item.category ? (
                                                    <Badge variant="outline" className="text-xs font-normal">
                                                        {item.category.name}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="font-mono text-sm tabular-nums">
                                                {fmt(item.price)}<span className="text-muted-foreground text-xs mr-0.5"> د.ع</span>
                                            </TableCell>
                                            <TableCell className="font-mono text-sm text-muted-foreground tabular-nums">
                                                {fmt(item.cost)}<span className="text-xs mr-0.5"> د.ع</span>
                                            </TableCell>
                                            <TableCell className={`font-mono text-sm font-bold tabular-nums ${profitColor}`}>
                                                +{fmt(item.margin)}<span className="text-xs mr-0.5"> د.ع</span>
                                            </TableCell>
                                            <TableCell>
                                                <MarginBar pct={item.marginPct} max={maxMargin} />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
