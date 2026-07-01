'use client';

import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, Banknote } from 'lucide-react';
import { useFmt } from '@/contexts/number-locale-context';

interface SettledBill {
    id: string;
    amount: number;
    paidAt: Date;
    settledAt?: Date | null;
    order: {
        orderNumber: number;
        table?: { number: number } | null;
        delivery?: { driver?: { name: string | null } | null } | null;
        waiter?: { name: string | null } | null;
    };
}

export function SettledBillsTable({ bills, emptyMessage }: { bills: SettledBill[]; emptyMessage?: string }) {
    const fmt = useFmt();
    if (bills.length === 0) {
        return (
            <div className="text-center py-16 text-muted-foreground">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">{emptyMessage ?? 'لا توجد تصفيات مسجلة'}</p>
            </div>
        );
    }

    const total = bills.reduce((s, b) => s + b.amount, 0);

    return (
        <div className="space-y-3" dir="rtl">
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{bills.length} فاتورة مصفّاة</p>
                <div className="flex items-center gap-1.5 text-sm font-bold text-green-600">
                    <Banknote className="h-4 w-4" />
                    {fmt(total)} د.ع
                </div>
            </div>
            <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/40 hover:bg-muted/40">
                            <TableHead className="font-bold text-foreground text-right">رقم الطلب</TableHead>
                            <TableHead className="font-bold text-foreground text-right">وقت الدفع</TableHead>
                            <TableHead className="font-bold text-foreground text-right">وقت التصفية</TableHead>
                            <TableHead className="font-bold text-foreground text-right">المبلغ</TableHead>
                            <TableHead className="font-bold text-foreground text-right">التفاصيل</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {bills.map(bill => (
                            <TableRow key={bill.id} className="hover:bg-muted/30">
                                <TableCell>
                                    <span className="font-bold text-primary">#{bill.order.orderNumber}</span>
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                    {format(new Date(bill.paidAt), 'hh:mm a · dd/MM/yyyy', { locale: ar })}
                                </TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                    {bill.settledAt
                                        ? format(new Date(bill.settledAt), 'hh:mm a · dd/MM/yyyy', { locale: ar })
                                        : '—'}
                                </TableCell>
                                <TableCell>
                                    <span className="font-black text-green-600 dark:text-green-400">
                                        {fmt(bill.amount)} د.ع
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <span className="inline-flex items-center gap-1.5 text-xs bg-muted px-2.5 py-1 rounded-lg text-muted-foreground">
                                        {bill.order.table
                                            ? `🪑 طاولة ${bill.order.table.number}`
                                            : bill.order.delivery
                                                ? `🚗 توصيل — ${bill.order.delivery.driver?.name ?? 'بدون سائق'}`
                                                : '🥡 سفري'}
                                    </span>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
