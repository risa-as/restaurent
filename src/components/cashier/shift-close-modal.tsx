'use client';

import { useState, useTransition } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { closeShift } from '@/lib/actions/shifts';
import { Loader2, TrendingUp, TrendingDown, Minus, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFmt } from '@/contexts/number-locale-context';

interface ShiftCloseModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    shiftId: string;
    openingCash: number;
    totalCash: number;
    totalCard: number;
    totalSales: number;
    onRefresh?: () => void | Promise<void>;
}

export function ShiftCloseModal({
    open,
    onOpenChange,
    shiftId,
    openingCash,
    totalCash,
    totalCard,
    totalSales,
    onRefresh,
}: ShiftCloseModalProps) {
    const fmt = useFmt();
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [physicalCash, setPhysicalCash] = useState('');

    const expectedCash = openingCash + totalCash;
    const enteredCash = parseFloat(physicalCash) || 0;
    const variance = enteredCash - expectedCash;

    const handleClose = () => {
        startTransition(async () => {
            const result = await closeShift(shiftId, enteredCash);
            if (result.error) {
                toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
            } else {
                const varDisplay = fmt(Math.abs(variance));
                toast({
                    title: '✅ تم إغلاق الوردية',
                    description: variance === 0
                        ? 'الكاش متطابق تماماً'
                        : variance > 0
                            ? `زيادة كاش: ${varDisplay} د.ع`
                            : `عجز كاش: ${varDisplay} د.ع`,
                });
                onOpenChange(false);
                await (onRefresh ? onRefresh() : router.refresh());
            }
        });
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="rounded-t-2xl">
                <SheetHeader className="mb-4">
                    <SheetTitle className="flex items-center gap-2">
                        <LogOut className="w-5 h-5" />
                        إغلاق الوردية
                    </SheetTitle>
                </SheetHeader>

                <div className="space-y-4">
                    {/* Summary */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-muted rounded-lg p-3 text-center">
                            <p className="text-xs text-muted-foreground mb-1">إجمالي المبيعات</p>
                            <p className="font-mono font-bold text-lg">{fmt(totalSales)}</p>
                        </div>
                        <div className="bg-muted rounded-lg p-3 text-center">
                            <p className="text-xs text-muted-foreground mb-1">مبيعات نقدية</p>
                            <p className="font-mono font-bold text-lg">{fmt(totalCash)}</p>
                        </div>
                        <div className="bg-muted rounded-lg p-3 text-center">
                            <p className="text-xs text-muted-foreground mb-1">مبيعات بطاقة</p>
                            <p className="font-mono font-bold text-lg">{fmt(totalCard)}</p>
                        </div>
                        <div className="bg-primary/10 rounded-lg p-3 text-center">
                            <p className="text-xs text-muted-foreground mb-1">الكاش المتوقع</p>
                            <p className="font-mono font-bold text-lg text-primary">{fmt(expectedCash)}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>الكاش الفعلي في الصندوق (د.ع)</Label>
                        <Input
                            type="number"
                            min={0}
                            placeholder="0"
                            value={physicalCash}
                            onChange={e => setPhysicalCash(e.target.value)}
                            className="text-left font-mono text-lg h-12"
                            dir="ltr"
                        />
                    </div>

                    {physicalCash && (
                        <div className={`flex items-center gap-2 p-3 rounded-lg font-mono font-bold ${
                            variance === 0 ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400' :
                            variance > 0 ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400' :
                            'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
                        }`}>
                            {variance === 0 ? <Minus className="w-4 h-4" /> :
                             variance > 0 ? <TrendingUp className="w-4 h-4" /> :
                             <TrendingDown className="w-4 h-4" />}
                            الفرق: {variance >= 0 ? '+' : ''}{fmt(variance)} د.ع
                        </div>
                    )}

                    <Button
                        onClick={handleClose}
                        disabled={isPending || !physicalCash}
                        variant="destructive"
                        className="w-full h-12 text-base gap-2"
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
                        تأكيد إغلاق الوردية
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
