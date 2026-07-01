'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { CheckCircle2, XCircle, ExternalLink, Loader2, Building2, Smartphone, ImageIcon } from 'lucide-react';
import { approvePayment, rejectPayment } from '@/lib/actions/superadmin';
import { useFmt } from '@/contexts/number-locale-context';

interface PaymentData {
    id: string;
    tenantName: string;
    tenantSlug: string;
    amount: number;
    method: string;
    plan: string;
    months: number;
    receiptUrl: string | null;
    receiptNote: string | null;
    createdAt: Date;
}

const METHOD_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
    BANK_TRANSFER: { label: 'حوالة مصرفية', icon: <Building2 className="w-3.5 h-3.5" /> },
    ZAIN_CASH: { label: 'زين كاش', icon: <Smartphone className="w-3.5 h-3.5" /> },
    OTHER: { label: 'أخرى', icon: null },
};

const PLAN_LABELS: Record<string, string> = {
    BASIC: 'الأساسية',
    PRO: 'المتقدمة',
    ENTERPRISE: 'المؤسسات',
};

export default function PaymentApprovalCard({ payment }: { payment: PaymentData }) {
    const fmt = useFmt();
    const [isPending, startTransition] = useTransition();
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [done, setDone] = useState(false);
    const [doneType, setDoneType] = useState<'approved' | 'rejected' | null>(null);

    function handleApprove() {
        startTransition(async () => {
            await approvePayment(payment.id);
            setDoneType('approved');
            setDone(true);
        });
    }

    function handleReject() {
        if (!rejectReason.trim()) return;
        startTransition(async () => {
            await rejectPayment(payment.id, rejectReason);
            setShowRejectDialog(false);
            setDoneType('rejected');
            setDone(true);
        });
    }

    const methodInfo = METHOD_LABELS[payment.method] || { label: payment.method, icon: null };

    if (done) {
        return (
            <Card className={`border-2 ${doneType === 'approved' ? 'border-green-300 bg-green-50/50' : 'border-red-300 bg-red-50/50'}`}>
                <CardContent className="pt-6 text-center py-8">
                    {doneType === 'approved' ? (
                        <div className="flex flex-col items-center gap-2 text-green-700">
                            <CheckCircle2 className="w-8 h-8" />
                            <p className="font-semibold">تم قبول الدفعة</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-2 text-red-700">
                            <XCircle className="w-8 h-8" />
                            <p className="font-semibold">تم رفض الدفعة</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    }

    return (
        <>
            <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-2">
                        <div>
                            <CardTitle className="text-base">{payment.tenantName}</CardTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">{payment.tenantSlug}</p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0">
                            {new Date(payment.createdAt).toLocaleDateString('ar-SA')}
                        </Badge>
                    </div>
                </CardHeader>

                <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                        <div className="bg-muted/50 rounded-lg p-2.5">
                            <p className="text-xs text-muted-foreground">المبلغ</p>
                            <p className="font-bold text-base">{fmt(payment.amount)} د.ع</p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-2.5">
                            <p className="text-xs text-muted-foreground">الخطة</p>
                            <p className="font-semibold">{PLAN_LABELS[payment.plan] || payment.plan} × {payment.months}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 text-muted-foreground">
                        {methodInfo.icon}
                        <span>{methodInfo.label}</span>
                    </div>

                    {payment.receiptNote && (
                        <p className="text-muted-foreground text-xs bg-muted/40 p-2 rounded">
                            ملاحظة: {payment.receiptNote}
                        </p>
                    )}

                    {payment.receiptUrl && (
                        payment.receiptUrl.startsWith('data:image') ? (
                            <div className="rounded-lg overflow-hidden border border-muted">
                                <div className="flex items-center gap-1.5 px-2 py-1.5 bg-muted/50 text-xs text-muted-foreground">
                                    <ImageIcon className="w-3.5 h-3.5" />
                                    صورة الإيصال
                                </div>
                                <img src={payment.receiptUrl} alt="إيصال الدفع" className="w-full max-h-52 object-contain bg-white" />
                            </div>
                        ) : (
                            <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary text-xs hover:underline">
                                <ExternalLink className="w-3.5 h-3.5" />
                                عرض الإيصال
                            </a>
                        )
                    )}
                </CardContent>

                <CardFooter className="pt-2 border-t gap-2">
                    <Button
                        size="sm"
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        onClick={handleApprove}
                        disabled={isPending}
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CheckCircle2 className="w-4 h-4 ml-1" /> قبول</>}
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() => setShowRejectDialog(true)}
                        disabled={isPending}
                    >
                        <XCircle className="w-4 h-4 ml-1" />
                        رفض
                    </Button>
                </CardFooter>
            </Card>

            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent dir="rtl">
                    <DialogHeader>
                        <DialogTitle>رفض الدفعة</DialogTitle>
                        <DialogDescription>
                            يرجى إدخال سبب الرفض. سيتم إرساله للمطعم عبر البريد الإلكتروني.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <Label>سبب الرفض</Label>
                        <Textarea
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            placeholder="مثال: الإيصال غير واضح، المبلغ غير صحيح..."
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectDialog(false)}>إلغاء</Button>
                        <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={!rejectReason.trim() || isPending}
                        >
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : null}
                            تأكيد الرفض
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
