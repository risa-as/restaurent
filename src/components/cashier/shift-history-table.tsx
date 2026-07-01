'use client';

import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useFmt } from '@/contexts/number-locale-context';

interface Shift {
    id: string;
    openedAt: Date;
    closedAt: Date | null;
    openingCash: number;
    totalSales: number;
    totalCash: number;
    totalCard: number;
    cashVariance: number | null;
    cashier: { name: string | null; email: string };
}

function CashCardBar({ cash, card }: { cash: number; card: number }) {
    const total = cash + card;
    if (total === 0) return <span className="text-muted-foreground text-xs">—</span>;
    const cashPct = Math.round((cash / total) * 100);
    const cardPct = 100 - cashPct;
    return (
        <div className="min-w-[90px]">
            <div className="flex h-1.5 rounded-full overflow-hidden gap-px mb-1">
                {cashPct > 0 && <div className="bg-emerald-500" style={{ width: `${cashPct}%` }} />}
                {cardPct > 0 && <div className="bg-blue-500" style={{ width: `${cardPct}%` }} />}
            </div>
            <p className="text-[10px] text-muted-foreground">
                <span className="text-emerald-600 font-bold">{cashPct}%</span> نقد{' '}
                <span className="text-blue-600 font-bold">{cardPct}%</span> بطاقة
            </p>
        </div>
    );
}

export function ShiftHistoryTable({ shifts }: { shifts: Shift[] }) {
    const fmt = useFmt();
    if (shifts.length === 0) {
        return (
            <div className="text-center py-16 text-muted-foreground">
                لا توجد ورديات مسجلة خلال آخر 30 يوم
            </div>
        );
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="text-right">الكاشير</TableHead>
                    <TableHead className="text-right">وقت الفتح</TableHead>
                    <TableHead className="text-right">وقت الإغلاق</TableHead>
                    <TableHead className="text-right font-mono">إجمالي المبيعات</TableHead>
                    <TableHead className="text-right font-mono text-emerald-600">نقدي</TableHead>
                    <TableHead className="text-right font-mono text-blue-600">بطاقة</TableHead>
                    <TableHead className="text-right">توزيع النقد/البطاقة</TableHead>
                    <TableHead className="text-right font-mono">فرق الكاش</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {shifts.map(shift => {
                    const variance = shift.cashVariance;
                    return (
                        <TableRow key={shift.id}>
                            <TableCell>{shift.cashier.name || shift.cashier.email}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                                {format(new Date(shift.openedAt), 'dd/MM HH:mm', { locale: ar })}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                                {shift.closedAt
                                    ? format(new Date(shift.closedAt), 'dd/MM HH:mm', { locale: ar })
                                    : '—'}
                            </TableCell>
                            <TableCell className="font-mono font-bold">
                                {fmt(shift.totalSales)}
                            </TableCell>
                            <TableCell className="font-mono text-emerald-600">
                                {fmt(shift.totalCash)}
                            </TableCell>
                            <TableCell className="font-mono text-blue-600">
                                {fmt(shift.totalCard)}
                            </TableCell>
                            <TableCell>
                                <CashCardBar cash={shift.totalCash} card={shift.totalCard} />
                            </TableCell>
                            <TableCell>
                                {variance === null ? (
                                    <span className="text-muted-foreground">—</span>
                                ) : (
                                    <span className={`flex items-center gap-1 font-mono text-sm ${
                                        variance === 0 ? 'text-green-600' :
                                        variance > 0 ? 'text-blue-600' : 'text-red-600'
                                    }`}>
                                        {variance === 0 ? <Minus className="w-3 h-3" /> :
                                         variance > 0 ? <TrendingUp className="w-3 h-3" /> :
                                         <TrendingDown className="w-3 h-3" />}
                                        {variance >= 0 ? '+' : ''}{fmt(variance)}
                                    </span>
                                )}
                            </TableCell>
                            <TableCell>
                                {shift.closedAt ? (
                                    <Badge variant="secondary">مغلقة</Badge>
                                ) : (
                                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                        مفتوحة
                                    </Badge>
                                )}
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}
