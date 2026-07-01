'use client';

import { useTransition } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createModifierOption, updateModifierOption } from '@/lib/actions/modifiers';
import { modifierOptionSchema, type ModifierOptionFormValues } from '@/lib/validations/menu';
import { toast } from 'sonner';
import type { ModifierOption, RawMaterial } from '@prisma/client';

interface ModifierOptionFormProps {
    groupId: string;
    option?: ModifierOption;
    rawMaterials?: RawMaterial[];
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function ModifierOptionForm({ groupId, option, rawMaterials = [], onSuccess, onCancel }: ModifierOptionFormProps) {
    const [isPending, startTransition] = useTransition();

    const form = useForm<ModifierOptionFormValues>({
        // Cast: zod v4 input type (pre-coercion) differs from the form's output type.
        resolver: zodResolver(modifierOptionSchema) as Resolver<ModifierOptionFormValues>,
        defaultValues: {
            name: option?.name ?? '',
            nameAr: option?.nameAr ?? '',
            nameKu: option?.nameKu ?? '',
            nameEn: option?.nameEn ?? '',
            priceAdjustment: option?.priceAdjustment ?? 0,
            isDefault: option?.isDefault ?? false,
            sortOrder: option?.sortOrder ?? 0,
            rawMaterialId: option?.rawMaterialId ?? undefined,
            rawMaterialQty: option?.rawMaterialQty ?? undefined,
        },
    });

    function onSubmit(values: ModifierOptionFormValues) {
        startTransition(async () => {
            const res = option
                ? await updateModifierOption(option.id, values)
                : await createModifierOption({ ...values, groupId });
            if (res.error) {
                toast.error(res.error);
            } else {
                toast.success(option ? 'تم تحديث الخيار' : 'تم إضافة الخيار');
                onSuccess?.();
            }
        });
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                    <Label>الاسم *</Label>
                    <Input {...form.register('name')} placeholder="مثال: كبير" />
                    {form.formState.errors.name && (
                        <p className="text-xs text-destructive mt-1">{form.formState.errors.name.message}</p>
                    )}
                </div>
                <div>
                    <Label>الاسم بالعربي</Label>
                    <Input {...form.register('nameAr')} placeholder="اسم عربي" dir="rtl" />
                </div>
                <div>
                    <Label>الاسم بالكردية</Label>
                    <Input {...form.register('nameKu')} placeholder="ناوی كوردی" dir="rtl" />
                </div>
                <div>
                    <Label>تعديل السعر</Label>
                    <Input type="number" step="0.01" {...form.register('priceAdjustment')} />
                </div>
                <div>
                    <Label>الترتيب</Label>
                    <Input type="number" {...form.register('sortOrder')} />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Switch
                    id="isDefault"
                    checked={form.watch('isDefault')}
                    onCheckedChange={(v) => form.setValue('isDefault', v)}
                />
                <Label htmlFor="isDefault">افتراضي</Label>
            </div>

            {rawMaterials.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground">ربط بمادة خام (اختياري)</p>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label>المادة الخام</Label>
                            <Select
                                value={form.watch('rawMaterialId') ?? ''}
                                onValueChange={(v) => form.setValue('rawMaterialId', v || undefined)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر مادة خام" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">بدون</SelectItem>
                                    {rawMaterials.map(m => (
                                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>الكمية المستهلكة</Label>
                            <Input
                                type="number"
                                step="0.01"
                                {...form.register('rawMaterialQty')}
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={isPending} size="sm">
                    {isPending ? 'جاري الحفظ...' : option ? 'تحديث' : 'إضافة'}
                </Button>
                {onCancel && (
                    <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                        إلغاء
                    </Button>
                )}
            </div>
        </form>
    );
}
