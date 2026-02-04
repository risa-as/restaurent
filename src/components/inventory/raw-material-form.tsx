'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import { RawMaterialFormValues, rawMaterialSchema } from '@/lib/validations/inventory';
import { createRawMaterial, updateRawMaterial } from '@/lib/actions/inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RawMaterial } from '@prisma/client';
import { SheetFooter } from '@/components/ui/sheet';

interface RawMaterialFormProps {
    initialData?: RawMaterial | null;
    onSuccess?: () => void;
}

export function RawMaterialForm({ initialData, onSuccess }: RawMaterialFormProps) {
    const [isPending, startTransition] = useTransition();

    const form = useForm<RawMaterialFormValues>({
        resolver: zodResolver(rawMaterialSchema),
        defaultValues: initialData
            ? {
                name: initialData.name,
                unit: initialData.unit,
                currentStock: initialData.currentStock,
                minStockLevel: initialData.minStockLevel,
                costPerUnit: initialData.costPerUnit,
            }
            : {
                name: '',
                unit: 'kg',
                currentStock: 0,
                minStockLevel: 5,
                costPerUnit: 0,
            },
    });

    function onSubmit(data: RawMaterialFormValues) {
        startTransition(async () => {
            if (initialData) {
                await updateRawMaterial(initialData.id, data);
            } else {
                await createRawMaterial(data);
            }
            onSuccess?.();
        });
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>الاسم</FormLabel>
                            <FormControl>
                                <Input placeholder="طماطم" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>الوحدة</FormLabel>
                            <FormControl>
                                <Input placeholder="كغ، لتر، قطع" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="currentStock"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>المخزون</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="minStockLevel"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>الحد الأدنى</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <FormField
                    control={form.control}
                    name="costPerUnit"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>التكلفة لكل وحدة</FormLabel>
                            <FormControl>
                                <Input type="number" step="0.01" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <SheetFooter>
                    <Button type="submit" disabled={isPending}>
                        {isPending ? 'جاري الحفظ...' : initialData ? 'تحديث' : 'إنشاء'}
                    </Button>
                </SheetFooter>
            </form>
        </Form>
    );
}
