'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition, useEffect, useState } from 'react';
import { TransactionFormValues, transactionSchema } from '@/lib/validations/inventory';
import { createTransaction, getRawMaterials } from '@/lib/actions/inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { SheetFooter } from '@/components/ui/sheet';
import { RawMaterial } from '@prisma/client';

interface TransactionFormProps {
    onSuccess?: () => void;
    preSelectedMaterialId?: string;
}

export function TransactionForm({ onSuccess, preSelectedMaterialId }: TransactionFormProps) {
    const [isPending, startTransition] = useTransition();
    const [materials, setMaterials] = useState<RawMaterial[]>([]);

    useEffect(() => {
        getRawMaterials().then(setMaterials);
    }, []);

    const form = useForm<TransactionFormValues>({
        // @ts-expect-error - Resolver type mismatch with legacy form types
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            materialId: preSelectedMaterialId || '',
            type: 'PURCHASE',
            quantity: 1,
            cost: 0,
            notes: '',
        },
    });

    function onSubmit(data: TransactionFormValues) {
        startTransition(async () => {
            const result = await createTransaction(data);
            if (result.success) {
                onSuccess?.();
                form.reset();
            } else {
                // Handle error (ideally with toast)
                console.error(result.error);
            }
        });
    }

    return (
        <Form {...form}>
            {/* @ts-expect-error - SubmitHandler type mismatch with react-hook-form */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    control={form.control as any}
                    name="materialId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>المادة الأولية</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="اختر مادة" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {materials.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        control={form.control as any}
                        name="type"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>نوع العملية</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="PURCHASE">شراء (توريد)</SelectItem>
                                        <SelectItem value="USAGE">استخدام</SelectItem>
                                        <SelectItem value="WASTE">تلف / هدر</SelectItem>
                                        <SelectItem value="ADJUSTMENT">تعديل مخزون</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        control={form.control as any}
                        name="quantity"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>الكمية</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    control={form.control as any}
                    name="cost"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>التكلفة (اختياري)</FormLabel>
                            <FormControl>
                                <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    control={form.control as any}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>ملاحظات</FormLabel>
                            <FormControl>
                                <Input {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <SheetFooter>
                    <Button type="submit" disabled={isPending}>
                        {isPending ? 'جاري المعالجة...' : 'تسجيل المعاملة'}
                    </Button>
                </SheetFooter>
            </form>
        </Form>
    );
}
