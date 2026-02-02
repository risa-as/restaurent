import { z } from 'zod';

export const orderItemSchema = z.object({
    menuItemId: z.string().min(1),
    quantity: z.number().int().positive(),
    notes: z.string().optional(),
});

export const createOrderSchema = z.object({
    tableId: z.string().optional(), // Optional for takeaway
    deliveryType: z.enum(['pickup', 'delivery']).optional(),
    customerPhone: z.string().optional(),
    customerAddress: z.string().optional(),
    items: z.array(orderItemSchema).min(1, "يجب أن يحتوي الطلب على عنصر واحد على الأقل"),
    note: z.string().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
