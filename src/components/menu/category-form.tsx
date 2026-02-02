'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import { CategoryFormValues, categorySchema } from '@/lib/validations/menu';
import { createCategory } from '@/lib/actions/menu';
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
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface CategoryFormProps {
    onSuccess: () => void;
}

export function CategoryForm({ onSuccess }: CategoryFormProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const form = useForm<CategoryFormValues>({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            name: '',
            type: 'EASTERN',
        },
    });

    function onSubmit(data: CategoryFormValues) {
        startTransition(async () => {
            const res = await createCategory(data);
            if (res.success) {
                toast({
                    title: "تم إنشاء القسم بنجاح",
                });
                form.reset();
                onSuccess();
            } else {
                toast({
                    variant: "destructive",
                    title: "فشل إنشاء القسم",
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
                <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>النوع</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="اختر النوع" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="EASTERN">شرقي</SelectItem>
                                    <SelectItem value="WESTERN">غربي</SelectItem>
                                    <SelectItem value="BEVERAGE">مشروبات</SelectItem>
                                    <SelectItem value="DESSERT">حلويات</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <DialogFooter>
                    <Button type="submit" disabled={isPending}>انشاء قسم</Button>
                </DialogFooter>
            </form>
        </Form>
    );
}
