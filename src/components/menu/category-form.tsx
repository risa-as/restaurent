'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import { CategoryFormValues, categorySchema } from '@/lib/validations/menu';
import { Category } from '@prisma/client';
import { createCategory, updateCategory } from '@/lib/actions/menu';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { DialogFooter } from '@/components/ui/dialog';

interface CategoryFormProps {
    initialData?: Category;
    onSuccess: () => void;
}

export function CategoryForm({ initialData, onSuccess }: CategoryFormProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const form = useForm<CategoryFormValues>({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            name: initialData?.name || '',
        },
    });

    function onSubmit(data: CategoryFormValues) {
        startTransition(async () => {
            let res;
            if (initialData) {
                res = await updateCategory(initialData.id, data);
            } else {
                res = await createCategory(data);
            }

            if (res.success) {
                toast({
                    title: initialData ? "تم تحديث القسم بنجاح" : "تم إنشاء القسم بنجاح",
                });
                if (!initialData) {
                    form.reset();
                }
                onSuccess();
            } else {
                toast({
                    variant: "destructive",
                    title: initialData ? "فشل تحديث القسم" : "فشل إنشاء القسم",
                });
            }
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
                                <Input placeholder="مقبلات..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <DialogFooter>
                    <Button type="submit" disabled={isPending}>
                        {isPending ? 'جاري الحفظ...' : initialData ? 'تحديث القسم' : 'انشاء قسم'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
