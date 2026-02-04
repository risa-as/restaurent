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

interface SettlementTableProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bills: (Bill & { order: any })[]; // strict typing would be better but this removes explicit any array if I use local type or just define structure
    title: string;
    emptyMessage: string;
}

export function SettlementTable({ bills, title, emptyMessage }: SettlementTableProps) {
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
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">{title} ({bills.length})</h2>
                {selectedIds.length > 0 && (
                    <div className="flex items-center gap-4">
                        <span className="font-bold text-lg">المجموع المحدد: {totalAmount.toFixed(0)} د.ع</span>
                        <Button
                            onClick={handleSettle}
                            disabled={isPending}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {isPending && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                            <CheckCircle2 className="ml-2 h-4 w-4" />
                            تصفية المحدد ({selectedIds.length})
                        </Button>
                    </div>
                )}
            </div>

            <div className="border rounded-md bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]">
                                <Checkbox
                                    checked={bills.length > 0 && selectedIds.length === bills.length}
                                    onCheckedChange={toggleSelectAll}
                                />
                            </TableHead>
                            <TableHead className="text-right">رقم الطلب</TableHead>
                            <TableHead className="text-right">وقت الدفع</TableHead>
                            <TableHead className="text-right">المبلغ</TableHead>
                            <TableHead className="text-right">التفاصيل</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {bills.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    {emptyMessage}
                                </TableCell>
                            </TableRow>
                        ) : (
                            bills.map(bill => (
                                <TableRow key={bill.id}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedIds.includes(bill.id)}
                                            onCheckedChange={() => toggleSelect(bill.id)}
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">#{bill.order.orderNumber}</TableCell>
                                    <TableCell>{format(new Date(bill.paidAt), 'pp P', { locale: ar })}</TableCell>
                                    <TableCell className="font-bold text-green-600">{bill.amount.toFixed(0)} د.ع</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {bill.order.table ? `طاولة ${bill.order.table.number}` :
                                            bill.order.delivery ? `توصيل - ${bill.order.delivery.driver?.name || 'بدون سائق'}` : 'سفري'}
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
