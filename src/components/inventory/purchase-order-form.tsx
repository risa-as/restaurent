'use client';

import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { createPurchaseOrder, submitPurchaseOrder } from '@/lib/actions/purchase-orders';
import { Plus, Trash2, Loader2, Package, AlertCircle, Banknote, Clock } from 'lucide-react';
import { useFmt, useDateFmt } from '@/contexts/number-locale-context';

interface Supplier { id: string; name: string; isActive: boolean }
interface Material { id: string; name: string; unit: string }
interface LineItem { materialId: string; orderedQty: number; unitCost: number }

async function fetchOptions(): Promise<{ suppliers: Supplier[]; materials: Material[] }> {
    const [suppRes, matRes] = await Promise.all([
        fetch('/api/inventory/suppliers').then(r => r.ok ? r.json() : { suppliers: [] }),
        fetch('/api/inventory/materials').then(r => r.ok ? r.json() : { materials: [] }),
    ]);
    return { suppliers: suppRes.suppliers ?? [], materials: matRes.materials ?? [] };
}

export function PurchaseOrderForm({ onSuccess }: { onSuccess?: () => void }) {
    const fmt = useFmt();
    const dateFmt = useDateFmt();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [supplierId, setSupplierId] = useState('');
    const [expectedDate, setExpectedDate] = useState('');
    const [notes, setNotes] = useState('');
    const [paymentType, setPaymentType] = useState<'CASH' | 'DEFERRED'>('CASH');
    const [dueDate, setDueDate] = useState('');
    const [lines, setLines] = useState<LineItem[]>([{ materialId: '', orderedQty: 1, unitCost: 0 }]);

    useEffect(() => {
        fetchOptions().then(({ suppliers, materials }) => {
            setSuppliers(suppliers.filter((s: Supplier) => s.isActive !== false));
            setMaterials(materials);
            setLoading(false);
        });
    }, []);

    const addLine = () => setLines(prev => [...prev, { materialId: '', orderedQty: 1, unitCost: 0 }]);
    const removeLine = (i: number) => setLines(prev => prev.filter((_, idx) => idx !== i));
    const updateLine = (i: number, field: keyof LineItem, value: string | number) =>
        setLines(prev => prev.map((line, idx) => idx === i ? { ...line, [field]: value } : line));

    const total = lines.reduce((sum, l) => sum + l.orderedQty * l.unitCost, 0);
    const selectedMaterial = (id: string) => materials.find(m => m.id === id);

    const handleSubmit = (andSend: boolean) => {
        if (!supplierId) {
            toast({ title: 'خطأ', description: 'يرجى اختيار المورد', variant: 'destructive' });
            return;
        }
        const validLines = lines.filter(l => l.materialId && l.orderedQty > 0);
        if (validLines.length === 0) {
            toast({ title: 'خطأ', description: 'أضف صنفاً واحداً على الأقل', variant: 'destructive' });
            return;
        }
        if (paymentType === 'DEFERRED' && !dueDate) {
            toast({ title: 'خطأ', description: 'يرجى تحديد تاريخ الاستحقاق للدفع الآجل', variant: 'destructive' });
            return;
        }

        startTransition(async () => {
            const result = await createPurchaseOrder({
                supplierId,
                expectedDate: expectedDate ? new Date(expectedDate) : undefined,
                notes: notes || undefined,
                items: validLines,
                paymentType,
                dueDate: dueDate ? new Date(dueDate) : undefined,
            });
            if (result.error) {
                toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
                return;
            }
            if (andSend && result.id) {
                await submitPurchaseOrder(result.id);
            }
            toast({ title: `✅ تم إنشاء ${result.poNumber}${andSend ? ' وإرساله للمورد' : ' كمسودة'}` });
            onSuccess?.();
        });
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p className="text-sm">جاري تحميل البيانات...</p>
            </div>
        );
    }

    if (suppliers.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center text-muted-foreground">
                <AlertCircle className="w-10 h-10 opacity-40" />
                <p className="font-medium">لا يوجد موردون نشطون</p>
                <p className="text-sm">يرجى إضافة مورد نشط من صفحة الموردين أولاً</p>
            </div>
        );
    }

    return (
        <div className="space-y-5 py-4" dir="rtl">

            {/* ── المورد ── */}
            <div className="space-y-2">
                <Label className="text-sm font-semibold">المورد <span className="text-red-500">*</span></Label>
                <select
                    value={supplierId}
                    onChange={e => setSupplierId(e.target.value)}
                    className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                >
                    <option value="">— اختر المورد —</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>

            {/* ── طريقة الدفع ── */}
            <div className="space-y-2">
                <Label className="text-sm font-semibold">طريقة الدفع</Label>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => setPaymentType('CASH')}
                        className={`flex items-center justify-center gap-2 h-10 rounded-lg border text-sm font-medium transition-all ${
                            paymentType === 'CASH'
                                ? 'bg-green-50 border-green-400 text-green-700'
                                : 'border-input text-muted-foreground hover:border-green-300'
                        }`}
                    >
                        <Banknote className="w-4 h-4" />
                        كاش
                    </button>
                    <button
                        type="button"
                        onClick={() => setPaymentType('DEFERRED')}
                        className={`flex items-center justify-center gap-2 h-10 rounded-lg border text-sm font-medium transition-all ${
                            paymentType === 'DEFERRED'
                                ? 'bg-amber-50 border-amber-400 text-amber-700'
                                : 'border-input text-muted-foreground hover:border-amber-300'
                        }`}
                    >
                        <Clock className="w-4 h-4" />
                        آجل
                    </button>
                </div>
            </div>

            {/* ── التاريخ والملاحظات ── */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                    <Label className="text-sm font-semibold">تاريخ التسليم المتوقع</Label>
                    <Input
                        type="date"
                        value={expectedDate}
                        onChange={e => setExpectedDate(e.target.value)}
                        className="h-10"
                    />
                </div>
                {paymentType === 'DEFERRED' ? (
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold text-amber-600">
                            تاريخ الاستحقاق <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            type="date"
                            value={dueDate}
                            onChange={e => setDueDate(e.target.value)}
                            className="h-10 border-amber-300 focus:ring-amber-300"
                        />
                    </div>
                ) : (
                    <div className="space-y-2">
                        <Label className="text-sm font-semibold">ملاحظات</Label>
                        <Input
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="اختياري..."
                            className="h-10"
                        />
                    </div>
                )}
            </div>

            {paymentType === 'DEFERRED' && (
                <div className="space-y-2">
                    <Label className="text-sm font-semibold">ملاحظات</Label>
                    <Input
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="اختياري..."
                        className="h-10"
                    />
                </div>
            )}

            <Separator />

            {/* ── الأصناف ── */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                        <Package className="w-4 h-4 text-primary" />
                        الأصناف
                    </Label>
                    <Button type="button" size="sm" variant="outline" onClick={addLine} className="gap-1 h-8 text-xs">
                        <Plus className="w-3 h-3" />
                        إضافة صنف
                    </Button>
                </div>

                {/* Header Row */}
                <div className="grid grid-cols-[1fr_80px_100px_36px] gap-2 text-xs text-muted-foreground font-medium px-1">
                    <span>المادة</span>
                    <span className="text-center">الكمية</span>
                    <span className="text-center">السعر (د.ع)</span>
                    <span></span>
                </div>

                {/* Line Items */}
                <div className="space-y-2">
                    {lines.map((line, i) => {
                        const mat = selectedMaterial(line.materialId);
                        return (
                            <div key={i} className="grid grid-cols-[1fr_80px_100px_36px] gap-2 items-center">
                                <div className="relative">
                                    <select
                                        value={line.materialId}
                                        onChange={e => updateLine(i, 'materialId', e.target.value)}
                                        className="w-full h-9 rounded-lg border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition"
                                    >
                                        <option value="">— اختر المادة —</option>
                                        {materials.map(m => (
                                            <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="relative">
                                    <Input
                                        type="number"
                                        min={0.01}
                                        step={0.01}
                                        value={line.orderedQty}
                                        onChange={e => updateLine(i, 'orderedQty', parseFloat(e.target.value) || 1)}
                                        className="h-9 text-center pr-1"
                                    />
                                    {mat && (
                                        <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
                                            {mat.unit}
                                        </span>
                                    )}
                                </div>
                                <Input
                                    type="number"
                                    min={0}
                                    value={line.unitCost || ''}
                                    onChange={e => updateLine(i, 'unitCost', parseFloat(e.target.value) || 0)}
                                    className="h-9 text-center font-mono"
                                    placeholder="0"
                                    dir="ltr"
                                />
                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => removeLine(i)}
                                    disabled={lines.length === 1}
                                    className="h-9 w-9 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                            </div>
                        );
                    })}
                </div>
            </div>

            <Separator />

            {/* ── الإجمالي ── */}
            <div className="flex items-center justify-between bg-muted/40 rounded-xl px-4 py-3 border">
                <div className="space-y-0.5">
                    <span className="text-sm font-semibold text-muted-foreground">الإجمالي الكلي</span>
                    {paymentType === 'DEFERRED' && (
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            دفع آجل{dueDate ? ` — يستحق في ${dateFmt(dueDate)}` : ''}
                        </p>
                    )}
                </div>
                <span className="text-xl font-bold font-mono text-primary">
                    {fmt(total)} <span className="text-sm font-normal text-muted-foreground">د.ع</span>
                </span>
            </div>

            {/* ── الأزرار ── */}
            <div className="grid grid-cols-2 gap-2 pt-1">
                <Button
                    variant="outline"
                    onClick={() => handleSubmit(false)}
                    disabled={isPending}
                    className="h-10 gap-2"
                >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    حفظ كمسودة
                </Button>
                <Button
                    onClick={() => handleSubmit(true)}
                    disabled={isPending}
                    className="h-10 gap-2 font-semibold"
                >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    إنشاء وإرسال
                </Button>
            </div>
        </div>
    );
}
