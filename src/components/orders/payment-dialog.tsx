'use client';

import { Order, OrderItem, MenuItem } from '@prisma/client';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { checkoutOrder } from '@/lib/actions/payments';
import { useState, useTransition } from 'react';
import { PaymentMethod } from '@prisma/client';
import { CreditCard, DollarSign } from 'lucide-react';

interface PaymentDialogProps {
    order: Order & { items: (OrderItem & { menuItem: MenuItem })[] };
}

export function PaymentDialog({ order }: PaymentDialogProps) {
    const [open, setOpen] = useState(false);
    const [method, setMethod] = useState<PaymentMethod>('CASH');
    const [isPending, startTransition] = useTransition();

    // Simple calculation (Tax/Service could be added here or in schema as defaults)
    // For now assuming totalAmount in Order is final.
    const total = order.totalAmount;

    const handlePayment = () => {
        startTransition(async () => {
            const res = await checkoutOrder(order.id, method, total);
            if (res.success) {
                setOpen(false);
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="w-full bg-green-600 hover:bg-green-700">
                    <DollarSign className="w-4 h-4 mr-2" /> إتمام الدفع
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>الدفع للطلب #{order.orderNumber}</DialogTitle>
                    <DialogDescription>
                        تأكيد الدفع وإغلاق هذا الطلب.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    <div className="flex justify-between items-center text-xl font-bold p-4 bg-muted rounded">
                        <span>المبلغ الإجمالي</span>
                        <span>{total.toFixed(0)} د.ع</span>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">طريقة الدفع</label>
                        <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="CASH">نقد</SelectItem>
                                <SelectItem value="CARD">بطاقة / شبكة</SelectItem>
                                <SelectItem value="ONLINE">أونلاين</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button onClick={handlePayment} disabled={isPending}>
                        {isPending ? 'جاري المعالجة...' : 'تأكيد الدفع'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
