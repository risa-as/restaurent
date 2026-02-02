import { z } from 'zod';

export const categorySchema = z.object({
    name: z.string().min(2, "يجب أن يكون الاسم حرفين على الأقل"),
    type: z.enum(["EASTERN", "WESTERN", "BEVERAGE", "DESSERT"]),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;

export const recipeItemSchema = z.object({
    materialId: z.string().min(1, "المكون مطلوب"),
    quantity: z.coerce.number().positive("الكمية يجب أن تكون موجبة"),
});

export const menuItemSchema = z.object({
    name: z.string().min(2, "يجب أن يكون الاسم حرفين على الأقل"),
    description: z.string().optional(),
    price: z.coerce.number().min(0, "السعر لا يمكن أن يكون سالباً"),
    categoryId: z.string().min(1, "القسم مطلوب"),
    image: z.string().url("رابط غير صحيح").optional().or(z.literal("")),
    isAvailable: z.boolean().default(true),
    recipe: z.array(recipeItemSchema).optional(),
});

export type MenuItemFormValues = z.infer<typeof menuItemSchema>;

export const offerSchema = z.object({
    name: z.string().min(2, "يجب أن يكون الاسم حرفين على الأقل"),
    discountPct: z.coerce.number().min(0.1, "الخصم يجب أن يكون 0.1% على الأقل").max(100, "الخصم لا يمكن أن يتجاوز 100%"),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    menuItemIds: z.array(z.string()).min(1, "اختر عنصراً واحداً على الأقل"),
    isActive: z.boolean().default(true),
}).refine(data => data.endDate > data.startDate, {
    message: "تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء",
    path: ["endDate"]
});

export type OfferFormValues = z.infer<typeof offerSchema>;
