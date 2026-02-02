import { z } from 'zod';

export const rawMaterialSchema = z.object({
    name: z.string().min(2, {
        message: "Name must be at least 2 characters.",
    }),
    unit: z.string().min(1, {
        message: "Unit is required.",
    }),
    currentStock: z.coerce.number().min(0, {
        message: "Stock cannot be negative.",
    }),
    minStockLevel: z.coerce.number().min(0, {
        message: "Minimum stock level cannot be negative.",
    }),
    costPerUnit: z.coerce.number().min(0, {
        message: "Cost cannot be negative.",
    }),
});

export type RawMaterialFormValues = z.infer<typeof rawMaterialSchema>;

export const transactionSchema = z.object({
    materialId: z.string().min(1, "Material is required"),
    type: z.enum(['PURCHASE', 'USAGE', 'WASTE', 'ADJUSTMENT']),
    quantity: z.coerce.number().positive("Quantity must be positive"),
    cost: z.coerce.number().optional(), // For purchase
    notes: z.string().optional(),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>;
