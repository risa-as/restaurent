import { z } from 'zod';

export const modifierOptionSchema = z.object({
    name: z.string().min(1, 'الاسم مطلوب'),
    nameAr: z.string().optional(),
    nameKu: z.string().optional(),
    nameEn: z.string().optional(),
    priceAdjustment: z.coerce.number().default(0),
    isDefault: z.boolean().default(false),
    sortOrder: z.coerce.number().int().default(0),
    rawMaterialId: z.string().optional(),
    rawMaterialQty: z.coerce.number().positive().optional(),
});

export const modifierGroupSchema = z.object({
    name: z.string().min(1, 'الاسم مطلوب'),
    nameAr: z.string().optional(),
    nameKu: z.string().optional(),
    nameEn: z.string().optional(),
    isRequired: z.boolean().default(false),
    isVariant: z.boolean().default(false),
    minSelect: z.coerce.number().int().min(0).default(0),
    maxSelect: z.coerce.number().int().min(1).default(1),
    sortOrder: z.coerce.number().int().default(0),
    options: z.array(modifierOptionSchema).optional(),
}).refine(
    (d) => d.maxSelect >= d.minSelect,
    { message: 'الحد الأقصى يجب أن يكون أكبر من أو يساوي الحد الأدنى', path: ['maxSelect'] }
);

export type ModifierGroupFormValues = z.infer<typeof modifierGroupSchema>;
export type ModifierOptionFormValues = z.infer<typeof modifierOptionSchema>;

export const categorySchema = z.object({
    name: z.string().min(2, 'يجب أن يكون الاسم حرفين على الأقل'),
    branchId: z.string().nullish(),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

export const recipeItemSchema = z.object({
    materialId: z.string().min(1, 'المكون مطلوب'),
    quantity: z.coerce.number().positive('الكمية يجب أن تكون موجبة'),
});

export const menuItemSchema = z.object({
    name: z.string().min(2, 'يجب أن يكون الاسم حرفين على الأقل'),
    description: z.string().optional(),
    price: z.coerce.number().min(0, 'السعر لا يمكن أن يكون سالباً'),
    categoryId: z.string().min(1, 'القسم مطلوب'),
    images: z.array(z.string().url('رابط غير صحيح')).max(6, 'الحد الأقصى 6 صور').default([]),
    isAvailable: z.boolean().default(true),
    recipe: z.array(recipeItemSchema).optional(),
    branchId: z.string().nullish(),
});

export type MenuItemFormValues = z.infer<typeof menuItemSchema>;

export const offerSchema = z.object({
    name: z.string().min(2, 'يجب أن يكون الاسم حرفين على الأقل'),
    discountPct: z.coerce.number().min(0.1, 'الخصم يجب أن يكون 0.1% على الأقل').max(100, 'الخصم لا يمكن أن يتجاوز 100%'),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    menuItemIds: z.array(z.string()).min(1, 'اختر عنصراً واحداً على الأقل'),
    isActive: z.boolean().default(true),
    branchId: z.string().nullish(),
}).refine(data => data.endDate >= data.startDate, {
    message: 'تاريخ الانتهاء يجب أن يكون في نفس يوم البدء أو بعده',
    path: ['endDate']
});

export type OfferFormValues = z.infer<typeof offerSchema>;
