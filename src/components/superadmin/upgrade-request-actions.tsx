'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { approvePayment, rejectPayment } from '@/lib/actions/superadmin';

interface Props {
    paymentId: string;
}

export default function UpgradeRequestActions({ paymentId }: Props) {
    const [showRejectInput, setShowRejectInput] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [isPending, startTransition] = useTransition();
    const [done, setDone] = useState<'approved' | 'rejected' | null>(null);

    if (done === 'approved') {
        return <span className="text-xs text-green-600 font-semibold">✓ تمت الموافقة</span>;
    }
    if (done === 'rejected') {
        return <span className="text-xs text-red-600 font-semibold">✗ تم الرفض</span>;
    }

    function handleApprove() {
        startTransition(async () => {
            await approvePayment(paymentId);
            setDone('approved');
        });
    }

    function handleReject() {
        if (!rejectReason.trim()) return;
        startTransition(async () => {
            await rejectPayment(paymentId, rejectReason);
            setDone('rejected');
        });
    }

    if (showRejectInput) {
        return (
            <div className="flex items-center gap-2">
                <Input
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="سبب الرفض..."
                    className="h-8 text-xs w-40"
                    disabled={isPending}
                />
                <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 text-xs px-2"
                    onClick={handleReject}
                    disabled={isPending || !rejectReason.trim()}
                >
                    {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'رفض'}
                </Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs px-2" onClick={() => setShowRejectInput(false)} disabled={isPending}>
                    إلغاء
                </Button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs px-3 border-green-300 text-green-700 hover:bg-green-50"
                onClick={handleApprove}
                disabled={isPending}
            >
                {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <><CheckCircle2 className="w-3 h-3 ml-1" />موافقة</>}
            </Button>
            <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs px-3 border-red-300 text-red-700 hover:bg-red-50"
                onClick={() => setShowRejectInput(true)}
                disabled={isPending}
            >
                <XCircle className="w-3 h-3 ml-1" />رفض
            </Button>
        </div>
    );
}
