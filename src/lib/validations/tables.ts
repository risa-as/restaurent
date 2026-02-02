import { z } from 'zod';

export const tableSchema = z.object({
    number: z.string().min(1, "رقم الطاولة مطلوب"),
    capacity: z.coerce.number().min(1, "السعة يجب أن تكون 1 على الأقل"),
    x: z.number().default(0),
    y: z.number().default(0),
});

export type TableFormValues = z.infer<typeof tableSchema>;
