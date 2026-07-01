'use client';

import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { openShift } from '@/lib/actions/shifts';
import { Loader2, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useFmt } from '@/contexts/number-locale-context';

interface ShiftOpenModalProps {
    /** Non-dismissable when required */
    required?: boolean;
    onRefresh?: () => void | Promise<void>;
}

export function ShiftOpenModal({ required = false, onRefresh }: ShiftOpenModalProps) {
    const fmt = useFmt();
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [openingCash, setOpeningCash] = useState('');
    const [open, setOpen] = useState(true);

    const handleOpen = () => {
        const cash = parseFloat(openingCash) || 0;
        startTransition(async () => {
            const result = await openShift(cash);
            if (result.error) {
                toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
            } else {
                toast({ title: '✅ تم فتح الوردية', description: `الكاش الابتدائي: ${fmt(cash)} د.ع` });
                setOpen(false);
                await (onRefresh ? onRefresh() : router.refresh());
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={required ? undefined : setOpen}>
            <DialogContent
                className="max-w-sm"
                onPointerDownOutside={required ? e => e.preventDefault() : undefined}
                onEscapeKeyDown={required ? e => e.preventDefault() : undefined}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-primary" />
                        فتح وردية جديدة
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 pt-2">
                    <p className="text-sm text-muted-foreground">
                        يجب فتح وردية قبل البدء بتسجيل المدفوعات. أدخل مبلغ الكاش الافتتاحي.
                    </p>

                    <div className="space-y-2">
                        <Label>الكاش الابتدائي (د.ع)</Label>
                        <Input
                            type="number"
                            min={0}
                            placeholder="0"
                            value={openingCash}
                            onChange={e => setOpeningCash(e.target.value)}
                            className="text-left font-mono text-lg h-12"
                            dir="ltr"
                            autoFocus
                        />
                    </div>

                    <Button
                        onClick={handleOpen}
                        disabled={isPending}
                        className="w-full h-12 text-base gap-2"
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                        فتح الوردية
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
