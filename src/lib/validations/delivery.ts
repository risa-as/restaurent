import { z } from 'zod';

export const deliverySchema = z.object({
    customerName: z.string().min(2),
    customerPhone: z.string().min(8),
    address: z.string().min(5),
    deliveryFee: z.number().default(0),
});

export type DeliveryInput = z.infer<typeof deliverySchema>;
