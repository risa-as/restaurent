'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState, useTransition } from 'react';
import { OfferFormValues, offerSchema } from '@/lib/validations/menu';
import { createOffer, updateOffer } from '@/lib/actions/menu';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Branch, MenuItem, Offer } from '@prisma/client';
import { CalendarIcon, LayoutGrid, UtensilsCrossed, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';
import { SheetFooter } from '@/components/ui/sheet';

interface CategoryOption {
    id: string;
    name: string;
}

interface OfferFormProps {
    menuItems: MenuItem[];
    categories?: CategoryOption[];
    onSuccess: () => void;
    branches?: Branch[];
    defaultBranchId?: string | null;
    initialData?: Offer & { menuItems: MenuItem[] };
}

type SelectionMode = 'all' | 'category' | 'items';

export function OfferForm({ menuItems, categories = [], onSuccess, branches, defaultBranchId, initialData }: OfferFormProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const [selectionMode, setSelectionMode] = useState<SelectionMode>(
        initialData ? 'items' : 'items'
    );
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
    const showBranchSelector = (branches?.length ?? 0) > 1;
    const isEditing = !!initialData;

    const form = useForm<OfferFormValues>({
        // @ts-expect-error - Resolver type mismatch with legacy form types
        resolver: zodResolver(offerSchema),
        defaultValues: {
            name: initialData?.name ?? '',
            discountPct: initialData?.discountPct ?? 10,
            startDate: initialData?.startDate ? new Date(initialData.startDate) : new Date(),
            endDate: initialData?.endDate ? new Date(initialData.endDate) : new Date(),
            menuItemIds: initialData?.menuItems?.map(i => i.id) ?? [],
            isActive: initialData?.isActive ?? true,
            branchId: initialData?.branchId ?? defaultBranchId ?? null,
        },
    });

    // Get items for the selected category
    const categoryItems = selectedCategoryId
        ? menuItems.filter((item: any) => item.categoryId === selectedCategoryId)
        : [];

    // Compute effective menuItemIds based on mode
    function getEffectiveIds(): string[] {
        if (selectionMode === 'all') return menuItems.map(i => i.id);
        if (selectionMode === 'category') return categoryItems.map(i => i.id);
        return form.getValues('menuItemIds') ?? [];
    }

    function onSubmit(data: OfferFormValues) {
        const effectiveIds = getEffectiveIds();
        startTransition(async () => {
            const payload = { ...data, menuItemIds: effectiveIds };
            const res = isEditing
                ? await updateOffer(initialData!.id, payload)
                : await createOffer(payload);
            if (res.success) {
                if (!isEditing) form.reset();
                setSelectionMode('items');
                setSelectedCategoryId('');
                onSuccess();
            } else {
                toast({
                    variant: 'destructive',
                    title: isEditing ? 'فشل تعديل العرض' : 'فشل إنشاء العرض',
                    description: (res as any).error ?? 'حدث خطأ غير متوقع',
                });
            }
        });
    }

    const selectedCount = selectionMode === 'all'
        ? menuItems.length
        : selectionMode === 'category'
            ? categoryItems.length
            : (form.watch('menuItemIds') ?? []).length;

    return (
        <Form {...form}>
            <form onSubmit={(e) => {
                form.setValue('menuItemIds', getEffectiveIds(), { shouldValidate: false });
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                form.handleSubmit(onSubmit as any)(e);
            }} className="space-y-4">
                {/* اسم العرض */}
                <FormField
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    control={form.control as any}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>اسم العرض</FormLabel>
                            <FormControl>
                                <Input placeholder="عرض الصيف" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* نسبة الخصم */}
                <FormField
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    control={form.control as any}
                    name="discountPct"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>نسبة الخصم (%)</FormLabel>
                            <FormControl>
                                <Input type="number" step="1" min="1" max="100" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* التواريخ */}
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        control={form.control as any}
                        name="startDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>تاريخ البداية</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn("w-full ps-3 text-right font-normal", !field.value && "text-muted-foreground")}
                                            >
                                                {field.value ? format(field.value, "dd/MM/yyyy") : <span>اختر تاريخاً</span>}
                                                <CalendarIcon className="me-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        control={form.control as any}
                        name="endDate"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>تاريخ الانتهاء</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn("w-full ps-3 text-right font-normal", !field.value && "text-muted-foreground")}
                                            >
                                                {field.value ? format(field.value, "dd/MM/yyyy") : <span>اختر تاريخاً</span>}
                                                <CalendarIcon className="me-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* ── نطاق الأصناف ── */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <label className="text-base font-medium">نطاق العرض</label>
                        {selectedCount > 0 && (
                            <Badge variant="secondary" className="text-xs">
                                {selectedCount} صنف
                            </Badge>
                        )}
                    </div>

                    {/* أزرار الاختيار */}
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            type="button"
                            onClick={() => setSelectionMode('all')}
                            className={cn(
                                'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all',
                                selectionMode === 'all'
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted'
                            )}
                        >
                            <CheckSquare className="w-4 h-4" />
                            كل الأصناف
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectionMode('category')}
                            className={cn(
                                'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all',
                                selectionMode === 'category'
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted'
                            )}
                        >
                            <LayoutGrid className="w-4 h-4" />
                            قسم كامل
                        </button>
                        <button
                            type="button"
                            onClick={() => setSelectionMode('items')}
                            className={cn(
                                'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all',
                                selectionMode === 'items'
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted'
                            )}
                        >
                            <UtensilsCrossed className="w-4 h-4" />
                            أصناف محددة
                        </button>
                    </div>

                    {/* وضع: كل الأصناف */}
                    {selectionMode === 'all' && (
                        <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">
                            ✅ سيُطبق الخصم على جميع أصناف القائمة ({menuItems.length} صنف)
                        </div>
                    )}

                    {/* وضع: قسم كامل */}
                    {selectionMode === 'category' && (
                        <div className="space-y-2">
                            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="اختر قسماً..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories.map(cat => (
                                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedCategoryId && (
                                <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-2 text-xs text-primary">
                                    ✅ سيُطبق الخصم على {categoryItems.length} صنف في هذا القسم
                                </div>
                            )}
                            {!selectedCategoryId && (
                                <p className="text-xs text-muted-foreground">اختر قسماً لتطبيق الخصم على جميع أصنافه</p>
                            )}
                        </div>
                    )}

                    {/* وضع: أصناف محددة */}
                    {selectionMode === 'items' && (
                        <FormField
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            control={form.control as any}
                            name="menuItemIds"
                            render={({ field }) => (
                                <FormItem>
                                    {/* فلتر سريع بالقسم */}
                                    {categories.length > 0 && (
                                        <Select
                                            value={selectedCategoryId}
                                            onValueChange={val => {
                                                setSelectedCategoryId(val === '__all__' ? '' : val);
                                            }}
                                        >
                                            <SelectTrigger className="h-8 text-xs mb-2">
                                                <SelectValue placeholder="فلتر بالقسم..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="__all__">كل الأقسام</SelectItem>
                                                {categories.map(cat => (
                                                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}

                                    <div className="max-h-[200px] overflow-y-auto space-y-2 border rounded-md p-2">
                                        {/* زر تحديد الكل / إلغاء الكل */}
                                        <div className="flex gap-2 pb-1 border-b">
                                            <button
                                                type="button"
                                                className="text-xs text-primary underline"
                                                onClick={() => field.onChange(menuItems.filter((i: any) =>
                                                    !selectedCategoryId || i.categoryId === selectedCategoryId
                                                ).map(i => i.id))}
                                            >
                                                تحديد الكل
                                            </button>
                                            <button
                                                type="button"
                                                className="text-xs text-muted-foreground underline"
                                                onClick={() => field.onChange([])}
                                            >
                                                إلغاء الكل
                                            </button>
                                        </div>

                                        {menuItems
                                            .filter((item: any) => !selectedCategoryId || item.categoryId === selectedCategoryId)
                                            .map((item) => (
                                                <label
                                                    key={item.id}
                                                    className="flex flex-row items-center gap-3 cursor-pointer rounded px-1 py-0.5 hover:bg-muted/50"
                                                >
                                                    <Checkbox
                                                        checked={field.value?.includes(item.id)}
                                                        onCheckedChange={(checked) => {
                                                            return checked
                                                                ? field.onChange([...field.value, item.id])
                                                                : field.onChange(field.value?.filter((v: any) => v !== item.id));
                                                        }}
                                                    />
                                                    <span className="text-sm font-normal">{item.name}</span>
                                                </label>
                                            ))}
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )}
                </div>

                {/* فرع */}
                {showBranchSelector && (
                    <FormField
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        control={form.control as any}
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
                                        {branches!.map(b => (
                                            <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                <SheetFooter>
                    <Button
                        type="submit"
                        disabled={
                            isPending ||
                            (selectionMode === 'category' && !selectedCategoryId) ||
                            (selectionMode === 'items' && (form.watch('menuItemIds') ?? []).length === 0)
                        }
                    >
                        {isPending
                            ? 'جارٍ الحفظ...'
                            : isEditing
                                ? `تعديل العرض${selectedCount > 0 ? ` (${selectedCount} صنف)` : ''}`
                                : `حفظ العرض${selectedCount > 0 ? ` (${selectedCount} صنف)` : ''}`
                        }
                    </Button>
                </SheetFooter>
            </form>
        </Form>
    );
}
