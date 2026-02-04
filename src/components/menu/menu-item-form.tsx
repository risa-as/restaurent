'use client';

import { Resolver, useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition, useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { MenuItemFormValues, menuItemSchema } from '@/lib/validations/menu';
import { createMenuItem, updateMenuItem } from '@/lib/actions/menu';
import { getRawMaterials } from '@/lib/actions/inventory';
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
    FormDescription,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { SheetFooter } from '@/components/ui/sheet';
import { Category, MenuItem, RawMaterial, RecipeItem } from '@prisma/client';
import { Plus, Trash2 } from 'lucide-react';
import { ImageUpload } from '@/components/common/image-upload';

interface MenuItemFormProps {
    categories: Category[];
    initialData?: MenuItem & { recipe: (RecipeItem & { material: RawMaterial })[] };
    onSuccess: () => void;
}

export function MenuItemForm({ categories, initialData, onSuccess }: MenuItemFormProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const [materials, setMaterials] = useState<RawMaterial[]>([]);

    useEffect(() => {
        getRawMaterials().then(setMaterials);
    }, []);

    const form = useForm<MenuItemFormValues>({
        resolver: zodResolver(menuItemSchema) as Resolver<MenuItemFormValues>,
        defaultValues: initialData ? {
            name: initialData.name,
            description: initialData.description || '',
            price: initialData.price,
            categoryId: initialData.categoryId,
            image: initialData.image || '',
            isAvailable: initialData.isAvailable,
            recipe: initialData.recipe.map(r => ({ materialId: r.materialId, quantity: r.quantity }))
        } : {
            name: '',
            description: '',
            price: 0,
            categoryId: '',
            image: '',
            isAvailable: true,
            recipe: []
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "recipe",
    });

    function onSubmit(data: MenuItemFormValues) {
        startTransition(async () => {
            let res;
            if (initialData) {
                res = await updateMenuItem(initialData.id, data);
            } else {
                res = await createMenuItem(data);
            }

            if (res.success) {
                toast({
                    title: initialData ? "تم تحديث العنصر بنجاح" : "تم إنشاء العنصر بنجاح",
                });
                onSuccess();
            } else {
                toast({
                    variant: "destructive",
                    title: initialData ? "فشل تحديث العنصر" : "فشل إنشاء العنصر",
                });
            }
        });
    }

    // Calculate generic cost estimate based on selected ingredients for UI feedback
    const watchedRecipe = form.watch("recipe");
    const estimatedCost = watchedRecipe?.reduce((acc, item) => {
        const mat = materials.find(m => m.id === item.materialId);
        return acc + (item.quantity * (mat?.costPerUnit || 0));
    }, 0) || 0;

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                    <h3 className="text-lg font-medium">المعلومات الأساسية</h3>
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>الاسم</FormLabel>
                                <FormControl>
                                    <Input placeholder="برغر" {...field} />
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
                                    <Textarea placeholder="وصف الطبق ومكوناته..." className="resize-none" {...field} />
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
                                        {categories.map(c => {
                                            const typeMap: Record<string, string> = {
                                                EASTERN: "شرقي",
                                                WESTERN: "غربي",
                                                BEVERAGE: "مشروبات",
                                                DESSERT: "حلويات"
                                            };
                                            return (
                                                <SelectItem key={c.id} value={c.id}>{c.name} ({typeMap[c.type] || c.type})</SelectItem>
                                            )
                                        })}
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
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 shadow-sm h-full items-center">
                                    <FormControl>
                                        <Checkbox
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                        <FormLabel>
                                            متاح
                                        </FormLabel>
                                    </div>
                                </FormItem>
                            )}
                        />
                    </div>
                    <FormField
                        control={form.control}
                        name="image"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>صورة الصنف</FormLabel>
                                <FormControl>
                                    <ImageUpload
                                        value={field.value || ''}
                                        onChange={field.onChange}
                                        onRemove={() => field.onChange('')}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-medium">الوصفة</h3>
                        <Button type="button" variant="outline" size="sm" onClick={() => append({ materialId: '', quantity: 0 })}>
                            <Plus className="h-4 w-4 mr-2" /> إضافة مكون
                        </Button>
                    </div>

                    {fields.map((field, index) => (
                        <div key={field.id} className="flex items-end gap-2">
                            <FormField
                                control={form.control}
                                name={`recipe.${index}.materialId`}
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormControl>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="المكون" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {materials.map(m => (
                                                        <SelectItem key={m.id} value={m.id}>{m.name} ({m.unit})</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`recipe.${index}.quantity`}
                                render={({ field }) => (
                                    <FormItem className="w-24">
                                        <FormControl>
                                            <Input type="number" step="0.001" placeholder="الكمية" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                        </div>
                    ))}

                    {fields.length > 0 && (
                        <div className="bg-muted p-2 rounded text-sm text-right">
                            التكلفة التقديرية: <span className="font-bold">{estimatedCost.toFixed(0)} د.ع</span>
                            <span className="mx-2">|</span>
                            هامش الربح: <span className={estimatedCost > form.getValues('price') ? "text-red-500 font-bold" : "text-green-600 font-bold"}>
                                {form.getValues('price') > 0 ? (((form.getValues('price') - estimatedCost) / form.getValues('price')) * 100).toFixed(1) : 0}%
                            </span>
                        </div>
                    )}
                </div>

                <SheetFooter>
                    <Button type="submit" disabled={isPending}>{isPending ? 'جاري الحفظ...' : initialData ? 'تحديث العنصر' : 'انشاء العنصر'}</Button>
                </SheetFooter>
            </form>
        </Form>
    );
}
