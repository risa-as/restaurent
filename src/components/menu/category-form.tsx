'use client';

import { useForm, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import { CategoryFormValues, categorySchema } from '@/lib/validations/menu';
import { Branch, Category } from '@prisma/client';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { DialogFooter } from '@/components/ui/dialog';

interface CategoryFormProps {
    initialData?: Category;
    onSuccess: () => void;
    branches?: Branch[];
    defaultBranchId?: string | null;
}

export function CategoryForm({ initialData, onSuccess, branches, defaultBranchId }: CategoryFormProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const showBranchSelector = (branches?.length ?? 0) > 1;

    const form = useForm<CategoryFormValues>({
        resolver: zodResolver(categorySchema) as Resolver<CategoryFormValues>,
        defaultValues: {
            name: initialData?.name || '',
            branchId: (initialData as any)?.branchId ?? defaultBranchId ?? null,
        },
    });

    function onSubmit(data: CategoryFormValues) {
        startTransition(async () => {
            const res = initialData
                ? await updateCategory(initialData.id, data)
                : await createCategory(data);

            if (res.success) {
                toast({
                    title: initialData ? 'تم تحديث القسم بنجاح' : 'تم إنشاء القسم بنجاح',
                });
                if (!initialData) {
                    form.reset({
                        name: '',
                        branchId: defaultBranchId ?? null,
                    });
                }
                onSuccess();
                return;
            }

            toast({
                variant: 'destructive',
                title: initialData ? 'فشل تحديث القسم' : 'فشل إنشاء القسم',
            });
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

                {showBranchSelector && (
                    <FormField
                        control={form.control}
                        name="branchId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>الفرع</FormLabel>
                                <Select
                                    onValueChange={(v) => field.onChange(v === '__all__' ? null : v)}
                                    value={field.value ?? '__all__'}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="اختر الفرع" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="__all__">كل الفروع</SelectItem>
                                        {branches!.map(branch => (
                                            <SelectItem key={branch.id} value={branch.id}>
                                                {branch.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                <DialogFooter>
                    <Button type="submit" disabled={isPending}>
                        {isPending ? 'جارٍ الحفظ...' : initialData ? 'تحديث القسم' : 'إنشاء قسم'}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
