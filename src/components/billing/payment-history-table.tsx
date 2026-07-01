'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, ExternalLink, FileText } from 'lucide-react';
import { useFmt } from '@/contexts/number-locale-context';

interface Payment {
    id: string;
    amount: number;
    method: string;
    status: string;
    plan: string;
    months: number;
    adminNote: string | null;
    invoiceNumber: number | null;
    periodFrom: Date | null;
    periodTo: Date | null;
    receiptUrl: string | null;
    receiptNote: string | null;
    createdAt: Date;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    PENDING: { label: 'قيد الانتظار', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    APPROVED: { label: 'مقبول', className: 'bg-green-100 text-green-700 border-green-200' },
    REJECTED: { label: 'مرفوض', className: 'bg-red-100 text-red-700 border-red-200' },
};

const _METHOD_LABELS: Record<string, string> = {
    BANK_TRANSFER: 'حوالة مصرفية',
    ZAIN_CASH: 'زين كاش',
    OTHER: 'أخرى',
};

const PLAN_LABELS: Record<string, string> = {
    BASIC: 'الأساسية',
    PRO: 'المتقدمة',
    ENTERPRISE: 'المؤسسات',
};

export default function PaymentHistoryTable({ payments }: { payments: Payment[] }) {
    const fmt = useFmt();
    if (payments.length === 0) {
        return (
            <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                    لا توجد مدفوعات سابقة
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    سجل المدفوعات
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">رقم الفاتورة</th>
                                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">التاريخ</th>
                                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">الخطة</th>
                                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">المبلغ</th>
                                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">الفترة</th>
                                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">الوصل</th>
                                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">الحالة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {payments.map(payment => {
                                const status = STATUS_CONFIG[payment.status] || STATUS_CONFIG.PENDING;
                                return (
                                    <tr key={payment.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 text-muted-foreground font-mono text-sm">
                                            {payment.invoiceNumber ? `#INV-${String(payment.invoiceNumber).padStart(4, '0')}` : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {new Date(payment.createdAt).toLocaleDateString('ar-SA')}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="font-medium">{PLAN_LABELS[payment.plan] || payment.plan}</span>
                                            <span className="text-xs text-muted-foreground mr-1">× {payment.months}</span>
                                        </td>
                                        <td className="px-4 py-3 font-bold">
                                            {fmt(payment.amount)} د.ع
                                        </td>
                                        <td className="px-4 py-3 text-xs text-muted-foreground">
                                            {payment.periodFrom && payment.periodTo ? (
                                                <span>
                                                    {new Date(payment.periodFrom).toLocaleDateString('ar-SA')} –{' '}
                                                    {new Date(payment.periodTo).toLocaleDateString('ar-SA')}
                                                </span>
                                            ) : '—'}
                                        </td>
                                        {/* وصل الدفع */}
                                        <td className="px-4 py-3">
                                            {payment.receiptUrl ? (
                                                <a
                                                    href={payment.receiptUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                                >
                                                    <FileText className="w-3.5 h-3.5" />
                                                    عرض
                                                    <ExternalLink className="w-3 h-3" />
                                                </a>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="space-y-1">
                                                <Badge variant="outline" className={`text-xs ${status.className}`}>
                                                    {status.label}
                                                </Badge>
                                                {payment.status === 'REJECTED' && payment.adminNote && (
                                                    <p className="text-xs text-red-600 max-w-[200px]">
                                                        السبب: {payment.adminNote}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>
    );
}
