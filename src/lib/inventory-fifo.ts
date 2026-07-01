import { Prisma } from '@prisma/client';

type PrismaTransaction = Omit<
    Prisma.TransactionClient,
    '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

/**
 * FIFO Stock Consumption — نظام الخصم الذكي المتكامل
 *
 * كيف يعمل نظام المخزون في هذا التطبيق:
 * ─────────────────────────────────────────
 * │  مصدران لإضافة المخزون:              │
 * │  1. مباشر (/inventory/stock)          │
 * │     → يعدّل RawMaterial.currentStock  │
 * │     → لا ينشئ InventoryBatch          │
 * │                                       │
 * │  2. أوامر الشراء (/purchase-orders)   │
 * │     → ينشئ InventoryBatch             │
 * │     → يزيد currentStock               │
 * │                                       │
 * │  currentStock = مجموع الكل (المصدران) │
 * ─────────────────────────────────────────
 *
 * خوارزمية الخصم:
 * ──────────────────────────────────────────────────────────
 * 1. ابحث عن InventoryBatch (دفعات الشراء) مرتبة FIFO
 * 2. اخصم منها قدر الإمكان
 * 3. اخصم الباقي من المخزون المباشر (currentStock مباشرة)
 * 4. في جميع الأحوال: currentStock -= qty كاملاً
 *    (لأن currentStock = sum(batches) + direct)
 * ──────────────────────────────────────────────────────────
 *
 * هذا يضمن:
 * ✅ FIFO صحيح — أقدم الدفعات تُستهلك أولاً
 * ✅ المخزون المباشر يُستهلك بعد نفاد الدفعات
 * ✅ currentStock دائماً دقيق بغض النظر عن المصدر
 */
export async function consumeStock(
    tx: PrismaTransaction,
    materialId: string,
    qty: number,
    tenantId: string,
    branchId: string | null
): Promise<void> {
    if (qty <= 0) return;

    // ── الخطوة 1: جلب دفعات الشراء المتاحة (FIFO) ────────────────────────
    const batches = await tx.inventoryBatch.findMany({
        where: {
            materialId,
            tenantId,
            ...(branchId ? { branchId } : {}),
            remainingQty: { gt: 0 },
        },
        orderBy: [
            { expiryDate: 'asc' },  // الأقرب انتهاءً أولاً (nulls last by DB)
            { receivedAt: 'asc' },  // الأقدم استلاماً أولاً
        ],
    });

    // ── الخطوة 2: الخصم من الدفعات بترتيب FIFO ───────────────────────────
    let remaining = qty;
    for (const batch of batches) {
        if (remaining <= 0) break;
        const deduct = Math.min(batch.remainingQty, remaining);
        await tx.inventoryBatch.update({
            where: { id: batch.id },
            data: { remainingQty: { decrement: deduct } },
        });
        remaining -= deduct;
    }

    // ── الخطوة 3: خصم الكمية الكاملة من currentStock ────────────────────
    // currentStock يمثل المجموع الكلي (دفعات + مباشر)
    // لذلك نخصم qty كاملاً دائماً، بغض النظر عن مصدر المخزون
    // (التحقق من الكفاية يتم مسبقاً في deductOrderStock)
    await tx.rawMaterial.update({
        where: { id: materialId },
        data: { currentStock: { decrement: qty } },
    });
    // ملاحظة: إذا remaining > 0 بعد الدفعات، فهذا يعني أن الباقي
    // كان مخزوناً مباشراً — وقد خُصم ضمنياً بتعديل currentStock أعلاه
}
