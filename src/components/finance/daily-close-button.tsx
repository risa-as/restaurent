'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
    performDailyClose, getTodayDailyClose, getRecentDailyCloses,
    getDailyClosePreview, DailyClosePreview,
} from '@/lib/actions/finance';
import {
    Lock, Loader2, CheckCircle2, TrendingUp, TrendingDown,
    Banknote, CreditCard, Receipt, History, Printer, ChevronDown, ChevronUp,
    Calendar, AlertTriangle, ShoppingCart, ClipboardList, StickyNote, Package,
    RefreshCw,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useFmt } from '@/contexts/number-locale-context';

type CloseRecord = {
    id: string;
    date: Date;
    totalSales: number;
    totalCash: number;
    totalCard: number;
    totalCogs: number;
    totalExpenses: number;
    netProfit: number;
    notes?: string | null;
    closedBy: { name: string } | null;
};

function StatRow({
    label, value, icon: Icon, valueClass = '', dimmed = false,
}: {
    label: string; value: number; icon: React.ElementType; valueClass?: string; dimmed?: boolean;
}) {
    const fmt = useFmt();
    return (
        <div className={cn('flex items-center justify-between py-2', dimmed && 'opacity-70')}>
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
            </div>
            <span className={cn('font-bold font-mono text-sm tabular-nums', valueClass)}>
                {fmt(value)} د.ع
            </span>
        </div>
    );
}

function PaymentSplit({ cash, card }: { cash: number; card: number }) {
    const fmt = useFmt();
    return (
        <div className="grid grid-cols-2 gap-2 py-2">
            <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2">
                <Banknote className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground leading-none mb-0.5">نقد</p>
                    <p className="font-bold font-mono text-xs tabular-nums truncate">{fmt(cash)} د.ع</p>
                </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-muted/60 px-3 py-2">
                <CreditCard className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground leading-none mb-0.5">بطاقة</p>
                    <p className="font-bold font-mono text-xs tabular-nums truncate">{fmt(card)} د.ع</p>
                </div>
            </div>
        </div>
    );
}

function NetProfitBanner({ value }: { value: number }) {
    const fmt = useFmt();
    const positive = value >= 0;
    return (
        <div className={cn(
            'rounded-xl p-4 text-center border-2 mt-1',
            positive
                ? 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
                : 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800',
        )}>
            <div className="flex items-center justify-center gap-1.5 mb-1">
                {positive
                    ? <TrendingUp className="h-4 w-4 text-green-600" />
                    : <TrendingDown className="h-4 w-4 text-red-600" />}
                <p className="text-xs text-muted-foreground font-medium">صافي الربح</p>
            </div>
            <p className={cn(
                'text-3xl font-black tabular-nums tracking-tight',
                positive ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400',
            )}>
                {positive ? '' : '−'}{fmt(Math.abs(value))} د.ع
            </p>
        </div>
    );
}

// ─── Already-closed summary ──────────────────────────────────────────────────
function CloseResultCard({ record }: { record: CloseRecord }) {
    const fmt = useFmt();
    const dateLabel = format(new Date(record.date), 'EEEE d MMMM yyyy', { locale: ar });
    const profitPositive = record.netProfit >= 0;

    const handlePrint = () => {
        const win = window.open('', '_blank', 'width=420,height=680');
        if (!win) return;
        win.document.write(`
            <html dir="rtl"><head><title>إغلاق يومي — ${dateLabel}</title>
            <style>body{font-family:Tajawal,Arial,sans-serif;padding:24px;direction:rtl}
            h2{text-align:center;margin-bottom:4px}p.date{text-align:center;color:#666;font-size:13px;margin-bottom:16px}
            table{width:100%;border-collapse:collapse}td{padding:8px 4px;border-bottom:1px solid #eee;font-size:14px}
            td:last-child{text-align:left;font-weight:bold}
            .sub td{color:#888;font-size:12px;padding-right:16px}
            .net{font-size:20px;font-weight:900;color:${profitPositive ? '#16a34a' : '#dc2626'}}
            .net-row td{border-top:2px solid #333;padding-top:12px}
            .notes{margin-top:16px;font-size:12px;color:#666;border-top:1px dashed #ccc;padding-top:12px}
            </style></head><body>
            <h2>تقرير الإغلاق اليومي</h2>
            <p class="date">${dateLabel}${record.closedBy ? ` · أُغلق بواسطة: ${record.closedBy.name}` : ''}</p>
            <table>
              <tr><td>إجمالي المبيعات</td><td>${fmt(record.totalSales)} د.ع</td></tr>
              <tr class="sub"><td>— نقد</td><td>${fmt(record.totalCash)} د.ع</td></tr>
              <tr class="sub"><td>— بطاقة</td><td>${fmt(record.totalCard)} د.ع</td></tr>
              <tr><td>تكلفة البضاعة (COGS)</td><td style="color:#b45309">${fmt(record.totalCogs ?? 0)} د.ع</td></tr>
              <tr><td>المصاريف</td><td style="color:#dc2626">${fmt(record.totalExpenses)} د.ع</td></tr>
              <tr class="net-row"><td>صافي الربح</td><td class="net">${fmt(record.netProfit)} د.ع</td></tr>
            </table>
            ${record.notes ? `<div class="notes"><strong>ملاحظات:</strong> ${record.notes}</div>` : ''}
            </body></html>
        `);
        win.document.close();
        win.print();
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div>
                        <p className="font-bold text-sm">تم الإغلاق اليومي</p>
                        <p className="text-xs text-muted-foreground">{dateLabel}</p>
                    </div>
                </div>
                <Button size="sm" variant="ghost" className="gap-1.5 text-xs" onClick={handlePrint}>
                    <Printer className="h-3.5 w-3.5" />
                    طباعة
                </Button>
            </div>

            <Separator />

            <div className="divide-y divide-border/60">
                <StatRow label="إجمالي المبيعات" value={record.totalSales} icon={Receipt} valueClass="text-primary" />
                <PaymentSplit cash={record.totalCash} card={record.totalCard} />
                <StatRow label="تكلفة البضاعة" value={record.totalCogs ?? 0} icon={Package} valueClass="text-amber-600" />
                <StatRow label="المصاريف" value={record.totalExpenses} icon={TrendingDown} valueClass="text-destructive" />
            </div>

            <NetProfitBanner value={record.netProfit} />

            {record.closedBy && (
                <p className="text-center text-xs text-muted-foreground">أُغلق بواسطة: {record.closedBy.name}</p>
            )}
            {record.notes && (
                <div className="rounded-lg bg-muted/50 border px-3 py-2 text-xs text-muted-foreground flex gap-2">
                    <StickyNote className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>{record.notes}</span>
                </div>
            )}
        </div>
    );
}

// ─── Preview section (before closing) ────────────────────────────────────────
function PreviewStats({ preview, isRefreshing, onRefresh }: {
    preview: DailyClosePreview;
    isRefreshing: boolean;
    onRefresh: () => void;
}) {
    const fmt = useFmt();
    const profitPositive = preview.netProfit >= 0;
    return (
        <div className="space-y-3">
            {/* Warnings */}
            {(preview.openOrdersCount > 0 || preview.openShiftsCount > 0) && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 text-xs font-bold">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        تحذيرات قبل الإغلاق
                    </div>
                    {preview.openOrdersCount > 0 && (
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 text-xs">
                            <ShoppingCart className="h-3.5 w-3.5 shrink-0" />
                            <span>يوجد <strong>{preview.openOrdersCount}</strong> طلب مفتوح لم يُكتمل</span>
                        </div>
                    )}
                    {preview.openShiftsCount > 0 && (
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500 text-xs">
                            <ClipboardList className="h-3.5 w-3.5 shrink-0" />
                            <span>يوجد <strong>{preview.openShiftsCount}</strong> وردية كاشير لم تُغلق</span>
                        </div>
                    )}
                </div>
            )}

            {/* Live numbers */}
            <div className="rounded-xl border bg-muted/30 p-3 space-y-0.5">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground">أرقام اليوم الحالية</p>
                    <button
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
                        title="تحديث"
                    >
                        <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
                    </button>
                </div>

                <div className="divide-y divide-border/50">
                    <StatRow label="إجمالي المبيعات" value={preview.totalSales} icon={Receipt} valueClass="text-primary" />
                    <PaymentSplit cash={preview.totalCash} card={preview.totalCard} />
                    <StatRow label="تكلفة البضاعة" value={preview.totalCogs} icon={Package} valueClass="text-amber-600" />
                    <StatRow label="المصاريف" value={preview.totalExpenses} icon={TrendingDown} valueClass="text-destructive" />
                </div>

                <div className={cn(
                    'mt-3 flex items-center justify-between rounded-lg px-3 py-2.5 border',
                    profitPositive
                        ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800'
                        : 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800',
                )}>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        {profitPositive
                            ? <TrendingUp className="h-3.5 w-3.5 text-green-600" />
                            : <TrendingDown className="h-3.5 w-3.5 text-red-600" />}
                        صافي الربح المتوقع
                    </div>
                    <span className={cn(
                        'font-black font-mono text-lg tabular-nums',
                        profitPositive ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400',
                    )}>
                        {profitPositive ? '' : '−'}{fmt(Math.abs(preview.netProfit))} د.ع
                    </span>
                </div>
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function DailyCloseButton() {
    const fmt = useFmt();
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const [todayRecord, setTodayRecord] = useState<CloseRecord | null | undefined>(undefined);
    const [preview, setPreview] = useState<DailyClosePreview | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [history, setHistory] = useState<CloseRecord[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [notes, setNotes] = useState('');

    const loadAll = useCallback(() => {
        startTransition(async () => {
            const [today, recent, prev] = await Promise.all([
                getTodayDailyClose(),
                getRecentDailyCloses(7),
                getDailyClosePreview(),
            ]);
            setTodayRecord(today as CloseRecord | null);
            setHistory(recent as CloseRecord[]);
            setPreview(prev);
        });
    }, []);

    const refreshPreview = useCallback(async () => {
        setPreviewLoading(true);
        try {
            const prev = await getDailyClosePreview();
            setPreview(prev);
        } finally {
            setPreviewLoading(false);
        }
    }, []);

    useEffect(() => { loadAll(); }, [loadAll]);

    const handleClose = () => {
        startTransition(async () => {
            const res = await performDailyClose(notes.trim() || undefined);
            if (res.error) {
                toast({ title: 'خطأ', description: res.error, variant: 'destructive' });
            } else if (res.success) {
                toast({ title: 'تم الإغلاق اليومي بنجاح' });
                setNotes('');
                loadAll();
            }
        });
    };

    const todayLabel = format(new Date(), 'EEEE d MMMM', { locale: ar });
    const isLoading = todayRecord === undefined || isPending;

    return (
        <Card className="w-full" dir="rtl">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Lock className="h-4 w-4 text-amber-500" />
                        الإغلاق اليومي
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs gap-1">
                            <Calendar className="h-3 w-3" />
                            {todayLabel}
                        </Badge>
                        {!isLoading && todayRecord === null && (
                            <Badge variant="secondary" className="text-xs text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-700">
                                لم يُغلق بعد
                            </Badge>
                        )}
                        {!isLoading && todayRecord && (
                            <Badge className="text-xs bg-green-600 hover:bg-green-600">مُغلق ✓</Badge>
                        )}
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {isLoading ? (
                    <div className="flex items-center justify-center py-10">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : todayRecord ? (
                    <CloseResultCard record={todayRecord} />
                ) : (
                    <div className="space-y-4">
                        {/* Live preview */}
                        {preview && (
                            <PreviewStats
                                preview={preview}
                                isRefreshing={previewLoading}
                                onRefresh={refreshPreview}
                            />
                        )}

                        <Separator />

                        {/* Notes */}
                        <div className="space-y-1.5">
                            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                                <StickyNote className="h-3.5 w-3.5" />
                                ملاحظات (اختياري)
                            </label>
                            <Textarea
                                placeholder="أي ملاحظات تريد إرفاقها مع هذا الإغلاق..."
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={2}
                                className="resize-none text-sm"
                            />
                        </div>

                        {/* Confirm button */}
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    className="w-full gap-2 bg-amber-600 hover:bg-amber-700 text-white h-11 font-bold"
                                    disabled={isPending}
                                >
                                    {isPending
                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                        : <Lock className="h-4 w-4" />}
                                    إغلاق يوم {todayLabel}
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent dir="rtl" className="max-w-md">
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="flex items-center gap-2">
                                        <Lock className="h-5 w-5 text-amber-500" />
                                        تأكيد الإغلاق اليومي
                                    </AlertDialogTitle>
                                    <AlertDialogDescription asChild>
                                        <div className="space-y-3 text-sm">
                                            <p>سيتم حفظ الأرقام التالية كسجل دائم غير قابل للتعديل ليوم <strong>{todayLabel}</strong>:</p>

                                            {preview && (
                                                <div className="rounded-lg border bg-muted/40 divide-y text-foreground">
                                                    <div className="flex justify-between px-3 py-2 text-xs">
                                                        <span className="text-muted-foreground">إجمالي المبيعات</span>
                                                        <span className="font-bold font-mono">{fmt(preview.totalSales)} د.ع</span>
                                                    </div>
                                                    <div className="flex justify-between px-3 py-2 text-xs">
                                                        <span className="text-muted-foreground">نقد</span>
                                                        <span className="font-mono">{fmt(preview.totalCash)} د.ع</span>
                                                    </div>
                                                    <div className="flex justify-between px-3 py-2 text-xs">
                                                        <span className="text-muted-foreground">بطاقة</span>
                                                        <span className="font-mono">{fmt(preview.totalCard)} د.ع</span>
                                                    </div>
                                                    <div className="flex justify-between px-3 py-2 text-xs">
                                                        <span className="text-muted-foreground">تكلفة البضاعة</span>
                                                        <span className="font-mono text-amber-600">{fmt(preview.totalCogs)} د.ع</span>
                                                    </div>
                                                    <div className="flex justify-between px-3 py-2 text-xs">
                                                        <span className="text-muted-foreground">المصاريف</span>
                                                        <span className="font-mono text-destructive">{fmt(preview.totalExpenses)} د.ع</span>
                                                    </div>
                                                    <div className={cn(
                                                        'flex justify-between px-3 py-2.5 rounded-b-lg',
                                                        preview.netProfit >= 0 ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20',
                                                    )}>
                                                        <span className="text-xs font-medium">صافي الربح</span>
                                                        <span className={cn(
                                                            'font-black font-mono text-sm',
                                                            preview.netProfit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600',
                                                        )}>
                                                            {preview.netProfit >= 0 ? '' : '−'}{fmt(Math.abs(preview.netProfit))} د.ع
                                                        </span>
                                                    </div>
                                                </div>
                                            )}

                                            {(preview?.openOrdersCount ?? 0) > 0 && (
                                                <p className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5 text-xs font-medium">
                                                    <AlertTriangle className="h-3.5 w-3.5" />
                                                    تحذير: يوجد {preview!.openOrdersCount} طلب لم يُكتمل بعد
                                                </p>
                                            )}
                                        </div>
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter className="flex-row-reverse gap-2">
                                    <AlertDialogAction
                                        onClick={handleClose}
                                        disabled={isPending}
                                        className="bg-amber-600 hover:bg-amber-700 gap-2"
                                    >
                                        {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                                        نعم، أغلق اليوم
                                    </AlertDialogAction>
                                    <AlertDialogCancel disabled={isPending}>إلغاء</AlertDialogCancel>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                )}

                {/* Recent history */}
                {history.length > 0 && (
                    <div className="pt-1 border-t">
                        <button
                            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full py-1"
                            onClick={() => setShowHistory(v => !v)}
                        >
                            <History className="h-3.5 w-3.5" />
                            سجل الإغلاقات الأخيرة ({history.length})
                            {showHistory
                                ? <ChevronUp className="h-3 w-3 mr-auto" />
                                : <ChevronDown className="h-3 w-3 mr-auto" />}
                        </button>

                        {showHistory && (
                            <div className="mt-2 text-xs border rounded-lg overflow-hidden">
                                <div className="grid grid-cols-5 bg-muted px-3 py-2 font-medium text-muted-foreground">
                                    <span>التاريخ</span>
                                    <span className="text-left">المبيعات</span>
                                    <span className="text-left">نقد</span>
                                    <span className="text-left">بطاقة</span>
                                    <span className="text-left">الربح</span>
                                </div>
                                {history.map(h => {
                                    const profitable = h.netProfit >= 0;
                                    return (
                                        <div key={h.id} className="grid grid-cols-5 px-3 py-2 border-t hover:bg-muted/40 transition-colors">
                                            <span className="text-muted-foreground">
                                                {format(new Date(h.date), 'd/M/yy')}
                                            </span>
                                            <span className="text-left font-mono tabular-nums">
                                                {fmt(h.totalSales)}
                                            </span>
                                            <span className="text-left font-mono tabular-nums text-emerald-600">
                                                {fmt(h.totalCash)}
                                            </span>
                                            <span className="text-left font-mono tabular-nums text-blue-600">
                                                {fmt(h.totalCard)}
                                            </span>
                                            <span className={cn(
                                                'text-left font-mono font-bold tabular-nums',
                                                profitable ? 'text-green-600' : 'text-red-600',
                                            )}>
                                                {profitable ? '+' : '−'}{fmt(Math.abs(h.netProfit))}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
