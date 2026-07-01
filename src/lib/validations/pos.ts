import { z } from 'zod';
import { ServiceMode } from '@prisma/client';

export const orderItemModifierSchema = z.object({
    modifierOptionId: z.string().min(1),
});

export const orderItemSchema = z.object({
    menuItemId: z.string().min(1),
    quantity: z.number().int().positive(),
    notes: z.string().optional(),
    modifiers: z.array(orderItemModifierSchema).optional(),
});

export const createOrderSchema = z.object({
    tableId: z.string().optional(), // Optional for takeaway
    deliveryType: z.enum(['pickup', 'delivery']).optional(),
    customerName: z.string().optional(),
    customerPhone: z.string().optional(),
    customerAddress: z.string().optional(),
    customerLat: z.number().optional(),
    customerLng: z.number().optional(),
    items: z.array(orderItemSchema).min(1, "يجب أن يحتوي الطلب على عنصر واحد على الأقل"),
    note: z.string().optional(),
    pointsRedeemed: z.number().optional().default(0),
    serviceMode: z.nativeEnum(ServiceMode).optional().default('TABLE_SERVICE'),
    paymentMethod: z.enum(['CASH', 'CARD']).optional().default('CASH'),
});

// Use z.input to make defaulted fields optional at the call site
export type CreateOrderInput = z.input<typeof createOrderSchema>;
