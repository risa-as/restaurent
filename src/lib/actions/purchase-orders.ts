'use server';

import { prisma } from '@/lib/prisma';
import { verifyRole, getCurrentUser } from '@/lib/auth-guard';
import { requireTenantId } from '@/lib/utils/require-tenant';
import { revalidatePath } from 'next/cache';
import { PurchaseOrderStatus, POPaymentType } from '@prisma/client';
import { getActiveBranchId, resolveCreateBranchId } from '@/lib/utils/branch-filter';

interface POLineItem {
    materialId: string;
    orderedQty: number;
    unitCost: number;
}

// T124: Create a purchase order in DRAFT status
export async function createPurchaseOrder(data: {
    supplierId: string;
    expectedDate?: Date;
    notes?: string;
    items: POLineItem[];
    paymentType?: 'CASH' | 'DEFERRED';
    dueDate?: Date;
}) {
    const { userId, tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'STORE_MANAGER']);
    requireTenantId(tenantId);

    try {
        const branchId = await getActiveBranchId(tenantId);

        const totalCost = data.items.reduce((sum, i) => sum + i.orderedQty * i.unitCost, 0);
        const paymentType = data.paymentType === 'DEFERRED' ? POPaymentType.DEFERRED : POPaymentType.CASH;
        const year = new Date().getFullYear();

        // Derive the next sequence from the highest existing PO number for this
        // tenant+year (not a raw row count — counts break after deletions and
        // reuse numbers). Retry on the unique collision that a concurrent create
        // can still cause. poNumber is unique per-tenant (@@unique[tenantId, poNumber]).
        const prefix = `PO-${year}-`;
        let po = null;
        let lastError: unknown = null;

        for (let attempt = 0; attempt < 5; attempt++) {
            const latest = await prisma.purchaseOrder.findFirst({
                where: { tenantId, poNumber: { startsWith: prefix } },
                orderBy: { poNumber: 'desc' },
                select: { poNumber: true },
            });
            const lastSeq = latest ? parseInt(latest.poNumber.slice(prefix.length), 10) || 0 : 0;
            const poNumber = `${prefix}${String(lastSeq + 1 + attempt).padStart(4, '0')}`;

            try {
                po = await prisma.purchaseOrder.create({
                    data: {
                        poNumber,
                        supplierId: data.supplierId,
                        expectedDate: data.expectedDate,
                        notes: data.notes,
                        totalCost,
                        tenantId,
                        branchId: await resolveCreateBranchId(tenantId, branchId),
                        createdById: userId,
                        paymentType,
                        dueDate: data.paymentType === 'DEFERRED' ? data.dueDate : null,
                        paymentStatus: 'UNPAID',
                        items: {
                            create: data.items.map(item => ({
                                materialId: item.materialId,
                                orderedQty: item.orderedQty,
                                unitCost: item.unitCost,
                            }))
                        }
                    }
                });
                break;
            } catch (e: any) {
                // P2002 = unique collision on poNumber → another PO took this number; retry
                if (e?.code === 'P2002') { lastError = e; continue; }
                throw e;
            }
        }

        if (!po) throw lastError ?? new Error('تعذّر توليد رقم طلب شراء فريد');

        revalidatePath('/inventory/purchase-orders');
        revalidatePath('/inventory/suppliers');
        return { success: true, id: po.id, poNumber: po.poNumber };
    } catch (error) {
        console.error('createPurchaseOrder error:', error);
        return { error: 'فشل في إنشاء طلب الشراء' };
    }
}

// T125: Submit (send) a PO — changes status DRAFT → SENT
export async function submitPurchaseOrder(id: string) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'STORE_MANAGER']);
    requireTenantId(tenantId);

    try {
        const branchId = await getActiveBranchId(tenantId);
        const branchWhere = branchId ? { branchId } : {};
        const po = await prisma.purchaseOrder.findFirst({ where: { id, tenantId, ...branchWhere } });
        if (!po) return { error: 'طلب الشراء غير موجود' };
        if (po.status !== 'DRAFT') return { error: 'يمكن إرسال الطلبات في حالة المسودة فقط' };

        await prisma.purchaseOrder.update({
            where: { id },
            data: { status: PurchaseOrderStatus.SENT }
        });

        revalidatePath('/inventory/purchase-orders');
        return { success: true };
    } catch (error) {
        console.error('submitPurchaseOrder error:', error);
        return { error: 'فشل في إرسال طلب الشراء' };
    }
}

// Cancel a PO — only DRAFT or SENT can be cancelled
export async function cancelPurchaseOrder(id: string) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'STORE_MANAGER']);
    requireTenantId(tenantId);

    try {
        const branchId = await getActiveBranchId(tenantId);
        const branchWhere = branchId ? { branchId } : {};
        const po = await prisma.purchaseOrder.findFirst({ where: { id, tenantId, ...branchWhere } });
        if (!po) return { error: 'طلب الشراء غير موجود' };
        if (!['DRAFT', 'SENT'].includes(po.status)) return { error: 'لا يمكن إلغاء هذا الطلب' };

        await prisma.purchaseOrder.update({
            where: { id },
            data: { status: PurchaseOrderStatus.CANCELLED }
        });

        revalidatePath('/inventory/purchase-orders');
        return { success: true };
    } catch (error) {
        console.error('cancelPurchaseOrder error:', error);
        return { error: 'فشل في إلغاء طلب الشراء' };
    }
}

// T126: Receive goods against a PO — creates InventoryBatch records
export async function receiveGoods(
    poId: string,
    receivedItems: { poItemId: string; receivedQty: number; expiryDate?: Date }[]
) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'STORE_MANAGER']);
    requireTenantId(tenantId);

    try {
        const branchId = await getActiveBranchId(tenantId);
        const branchWhere = branchId ? { branchId } : {};

        await prisma.$transaction(async (tx) => {
            const po = await tx.purchaseOrder.findFirst({
                where: { id: poId, tenantId, ...branchWhere },
                include: { items: true }
            });
            if (!po) throw new Error('طلب الشراء غير موجود');
            if (po.status === 'RECEIVED') throw new Error('تم استلام هذا الطلب بالكامل');

            for (const received of receivedItems) {
                if (received.receivedQty <= 0) continue;

                const poItem = po.items.find(i => i.id === received.poItemId);
                if (!poItem) continue;

                // Create InventoryBatch
                await tx.inventoryBatch.create({
                    data: {
                        materialId: poItem.materialId,
                        poItemId: poItem.id,
                        receivedQty: received.receivedQty,
                        remainingQty: received.receivedQty,
                        unitCost: poItem.unitCost,
                        expiryDate: received.expiryDate ?? null,
                        tenantId,
                        branchId: po.branchId ?? null,
                    }
                });

                // ── Weighted Average Cost ──────────────────────────────────
                // اجلب المخزون والتكلفة الحالية للمادة
                const material = await tx.rawMaterial.findUnique({
                    where: { id: poItem.materialId },
                    select: { currentStock: true, costPerUnit: true }
                });

                if (material) {
                    const oldQty   = material.currentStock;           // الكمية قبل الاستلام
                    const oldCost  = material.costPerUnit;            // التكلفة الحالية
                    const newQty   = received.receivedQty;            // الكمية الواردة
                    const newCost  = poItem.unitCost;                 // سعر الدفعة الجديدة
                    const totalQty = oldQty + newQty;

                    // WAC = (قيمة المخزون القديم + قيمة الوارد الجديد) ÷ إجمالي الكمية
                    const weightedAvgCost = totalQty > 0
                        ? ((oldQty * oldCost) + (newQty * newCost)) / totalQty
                        : newCost;

                    await tx.rawMaterial.update({
                        where: { id: poItem.materialId },
                        data: {
                            currentStock: { increment: newQty },
                            costPerUnit: Math.round(weightedAvgCost * 100) / 100, // تقريب لخانتين عشريتين
                        }
                    });
                } else {
                    // fallback — تحديث المخزون فقط
                    await tx.rawMaterial.update({
                        where: { id: poItem.materialId },
                        data: { currentStock: { increment: received.receivedQty } }
                    });
                }
                // ─────────────────────────────────────────────────────────

                // Update PO line received qty
                await tx.purchaseOrderItem.update({
                    where: { id: poItem.id },
                    data: { receivedQty: { increment: received.receivedQty } }
                });
            }

            // Determine new PO status
            const updatedItems = await tx.purchaseOrderItem.findMany({ where: { purchaseOrderId: poId } });
            const allReceived = updatedItems.every(i => i.receivedQty >= i.orderedQty);
            const anyReceived = updatedItems.some(i => i.receivedQty > 0);

            await tx.purchaseOrder.update({
                where: { id: poId },
                data: {
                    status: allReceived
                        ? PurchaseOrderStatus.RECEIVED
                        : anyReceived
                            ? PurchaseOrderStatus.PARTIALLY_RECEIVED
                            : po.status,
                    receivedDate: allReceived ? new Date() : undefined,
                }
            });
        });

        revalidatePath('/inventory/purchase-orders');
        revalidatePath('/inventory/stock');
        revalidatePath('/inventory/suppliers');
        return { success: true };
    } catch (error) {
        console.error('receiveGoods error:', error);
        return { error: 'فشل في تسجيل استلام البضاعة' };
    }
}

// T127: List purchase orders
export async function getPurchaseOrders(status?: PurchaseOrderStatus) {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];

        const branchId = await getActiveBranchId(tenantId);
        const branchWhere = branchId ? { branchId } : {};
        return await prisma.purchaseOrder.findMany({
            where: { tenantId, ...branchWhere, ...(status ? { status } : {}) },
            include: {
                supplier: true,
                items: { include: { material: true } },
                payments: true,
            },
            orderBy: { createdAt: 'desc' }
        });
    } catch (error) {
        console.error('getPurchaseOrders error:', error);
        return [];
    }
}

export async function getPurchaseOrderDetail(id: string) {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return null;

        const branchId = await getActiveBranchId(tenantId);
        const branchWhere = branchId ? { branchId } : {};

        return await prisma.purchaseOrder.findFirst({
            where: { id, tenantId, ...branchWhere },
            include: {
                supplier: true,
                items: {
                    include: {
                        material: true,
                        batches: true,
                    }
                },
                payments: true,
                createdBy: { select: { name: true } }
            }
        });
    } catch (error) {
        console.error('getPurchaseOrderDetail error:', error);
        return null;
    }
}

// تسجيل دفعة لطلب شراء آجل
export async function recordSupplierPayment(data: {
    purchaseOrderId: string;
    supplierId: string;
    amount: number;
    notes?: string;
}) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'STORE_MANAGER']);
    requireTenantId(tenantId);

    try {
        const branchId = await getActiveBranchId(tenantId);
        const branchWhere = branchId ? { branchId } : {};

        await prisma.$transaction(async (tx) => {
            const po = await tx.purchaseOrder.findFirst({
                where: { id: data.purchaseOrderId, tenantId, ...branchWhere },
                include: { payments: true }
            });
            if (!po) throw new Error('طلب الشراء غير موجود');

            // إنشاء الدفعة
            await tx.supplierPayment.create({
                data: {
                    purchaseOrderId: data.purchaseOrderId,
                    supplierId: data.supplierId,
                    tenantId,
                    amount: data.amount,
                    notes: data.notes,
                }
            });

            // حساب المبلغ المدفوع الجديد
            const totalPaid = po.payments.reduce((s, p) => s + p.amount, 0) + data.amount;
            const newStatus = totalPaid >= po.totalCost ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : 'UNPAID';

            await tx.purchaseOrder.update({
                where: { id: data.purchaseOrderId },
                data: {
                    paidAmount: totalPaid,
                    paymentStatus: newStatus,
                }
            });
        });

        revalidatePath('/inventory/purchase-orders');
        revalidatePath('/inventory/suppliers');
        return { success: true };
    } catch (error) {
        console.error('recordSupplierPayment error:', error);
        return { error: 'فشل في تسجيل الدفعة' };
    }
}

// T128: Get batches expiring within N days
export async function getExpiringBatches(withinDays: number, branchId?: string | null) {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];

        const threshold = new Date();
        threshold.setDate(threshold.getDate() + withinDays);

        return await prisma.inventoryBatch.findMany({
            where: {
                tenantId,
                ...(branchId ? { branchId } : {}),
                expiryDate: { lte: threshold },
                remainingQty: { gt: 0 },
            },
            include: { material: { select: { name: true, unit: true } } },
            orderBy: { expiryDate: 'asc' }
        });
    } catch (error) {
        console.error('getExpiringBatches error:', error);
        return [];
    }
}

// جلب دفعات مادة خام معينة للعرض في الـ Sheet
export async function getMaterialBatches(materialId: string) {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return [];

        const branchId = await getActiveBranchId(tenantId);
        const branchWhere = branchId ? { branchId } : {};

        return await prisma.inventoryBatch.findMany({
            where: {
                tenantId,
                materialId,
                remainingQty: { gt: 0 },
                ...branchWhere,
            },
            include: {
                poItem: {
                    include: {
                        purchaseOrder: {
                            select: { poNumber: true, createdAt: true, supplier: { select: { name: true } } }
                        }
                    }
                }
            },
            orderBy: { receivedQty: 'asc' } // FIFO — الأقدم أولاً
        });
    } catch (error) {
        console.error('getMaterialBatches error:', error);
        return [];
    }
}

// ملخص التنبيهات: كم دفعة ستنتهي خلال N أيام (لبطاقة الداشبورد)
export async function getExpiringBatchesSummary(withinDays = 7) {
    try {
        const user = await getCurrentUser();
        const tenantId = user?.tenantId;
        if (!tenantId) return { count: 0, items: [] };

        const threshold = new Date();
        threshold.setDate(threshold.getDate() + withinDays);

        const branchId = await getActiveBranchId(tenantId);
        const branchWhere = branchId ? { branchId } : {};

        const batches = await prisma.inventoryBatch.findMany({
            where: {
                tenantId,
                expiryDate: { not: null, lte: threshold },
                remainingQty: { gt: 0 },
                ...branchWhere,
            },
            include: { material: { select: { name: true, unit: true } } },
            orderBy: { expiryDate: 'asc' },
            take: 20,
        });

        return {
            count: batches.length,
            items: batches.map(b => ({
                id: b.id,
                materialName: b.material.name,
                unit: b.material.unit,
                remainingQty: b.remainingQty,
                expiryDate: b.expiryDate!,
                daysLeft: Math.ceil((b.expiryDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
            }))
        };
    } catch (error) {
        console.error('getExpiringBatchesSummary error:', error);
        return { count: 0, items: [] };
    }
}

