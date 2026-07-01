'use client';

import { Resolver, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import { Branch, Category, MenuItem, RawMaterial, RecipeItem } from '@prisma/client';

import { useToast } from '@/hooks/use-toast';
import { MenuItemFormValues, menuItemSchema } from '@/lib/validations/menu';
import { createMenuItem, updateMenuItem } from '@/lib/actions/menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { ImageUpload } from '@/components/common/image-upload';

interface MenuItemFormProps {
    categories: Category[];
    initialData?: MenuItem & { recipe: (RecipeItem & { material: RawMaterial })[]; images?: string[] };
    onSuccess: () => void;
    branches?: Branch[];
    defaultBranchId?: string | null;
}

export function MenuItemForm({ categories, initialData, onSuccess, branches, defaultBranchId }: MenuItemFormProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const showBranchSelector = (branches?.length ?? 0) > 1;

    const form = useForm<MenuItemFormValues>({
        resolver: zodResolver(menuItemSchema) as Resolver<MenuItemFormValues>,
        defaultValues: initialData ? {
            name: initialData.name,
            description: initialData.description || '',
            price: initialData.price,
            categoryId: initialData.categoryId,
            images: initialData.images || (initialData.image ? [initialData.image] : []),
            isAvailable: initialData.isAvailable,
            recipe: initialData.recipe.map((r) => ({ materialId: r.materialId, quantity: r.quantity })),
            branchId: (initialData as MenuItem & { branchId?: string | null }).branchId ?? defaultBranchId ?? null,
        } : {
            name: '',
            description: '',
            price: 0,
            categoryId: '',
            images: [],
            isAvailable: true,
            recipe: [],
            branchId: defaultBranchId ?? null,
        },
    });

    function onSubmit(data: MenuItemFormValues) {
        startTransition(async () => {
            const res = initialData
                ? await updateMenuItem(initialData.id, data)
                : await createMenuItem(data);

            if (res.success) {
                toast({
                    title: initialData ? 'تم تحديث الصنف بنجاح' : 'تم إنشاء الصنف بنجاح',
                });
                onSuccess();
                return;
            }

            if ((res as { upgradeRequired?: boolean; error?: string }).upgradeRequired) {
                toast({
                    variant: 'destructive',
                    title: 'حد الخطة',
                    description: `${res.error} - قم بترقية الخطة من صفحة الفوترة`,
                });
                return;
            }

            toast({
                variant: 'destructive',
                title: initialData ? 'فشل تحديث الصنف' : 'فشل إنشاء الصنف',
            });
        });
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>اسم الصنف</FormLabel>
                            <FormControl>
                                <Input placeholder="برغر كلاسيك" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>الوصف</FormLabel>
                            <FormControl>
                                <Textarea placeholder="وصف مختصر للطبق..." className="resize-none" rows={2} {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>القسم</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="اختر القسم" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {categories.map((category) => (
                                        <SelectItem key={category.id} value={category.id}>
                                            {category.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>السعر (د.ع)</FormLabel>
                                <FormControl>
                                    <Input type="number" step="0.01" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="isAvailable"
                        render={({ field }) => (
                            <FormItem className="flex h-full flex-row items-center space-x-3 space-y-0 rounded-md border p-4 shadow-sm">
                                <FormControl>
                                    <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel>متاح للبيع</FormLabel>
                                </div>
                            </FormItem>
                        )}
                    />
                </div>

                {showBranchSelector && (
                    <FormField
                        control={form.control}
                        name="branchId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>الفرع</FormLabel>
                                <Select
                                    onValueChange={(value) => field.onChange(value === '__all__' ? null : value)}
                                    value={field.value ?? '__all__'}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="اختر الفرع" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="__all__">كل الفروع</SelectItem>
                                        {branches!.map((branch) => (
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

                <FormField
                    control={form.control}
                    name="images"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>صورة الصنف</FormLabel>
                            <FormControl>
                                <ImageUpload
                                    value={field.value || []}
                                    onChange={field.onChange}
                                    onRemove={(imageUrl) => {
                                        field.onChange((field.value || []).filter((value) => value !== imageUrl));
                                    }}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* تنبيه لربط الوصفة لاحقًا */}
                {!initialData && (
                    <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-700/50 dark:bg-amber-950/20 dark:text-amber-400">
                        💡 بعد إنشاء الصنف، توجّه إلى صفحة <strong>الوصفات</strong> لربطه بمكوناته وحساب تكلفته.
                    </div>
                )}

                <SheetFooter>
                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? 'جارٍ الحفظ...' : initialData ? 'تحديث الصنف' : 'إنشاء الصنف'}
                    </Button>
                </SheetFooter>
            </form>
        </Form>
    );
}
