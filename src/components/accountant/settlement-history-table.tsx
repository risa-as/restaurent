'use client';

import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface SettlementHistoryTableProps {
    bills: any[]; // Accommodating includes
    title: string;
    emptyMessage: string;
}

export function SettlementHistoryTable({ bills, title, emptyMessage }: SettlementHistoryTableProps) {
    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold">{title} ({bills.length})</h2>
            <div className="border rounded-md bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-right">رقم الطلب</TableHead>
                            <TableHead className="text-right">وقت التصفية</TableHead>
                            <TableHead className="text-right">المبلغ</TableHead>
                            <TableHead className="text-right">التفاصيل</TableHead>
                            <TableHead className="text-right">الحالة</TableHead>
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
                                    <TableCell className="font-medium">#{bill.order.orderNumber}</TableCell>
                                    <TableCell>
                                        {bill.settledAt
                                            ? format(new Date(bill.settledAt), 'pp P', { locale: ar })
                                            : '-'}
                                    </TableCell>
                                    <TableCell className="font-bold text-green-600">{bill.amount.toFixed(0)} د.ع</TableCell>
                                    <TableCell className="text-muted-foreground text-sm">
                                        {bill.order.table ? `طاولة ${bill.order.table.number}` :
                                            bill.order.delivery ? `توصيل - ${bill.order.delivery.driver?.name || 'بدون سائق'}` : 'سفري'}
                                    </TableCell>
                                    <TableCell>
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            تمت التصفية
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
