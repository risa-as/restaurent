'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import type { ShiftDiscrepancy } from '@/lib/actions/reports';
import { useFmt, useDateTimeFmt } from '@/contexts/number-locale-context';

function DiscrepancyBadge({ value }: { value: number }) {
    const fmt = useFmt();
    if (Math.abs(value) < 0.01) return <span className="text-green-600 font-mono text-xs">0</span>;
    const color = value < 0 ? 'text-red-500' : 'text-amber-600';
    return <span className={`font-mono text-xs ${color}`}>{value > 0 ? '+' : ''}{fmt(Math.round(value))}</span>;
}

function ShiftRow({ shift }: { shift: ShiftDiscrepancy }) {
    const fmt = useFmt();
    const dtFmt = useDateTimeFmt();
    const [open, setOpen] = useState(false);
    const hasIssue = shift.hasSystemDiscrepancy || shift.hasPhysicalDiscrepancy;

    return (
        <div className={`border rounded-lg overflow-hidden transition-colors ${hasIssue ? 'border-amber-200 dark:border-amber-800' : 'border-border'}`}>
            <button
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-right hover:bg-muted/30 transition-colors"
                onClick={() => setOpen(v => !v)}
            >
                <div className="shrink-0">
                    {hasIssue
                        ? <AlertTriangle className="h-4 w-4 text-amber-500" />
                        : <CheckCircle2 className="h-4 w-4 text-green-500" />}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{shift.cashierName}</p>
                    <p className="text-xs text-muted-foreground">
                        {dtFmt(shift.openedAt)}
                        {shift.closedAt ? ` ← ${dtFmt(shift.closedAt)}` : ' (مفتوحة)'}
                    </p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                    <div className="text-left">
                        <p className="text-xs text-muted-foreground">فارق المبيعات</p>
                        <DiscrepancyBadge value={shift.salesDiscrepancy} />
                    </div>
                    <div className="text-left">
                        <p className="text-xs text-muted-foreground">فارق النقد</p>
                        <DiscrepancyBadge value={shift.cashDiscrepancy} />
                    </div>
                    {shift.physicalVariance !== null && (
                        <div className="text-left">
                            <p className="text-xs text-muted-foreground">العد الفعلي</p>
                            <DiscrepancyBadge value={shift.physicalVariance} />
                        </div>
                    )}
                    {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
            </button>

            {open && (
                <div className="border-t bg-muted/10 px-4 py-3 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">المبيعات المسجلة</p>
                        <p className="font-mono font-bold">{fmt(Math.round(shift.recordedTotal))} د.ع</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">المبيعات الفعلية (الفواتير)</p>
                        <p className="font-mono font-bold">{fmt(Math.round(shift.actualTotal))} د.ع</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">فارق المبيعات</p>
                        <p className={`font-mono font-bold ${Math.abs(shift.salesDiscrepancy) < 0.01 ? 'text-green-600' : 'text-red-500'}`}>
                            {fmt(Math.round(shift.salesDiscrepancy))} د.ع
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">نقد مسجل</p>
                        <p className="font-mono">{fmt(Math.round(shift.recordedCash))} د.ع</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">نقد فعلي (الفواتير)</p>
                        <p className="font-mono">{fmt(Math.round(shift.actualCash))} د.ع</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground mb-1">فارق النقد</p>
                        <p className={`font-mono font-bold ${Math.abs(shift.cashDiscrepancy) < 0.01 ? 'text-green-600' : 'text-red-500'}`}>
                            {fmt(Math.round(shift.cashDiscrepancy))} د.ع
                        </p>
                    </div>
                    {shift.openingCash !== undefined && shift.openingCash !== null && (
                        <>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">رصيد الافتتاح</p>
                                <p className="font-mono">{fmt(Math.round(shift.openingCash))} د.ع</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">الرصيد المتوقع</p>
                                <p className="font-mono">{shift.expectedCash !== null ? `${fmt(Math.round(shift.expectedCash!))} د.ع` : '—'}</p>
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground mb-1">الرصيد عند الإغلاق</p>
                                <p className="font-mono">{shift.closingCashEntered !== null ? `${fmt(Math.round(shift.closingCashEntered!))} د.ع` : '—'}</p>
                            </div>
                        </>
                    )}
                    {shift.physicalVariance !== null && (
                        <div className="col-span-2 md:col-span-3">
                            <p className="text-xs text-muted-foreground mb-1">التباين الفعلي (عند العد)</p>
                            <p className={`font-mono font-bold ${Math.abs(shift.physicalVariance) < 0.01 ? 'text-green-600' : 'text-amber-600'}`}>
                                {fmt(Math.round(shift.physicalVariance))} د.ع
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export function DiscrepancyReport({ shifts }: { shifts: ShiftDiscrepancy[] }) {
    if (shifts.length === 0) {
        return (
            <div className="text-center py-16 text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>لا توجد ورديات للفترة المحددة</p>
            </div>
        );
    }

    const withIssues = shifts.filter(s => s.hasSystemDiscrepancy || s.hasPhysicalDiscrepancy);
    const clean = shifts.filter(s => !s.hasSystemDiscrepancy && !s.hasPhysicalDiscrepancy);

    return (
        <div className="space-y-5" dir="rtl">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card className="shadow-sm">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-muted-foreground mb-1">إجمالي الورديات</p>
                        <p className="text-2xl font-black">{shifts.length}</p>
                    </CardContent>
                </Card>
                <Card className={`shadow-sm ${withIssues.length > 0 ? 'border-amber-200' : ''}`}>
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-muted-foreground mb-1">ورديات بها تناقضات</p>
                        <p className={`text-2xl font-black ${withIssues.length > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                            {withIssues.length}
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm col-span-2 md:col-span-1">
                    <CardContent className="pt-4 pb-3">
                        <p className="text-xs text-muted-foreground mb-1">ورديات سليمة</p>
                        <p className="text-2xl font-black text-green-600">{clean.length}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Issues first */}
            {withIssues.length > 0 && (
                <Card className="shadow-sm border-amber-200">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-amber-700">
                            <AlertTriangle className="h-4 w-4" />
                            ورديات تحتاج مراجعة ({withIssues.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {withIssues.map(s => <ShiftRow key={s.id} shift={s} />)}
                    </CardContent>
                </Card>
            )}

            {/* Clean shifts */}
            {clean.length > 0 && (
                <Card className="shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-green-700">
                            <CheckCircle2 className="h-4 w-4" />
                            ورديات سليمة ({clean.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {clean.map(s => <ShiftRow key={s.id} shift={s} />)}
                    </CardContent>
                </Card>
            )}

            {/* Legend */}
            <div className="flex items-center gap-6 text-xs text-muted-foreground px-1">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    لا تناقض
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    فارق في المبيعات أو النقد
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    فارق كبير
                </div>
            </div>
        </div>
    );
}
