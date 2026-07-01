'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { receiveGoods } from '@/lib/actions/purchase-orders';
import { Loader2, PackageCheck, CheckCircle2 } from 'lucide-react';
import { useFmt } from '@/contexts/number-locale-context';

interface POItem {
    id: string;
    orderedQty: number;
    receivedQty: number;
    unitCost: number;
    material: { name: string; unit: string };
}

interface PO {
    id: string;
    poNumber: string;
    items: POItem[];
}

export function ReceiveGoodsForm({ po, onSuccess }: { po: PO; onSuccess?: () => void }) {
    const fmt = useFmt();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [receivedData, setReceivedData] = useState<Record<string, { qty: number; expiry: string }>>(
        Object.fromEntries(
            po.items.map(item => [item.id, {
                qty: Math.max(0, item.orderedQty - item.receivedQty),
                expiry: ''
            }])
        )
    );

    const handleConfirm = () => {
        const items = po.items
            .map(item => ({
                poItemId: item.id,
                receivedQty: receivedData[item.id]?.qty ?? 0,
                expiryDate: receivedData[item.id]?.expiry
                    ? new Date(receivedData[item.id].expiry)
                    : undefined,
            }))
            .filter(i => i.receivedQty > 0);

        if (items.length === 0) {
            toast({ title: 'خطأ', description: 'أدخل كمية الاستلام لصنف واحد على الأقل', variant: 'destructive' });
            return;
        }

        startTransition(async () => {
            const result = await receiveGoods(po.id, items);
            if (result.error) {
                toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
            } else {
                toast({ title: '✅ تم تسجيل الاستلام بنجاح' });
                onSuccess?.();
            }
        });
    };

    const totalReceiving = po.items.reduce((sum, item) => {
        const qty = receivedData[item.id]?.qty ?? 0;
        return sum + qty * item.unitCost;
    }, 0);

    return (
        <div className="space-y-4 py-4" dir="rtl">
            <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 border">
                أدخل الكميات المستلمة فعلياً لكل صنف. يمكنك الاستلام الجزئي والباقي لاحقاً.
            </p>

            <div className="space-y-3">
                {po.items.map(item => {
                    const remaining = item.orderedQty - item.receivedQty;
                    const data = receivedData[item.id] ?? { qty: 0, expiry: '' };
                    const pctReceived = item.orderedQty > 0 ? (item.receivedQty / item.orderedQty) * 100 : 0;
                    const isFullyReceived = remaining <= 0;

                    return (
                        <div key={item.id} className={`rounded-xl border p-4 space-y-3 ${isFullyReceived ? 'opacity-60 bg-muted/20' : ''}`}>
                            {/* Item Header */}
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="font-semibold text-sm flex items-center gap-1.5">
                                        {isFullyReceived && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                                        {item.material.name}
                                    </p>
                                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                                        <span>مطلوب: <b className="text-foreground">{item.orderedQty}</b> {item.material.unit}</span>
                                        <span>مستلم: <b className={item.receivedQty > 0 ? 'text-green-600' : 'text-foreground'}>{item.receivedQty}</b></span>
                                        <span>متبقي: <b className={remaining > 0 ? 'text-amber-600' : 'text-green-600'}>{remaining}</b></span>
                                    </div>
                                </div>
                                <span className="text-xs font-mono text-muted-foreground border rounded-md px-2 py-1 bg-muted/30 shrink-0">
                                    {fmt(item.unitCost)} د.ع/وحدة
                                </span>
                            </div>

                            {/* Progress bar */}
                            {pctReceived > 0 && (
                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-green-500 rounded-full transition-all"
                                        style={{ width: `${Math.min(pctReceived, 100)}%` }}
                                    />
                                </div>
                            )}

                            {/* Inputs */}
                            {!isFullyReceived && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">الكمية المستلمة ({item.material.unit})</label>
                                        <Input
                                            type="number"
                                            min={0}
                                            max={remaining}
                                            value={data.qty}
                                            onChange={e => setReceivedData(prev => ({
                                                ...prev,
                                                [item.id]: { ...prev[item.id], qty: parseFloat(e.target.value) || 0 }
                                            }))}
                                            className="h-9 font-mono text-center"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-muted-foreground">تاريخ الانتهاء (اختياري)</label>
                                        <Input
                                            type="date"
                                            value={data.expiry}
                                            onChange={e => setReceivedData(prev => ({
                                                ...prev,
                                                [item.id]: { ...prev[item.id], expiry: e.target.value }
                                            }))}
                                            className="h-9 text-sm"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Total */}
            {totalReceiving > 0 && (
                <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                    <span className="text-sm font-semibold text-green-700">قيمة الاستلام الحالي</span>
                    <span className="font-bold font-mono text-green-700">
                        {fmt(totalReceiving)} د.ع
                    </span>
                </div>
            )}

            <Button onClick={handleConfirm} disabled={isPending} className="w-full h-10 gap-2 font-semibold">
                {isPending
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <PackageCheck className="w-4 h-4" />
                }
                تأكيد الاستلام
            </Button>
        </div>
    );
}
