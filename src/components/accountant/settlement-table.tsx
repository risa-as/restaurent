'use client';

import { useState, useTransition } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Bill } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { settleBills } from '@/lib/actions/accountant';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useFmt } from '@/contexts/number-locale-context';

interface SettlementTableProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bills: (Bill & { order: any })[]; // strict typing would be better but this removes explicit any array if I use local type or just define structure
    title: string;
    emptyMessage: string;
}

export function SettlementTable({ bills, title, emptyMessage }: SettlementTableProps) {
    const fmt = useFmt();
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isPending, startTransition] = useTransition();

    const toggleSelectAll = () => {
        if (selectedIds.length === bills.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(bills.map(b => b.id));
        }
    };

    const toggleSelect = (id: string) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(i => i !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const handleSettle = () => {
        if (selectedIds.length === 0) return;
        startTransition(async () => {
            await settleBills(selectedIds);
            setSelectedIds([]);
        });
    };

    const totalAmount = bills
        .filter(b => selectedIds.includes(b.id))
        .reduce((acc, b) => acc + b.amount, 0);

    return (
        <div className="space-y-4" dir="rtl">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h2 className="text-xl font-bold">{title}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {bills.length} فاتورة معلقة
                    </p>
                </div>
                {selectedIds.length > 0 && (
                    <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-2">
                        <div className="text-sm">
                            <span className="text-muted-foreground">المجموع المحدد: </span>
                            <span className="font-black text-green-600 dark:text-green-400 text-base">
                                {fmt(totalAmount)} د.ع
                            </span>
                        </div>
                        <Button
                            onClick={handleSettle}
                            disabled={isPending}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white gap-2"
                        >
                            {isPending
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <CheckCircle2 className="h-4 w-4" />
                            }
                            تصفية ({selectedIds.length})
                        </Button>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="w-14 px-4 text-center">
                                <Checkbox
                                    checked={bills.length > 0 && selectedIds.length === bills.length}
                                    onCheckedChange={toggleSelectAll}
                                />
                            </TableHead>
                            <TableHead className="font-bold text-foreground">رقم الطلب</TableHead>
                            <TableHead className="font-bold text-foreground">وقت الدفع</TableHead>
                            <TableHead className="font-bold text-foreground">المبلغ</TableHead>
                            <TableHead className="font-bold text-foreground">التفاصيل</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {bills.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-16 text-muted-foreground">
                                    <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
                                    <p className="font-medium">{emptyMessage}</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            bills.map((bill, index) => (
                                <TableRow
                                    key={bill.id}
                                    className={`
                                        transition-colors cursor-pointer
                                        ${selectedIds.includes(bill.id)
                                            ? 'bg-primary/5 hover:bg-primary/10'
                                            : index % 2 === 0
                                                ? 'bg-background hover:bg-muted/40'
                                                : 'bg-muted/20 hover:bg-muted/40'
                                        }
                                    `}
                                    onClick={() => toggleSelect(bill.id)}
                                >
                                    <TableCell className="px-4 text-center" onClick={e => e.stopPropagation()}>
                                        <Checkbox
                                            checked={selectedIds.includes(bill.id)}
                                            onCheckedChange={() => toggleSelect(bill.id)}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-bold text-primary">#{bill.order.orderNumber}</span>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {format(new Date(bill.paidAt), 'hh:mm a · dd/MM/yyyy', { locale: ar })}
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-black text-green-600 dark:text-green-400 text-base">
                                            {fmt(bill.amount)} د.ع
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center gap-1.5 text-sm bg-muted px-2.5 py-1 rounded-lg text-muted-foreground">
                                            {bill.order.table
                                                ? `🪑 طاولة ${bill.order.table.number}`
                                                : bill.order.delivery
                                                    ? `🚗 توصيل — ${bill.order.delivery.driver?.name || 'بدون سائق'}`
                                                    : '🥡 سفري'
                                            }
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
