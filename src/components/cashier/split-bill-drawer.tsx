'use client';

import { useState, useTransition } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { createEqualSplit, createItemSplit, settlePartialBill, getOrderSplits } from '@/lib/actions/splits';
import { CheckCircle2, Banknote, CreditCard, Loader2, Users, ListChecks } from 'lucide-react';
import { useEffect } from 'react';
import { useFmt } from '@/contexts/number-locale-context';

interface OrderItem {
    id: string;
    quantity: number;
    totalPrice: number;
    menuItem: { name: string };
}

interface Split {
    id: string;
    splitIndex: number;
    totalAmount: number;
    isPaid: boolean;
    bill: { paymentMethod: string } | null;
}

interface SplitBillDrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    orderId: string;
    totalAmount: number;
    items: OrderItem[];
    onSettled?: () => void;
}

export function SplitBillDrawer({
    open,
    onOpenChange,
    orderId,
    totalAmount,
    items,
    onSettled,
}: SplitBillDrawerProps) {
    const fmt = useFmt();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [nWay, setNWay] = useState(2);
    const [splits, setSplits] = useState<Split[]>([]);
    const [itemAssignments, setItemAssignments] = useState<Map<string, number>>(new Map());
    const [nParts, setNParts] = useState(2);
    const [loadingSplitId, setLoadingSplitId] = useState<string | null>(null);

    // Load existing splits when drawer opens
    useEffect(() => {
        if (!open) return;
        getOrderSplits(orderId).then(result => setSplits(result as Split[]));
    }, [open, orderId]);

    const handleEqualSplit = () => {
        startTransition(async () => {
            const result = await createEqualSplit(orderId, nWay);
            if (result.error) {
                toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
            } else {
                const updated = await getOrderSplits(orderId);
                setSplits(updated as Split[]);
                toast({ title: `✅ تم التقسيم إلى ${nWay} أجزاء متساوية` });
            }
        });
    };

    const handleItemSplit = () => {
        const assignments: { orderItemIds: string[]; splitIndex: number }[] = [];
        for (let i = 1; i <= nParts; i++) {
            const itemIds = items
                .filter(item => itemAssignments.get(item.id) === i)
                .map(item => item.id);
            if (itemIds.length > 0) {
                assignments.push({ orderItemIds: itemIds, splitIndex: i });
            }
        }

        if (assignments.length === 0) {
            toast({ title: 'خطأ', description: 'يجب تعيين الأصناف للأجزاء', variant: 'destructive' });
            return;
        }

        startTransition(async () => {
            const result = await createItemSplit(orderId, assignments);
            if (result.error) {
                toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
            } else {
                const updated = await getOrderSplits(orderId);
                setSplits(updated as Split[]);
                toast({ title: '✅ تم التقسيم حسب الأصناف' });
            }
        });
    };

    const handlePay = (splitId: string, paymentMethod: string) => {
        setLoadingSplitId(splitId);
        startTransition(async () => {
            const result = await settlePartialBill(splitId, paymentMethod);
            if (result.error) {
                toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
            } else {
                const updated = await getOrderSplits(orderId);
                setSplits(updated as Split[]);
                toast({ title: '✅ تم الدفع' });
                const allPaid = (updated as Split[]).every(s => s.isPaid);
                if (allPaid) {
                    onSettled?.();
                    onOpenChange(false);
                }
            }
            setLoadingSplitId(null);
        });
    };

    const portionAmount = Math.round((totalAmount / nWay) * 100) / 100;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
                <SheetHeader className="mb-4">
                    <SheetTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        تقسيم الفاتورة
                        <Badge variant="outline" className="font-mono mr-auto">
                            {fmt(totalAmount)} د.ع
                        </Badge>
                    </SheetTitle>
                </SheetHeader>

                <Tabs defaultValue="equal">
                    <TabsList className="w-full mb-4">
                        <TabsTrigger value="equal" className="flex-1 gap-2">
                            <Users className="w-4 h-4" />
                            تقسيم متساوٍ
                        </TabsTrigger>
                        <TabsTrigger value="items" className="flex-1 gap-2">
                            <ListChecks className="w-4 h-4" />
                            تقسيم حسب الأصناف
                        </TabsTrigger>
                    </TabsList>

                    {/* Equal split tab */}
                    <TabsContent value="equal" className="space-y-4">
                        <div className="flex items-center gap-4">
                            <Label className="whitespace-nowrap">عدد الأشخاص</Label>
                            <Input
                                type="number"
                                min={2}
                                max={20}
                                value={nWay}
                                onChange={e => setNWay(Math.max(2, parseInt(e.target.value) || 2))}
                                className="w-24 text-center font-mono text-lg"
                            />
                            <span className="text-muted-foreground text-sm">
                                {fmt(portionAmount)} د.ع / شخص
                            </span>
                        </div>
                        <Button onClick={handleEqualSplit} disabled={isPending} className="w-full">
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                            تقسيم إلى {nWay} أجزاء متساوية
                        </Button>
                    </TabsContent>

                    {/* Item split tab */}
                    <TabsContent value="items" className="space-y-4">
                        <div className="flex items-center gap-4 mb-2">
                            <Label className="whitespace-nowrap">عدد الأجزاء</Label>
                            <Input
                                type="number"
                                min={2}
                                max={10}
                                value={nParts}
                                onChange={e => {
                                    setNParts(Math.max(2, parseInt(e.target.value) || 2));
                                    setItemAssignments(new Map());
                                }}
                                className="w-20 text-center"
                            />
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                            {items.map(item => (
                                <div key={item.id} className="flex items-center justify-between gap-2">
                                    <span className="text-sm flex-1">{item.menuItem.name} ×{item.quantity}</span>
                                    <div className="flex gap-1">
                                        {Array.from({ length: nParts }, (_, i) => i + 1).map(part => (
                                            <button
                                                key={part}
                                                onClick={() => setItemAssignments(prev => {
                                                    const next = new Map(prev);
                                                    if (next.get(item.id) === part) next.delete(item.id);
                                                    else next.set(item.id, part);
                                                    return next;
                                                })}
                                                className={`w-7 h-7 rounded-full text-xs font-bold border-2 transition-colors ${
                                                    itemAssignments.get(item.id) === part
                                                        ? 'bg-primary text-primary-foreground border-primary'
                                                        : 'border-muted-foreground/30 text-muted-foreground hover:border-primary'
                                                }`}
                                            >
                                                {part}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button onClick={handleItemSplit} disabled={isPending} className="w-full">
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                            تطبيق التقسيم
                        </Button>
                    </TabsContent>
                </Tabs>

                {/* T112: Portion payment flow */}
                {splits.length > 0 && (
                    <div className="mt-6 space-y-3">
                        <h3 className="font-bold text-sm text-muted-foreground">الأجزاء</h3>
                        {splits.map(split => (
                            <div
                                key={split.id}
                                className={`rounded-lg border p-4 ${split.isPaid ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800' : 'bg-card'}`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="font-semibold">الجزء {split.splitIndex}</span>
                                    <span className="font-mono font-bold text-lg">
                                        {fmt(split.totalAmount)} د.ع
                                    </span>
                                </div>

                                {split.isPaid ? (
                                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm font-medium">
                                        <CheckCircle2 className="w-4 h-4" />
                                        مدفوع
                                        {split.bill && (
                                            <span className="text-muted-foreground">
                                                ({split.bill.paymentMethod === 'CASH' ? 'نقدي' : 'بطاقة'})
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button
                                            size="sm"
                                            disabled={isPending && loadingSplitId === split.id}
                                            onClick={() => handlePay(split.id, 'CASH')}
                                            className="gap-2"
                                        >
                                            {isPending && loadingSplitId === split.id
                                                ? <Loader2 className="w-3 h-3 animate-spin" />
                                                : <Banknote className="w-3 h-3" />}
                                            دفع نقدي
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            disabled={isPending && loadingSplitId === split.id}
                                            onClick={() => handlePay(split.id, 'CARD')}
                                            className="gap-2"
                                        >
                                            <CreditCard className="w-3 h-3" />
                                            بطاقة
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
