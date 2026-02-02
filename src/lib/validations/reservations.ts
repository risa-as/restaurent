import { z } from 'zod';

export const reservationSchema = z.object({
    customerName: z.string().min(2, "Name is required"),
    customerPhone: z.string().min(8, "Valid phone number is required"),
    guests: z.coerce.number().min(1, "At least 1 guest").max(20, "Max 20 guests"),
    reservationTime: z.coerce.date(),
    notes: z.string().optional(),
    tableId: z.string().optional(), // Can be assigned later
});

export type ReservationFormValues = z.infer<typeof reservationSchema>;
