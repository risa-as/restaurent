'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { createRawMaterial, updateRawMaterial, deleteRawMaterial } from '@/lib/actions/inventory';
import { getMaterialBatches } from '@/lib/actions/purchase-orders';
import { useToast } from '@/hooks/use-toast';
import {
    Plus, Search, Edit2, Trash2, Package, AlertCircle,
    Download, ChevronLeft, Layers, CalendarDays, Truck,
    AlertTriangle, CheckCircle2, Clock, GitBranch, PackageX,
} from 'lucide-react';
import { Branch, RawMaterial } from '@prisma/client';
import { exportToExcel } from '@/lib/utils/export';
import { useFmt, useDateFmt } from '@/contexts/number-locale-context';

interface StockListProps {
    materials: RawMaterial[];
    branches?: Branch[];
    defaultBranchId?: string | null;
    expiringAlert?: { count: number; items: ExpiringItem[] };
}

interface ExpiringItem {
    id: string;
    materialName: string;
    unit: string;
    remainingQty: number;
    expiryDate: Date;
    daysLeft: number;
}

interface BatchInfo {
    id: string;
    remainingQty: number;
    receivedQty: number;
    unitCost: number;
    expiryDate: Date | null;
    poItem: {
        purchaseOrder: {
            poNumber: string;
            createdAt: Date;
            supplier: { name: string };
        }
    } | null;
}

function StockLevelBar({ current, min }: { current: number; min: number }) {
    const isOut  = current <= 0;
    const isLow  = !isOut && current <= min;
    const max    = Math.max(current, min * 3, 1);
    const pct    = Math.min((current / max) * 100, 100);
    const color  = isOut ? 'bg-red-500' : isLow ? 'bg-amber-400' : 'bg-emerald-500';
    return (
        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
        </div>
    );
}

export function StockList({ materials, branches, defaultBranchId, expiringAlert }: StockListProps) {
    const fmt     = useFmt();
    const dateFmt = useDateFmt();
    const showBranchSelector = (branches?.length ?? 0) > 1;
    const currentBranch = branches?.find(b => b.id === defaultBranchId);

    const [searchTerm, setSearchTerm]   = useState('');
    const [isPending, startTransition]  = useTransition();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { toast } = useToast();

    const [batchSheet, setBatchSheet]   = useState<{ material: RawMaterial; batches: BatchInfo[] } | null>(null);
    const [batchLoading, setBatchLoading] = useState(false);
    const [expiryExpanded, setExpiryExpanded] = useState(false);

    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        unit: 'kg',
        currentStock: 0,
        minStockLevel: 5,
        costPerUnit: 0,
        branchId: defaultBranchId ?? null as string | null,
    });

    const resetForm = () => {
        setFormData({ name: '', unit: 'kg', currentStock: 0, minStockLevel: 5, costPerUnit: 0, branchId: defaultBranchId ?? null });
        setEditingId(null);
    };

    const handleEdit = (item: RawMaterial) => {
        setEditingId(item.id);
        setFormData({
            name: item.name,
            unit: item.unit,
            currentStock: item.currentStock,
            minStockLevel: item.minStockLevel,
            costPerUnit: item.costPerUnit,
            branchId: (item as any).branchId ?? null,
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = () => {
        startTransition(async () => {
            const { branchId, ...rest } = formData;
            const res = editingId
                ? await updateRawMaterial(editingId, { ...rest, branchId })
                : await createRawMaterial({ ...rest, branchId });
            if (res.success) {
                toast({ title: editingId ? 'تم التعديل بنجاح' : 'تمت الإضافة بنجاح' });
                setIsDialogOpen(false);
                resetForm();
            } else {
                toast({ title: 'حدث خطأ', variant: 'destructive' });
            }
        });
    };

    const handleDelete = (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذه المادة؟')) return;
        startTransition(async () => {
            const res = await deleteRawMaterial(id);
            if (res.success) {
                toast({ title: 'تم الحذف بنجاح' });
            } else {
                toast({ title: 'فشل الحذف', variant: 'destructive' });
            }
        });
    };

    const handleOpenBatches = async (material: RawMaterial) => {
        setBatchLoading(true);
        const batches = await getMaterialBatches(material.id);
        setBatchSheet({ material, batches: batches as BatchInfo[] });
        setBatchLoading(false);
    };

    const filteredMaterials = materials.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const hasExpiryAlert = (expiringAlert?.count ?? 0) > 0;

    return (
        <div className="flex flex-col gap-4" dir="rtl">

            {/* ── تنبيه الصلاحية ── */}
            {hasExpiryAlert && (
                <div className={`rounded-xl border transition-colors ${
                    expiryExpanded
                        ? 'border-orange-300 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-700'
                        : 'border-orange-200 bg-orange-50/60 dark:bg-orange-950/20 dark:border-orange-800'
                }`}>
                    <button
                        className="w-full flex items-center justify-between p-4"
                        onClick={() => setExpiryExpanded(v => !v)}
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-900/50">
                                <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                            </div>
                            <div className="text-right">
                                <p className="font-semibold text-orange-800 dark:text-orange-300 text-sm">
                                    {expiringAlert!.count} دفعة ستنتهي صلاحيتها خلال 7 أيام
                                </p>
                                <p className="text-xs text-orange-600/70 dark:text-orange-400/70 mt-0.5">
                                    راجع الدفعات وتصرف قبل الهدر
                                </p>
                            </div>
                        </div>
                        <span className="text-xs text-orange-600 dark:text-orange-400 underline underline-offset-2">
                            {expiryExpanded ? 'إخفاء' : 'عرض التفاصيل'}
                        </span>
                    </button>

                    {expiryExpanded && (
                        <div className="px-4 pb-4 space-y-2">
                            <Separator className="bg-orange-200 dark:bg-orange-700" />
                            <div className="grid gap-2 pt-2">
                                {expiringAlert!.items.map(item => (
                                    <div key={item.id} className="flex items-center justify-between bg-white dark:bg-orange-950/40 rounded-lg px-3 py-2 border border-orange-100 dark:border-orange-800">
                                        <div className="flex items-center gap-2">
                                            <Package className="w-3.5 h-3.5 text-orange-400" />
                                            <span className="text-sm font-medium">{item.materialName}</span>
                                            <span className="text-xs text-muted-foreground">({item.remainingQty} {item.unit})</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <CalendarDays className="w-3 h-3" />
                                                {dateFmt(item.expiryDate)}
                                            </span>
                                            <Badge
                                                variant="outline"
                                                className={`text-xs ${
                                                    item.daysLeft <= 2
                                                        ? 'bg-red-100 text-red-700 border-red-200'
                                                        : item.daysLeft <= 4
                                                        ? 'bg-orange-100 text-orange-700 border-orange-200'
                                                        : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                                }`}
                                            >
                                                {item.daysLeft <= 0 ? 'منتهية!' : `${item.daysLeft} أيام`}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── الجدول الرئيسي ── */}
            <Card className="shadow-sm border-border/60">
                <CardHeader className="pb-4 border-b">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-base font-semibold">المواد الخام</CardTitle>
                            {showBranchSelector && (
                                <Badge variant="outline" className="gap-1 text-xs font-normal border-primary/30 text-primary">
                                    <GitBranch className="w-3 h-3" />
                                    {currentBranch?.name ?? 'جميع الفروع'}
                                </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                                — اضغط على المادة لعرض دفعاتها
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="relative w-56">
                                <Search className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="بحث..."
                                    className="pr-8 h-9 text-sm"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5"
                                onClick={() => exportToExcel(
                                    filteredMaterials.map(m => ({
                                        'المادة': m.name,
                                        'الوحدة': m.unit,
                                        'الرصيد الحالي': m.currentStock,
                                        'حد التنبيه': m.minStockLevel,
                                        'تكلفة الوحدة': m.costPerUnit,
                                        'الحالة': m.currentStock <= 0 ? 'نفذت' : m.currentStock <= m.minStockLevel ? 'منخفض' : 'متوفر',
                                    })),
                                    'stock-report'
                                )}
                            >
                                <Download className="w-3.5 h-3.5" />
                                تصدير
                            </Button>

                            <Dialog open={isDialogOpen} onOpenChange={open => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                                <DialogTrigger asChild>
                                    <Button size="sm" className="gap-1.5">
                                        <Plus className="w-3.5 h-3.5" />
                                        إضافة مادة
                                    </Button>
                                </DialogTrigger>

                                <DialogContent className="max-w-xl" dir="rtl">
                                    <DialogHeader>
                                        <DialogTitle>{editingId ? 'تعديل مادة' : 'إضافة مادة جديدة'}</DialogTitle>
                                    </DialogHeader>
                                    <div className="grid grid-cols-2 gap-4 py-4">
                                        <div className="col-span-2 space-y-2">
                                            <label className="text-sm font-medium">اسم المادة</label>
                                            <Input
                                                value={formData.name}
                                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                placeholder="مثال: طحين، طماطم..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">الوحدة</label>
                                            <Select value={formData.unit} onValueChange={v => setFormData({ ...formData, unit: v })}>
                                                <SelectTrigger><SelectValue placeholder="اختر الوحدة" /></SelectTrigger>
                                                <SelectContent dir="rtl">
                                                    <SelectItem value="kg">كيلوجرام (kg)</SelectItem>
                                                    <SelectItem value="g">جرام (g)</SelectItem>
                                                    <SelectItem value="l">لتر (L)</SelectItem>
                                                    <SelectItem value="ml">مليلتر (ml)</SelectItem>
                                                    <SelectItem value="pcs">قطعة (pcs)</SelectItem>
                                                    <SelectItem value="carton">كرتون (carton)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">الرصيد الحالي</label>
                                            <Input type="number" min="0" step="0.01"
                                                value={formData.currentStock}
                                                onChange={e => setFormData({ ...formData, currentStock: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">حد التنبيه</label>
                                            <Input type="number" min="0" step="0.01"
                                                value={formData.minStockLevel}
                                                onChange={e => setFormData({ ...formData, minStockLevel: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">تكلفة الوحدة (د.ع)</label>
                                            <Input type="number" min="0" step="1"
                                                value={formData.costPerUnit}
                                                onChange={e => setFormData({ ...formData, costPerUnit: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        {showBranchSelector && (
                                            <div className="col-span-2 space-y-2">
                                                <label className="text-sm font-medium">الفرع</label>
                                                <Select value={formData.branchId ?? '__all__'} onValueChange={v => setFormData({ ...formData, branchId: v === '__all__' ? null : v })}>
                                                    <SelectTrigger><SelectValue placeholder="اختر الفرع" /></SelectTrigger>
                                                    <SelectContent dir="rtl">
                                                        <SelectItem value="__all__">كل الفروع</SelectItem>
                                                        {branches!.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleSubmit} disabled={isPending || !formData.name} className="w-full">
                                            {isPending ? 'جاري الحفظ...' : 'حفظ'}
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    {filteredMaterials.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
                            {searchTerm ? (
                                <>
                                    <Search className="w-10 h-10 opacity-20" />
                                    <p className="text-sm">لا توجد نتائج لـ &quot;{searchTerm}&quot;</p>
                                </>
                            ) : (
                                <>
                                    <PackageX className="w-10 h-10 opacity-20" />
                                    <p className="text-sm">لا توجد مواد خام مسجلة</p>
                                    <p className="text-xs opacity-60">ابدأ بإضافة أول مادة</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40 hover:bg-muted/40">
                                    <TableHead className="text-right">المادة</TableHead>
                                    <TableHead className="text-right">الرصيد الحالي</TableHead>
                                    <TableHead className="text-right hidden md:table-cell">حد التنبيه</TableHead>
                                    <TableHead className="text-right font-mono">التكلفة / الوحدة</TableHead>
                                    <TableHead className="text-right font-mono">قيمة المخزون</TableHead>
                                    <TableHead className="text-right">الحالة</TableHead>
                                    <TableHead className="w-[110px]" />
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMaterials.map(item => {
                                    const isOutOfStock = item.currentStock <= 0;
                                    const isLowStock   = !isOutOfStock && item.currentStock <= item.minStockLevel;
                                    const stockValue   = item.currentStock * item.costPerUnit;

                                    return (
                                        <TableRow
                                            key={item.id}
                                            className={`transition-colors ${
                                                isOutOfStock
                                                    ? 'bg-red-50/60 hover:bg-red-50 dark:bg-red-950/20 dark:hover:bg-red-950/30'
                                                    : isLowStock
                                                    ? 'bg-amber-50/40 hover:bg-amber-50/60 dark:bg-amber-950/10 dark:hover:bg-amber-950/20'
                                                    : 'hover:bg-muted/30'
                                            }`}
                                        >
                                            {/* اسم المادة */}
                                            <TableCell>
                                                <button
                                                    onClick={() => handleOpenBatches(item)}
                                                    className="font-semibold hover:text-primary flex items-center gap-1.5 group transition-colors text-right"
                                                >
                                                    {item.name}
                                                    <ChevronLeft className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-primary shrink-0" />
                                                </button>
                                            </TableCell>

                                            {/* الرصيد + شريط بصري */}
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="font-mono font-bold text-base tabular-nums">
                                                            {item.currentStock}
                                                        </span>
                                                        <span className="text-xs text-muted-foreground">{item.unit}</span>
                                                    </div>
                                                    <StockLevelBar current={item.currentStock} min={item.minStockLevel} />
                                                </div>
                                            </TableCell>

                                            {/* حد التنبيه */}
                                            <TableCell className="hidden md:table-cell">
                                                <span className="text-sm text-muted-foreground tabular-nums font-mono">
                                                    {item.minStockLevel} {item.unit}
                                                </span>
                                            </TableCell>

                                            {/* التكلفة */}
                                            <TableCell className="font-mono text-sm tabular-nums">
                                                {fmt(item.costPerUnit)}
                                                <span className="text-muted-foreground text-xs mr-0.5"> د.ع</span>
                                            </TableCell>

                                            {/* قيمة المخزون */}
                                            <TableCell className="font-mono text-sm font-semibold tabular-nums text-primary">
                                                {fmt(stockValue)}
                                                <span className="text-muted-foreground font-normal text-xs mr-0.5"> د.ع</span>
                                            </TableCell>

                                            {/* الحالة */}
                                            <TableCell>
                                                {isOutOfStock ? (
                                                    <Badge variant="destructive" className="gap-1 text-xs">
                                                        <AlertCircle className="w-3 h-3" /> نفذت
                                                    </Badge>
                                                ) : isLowStock ? (
                                                    <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                                                        منخفض
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                                                        <CheckCircle2 className="w-3 h-3 mr-1" /> متوفر
                                                    </Badge>
                                                )}
                                            </TableCell>

                                            {/* إجراءات */}
                                            <TableCell>
                                                <div className="flex items-center justify-end gap-0.5">
                                                    <Button
                                                        variant="ghost" size="icon"
                                                        title="عرض الدفعات"
                                                        className="h-8 w-8"
                                                        onClick={() => handleOpenBatches(item)}
                                                    >
                                                        <Layers className="w-3.5 h-3.5 text-purple-600" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost" size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => handleEdit(item)}
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost" size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => handleDelete(item.id)}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* ── Sheet تفاصيل الدفعات ── */}
            <Sheet open={!!batchSheet} onOpenChange={open => { if (!open) setBatchSheet(null); }}>
                <SheetContent side="left" className="w-full max-w-lg overflow-y-auto" dir="rtl">
                    {batchSheet && (
                        <>
                            <SheetHeader className="border-b pb-4">
                                <SheetTitle className="flex items-center gap-2">
                                    <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/40">
                                        <Layers className="w-4 h-4 text-purple-600" />
                                    </div>
                                    دفعات — {batchSheet.material.name}
                                </SheetTitle>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                    <span>
                                        الرصيد:{' '}
                                        <span className="font-bold font-mono text-foreground">
                                            {batchSheet.material.currentStock} {batchSheet.material.unit}
                                        </span>
                                    </span>
                                    <span className="text-border">·</span>
                                    <span>
                                        متوسط التكلفة:{' '}
                                        <span className="font-bold font-mono text-foreground">
                                            {fmt(batchSheet.material.costPerUnit)} د.ع
                                        </span>
                                    </span>
                                </div>
                            </SheetHeader>

                            <div className="py-4 space-y-3">
                                {batchLoading ? (
                                    <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                                        <Clock className="w-5 h-5 animate-spin" />
                                        جاري التحميل...
                                    </div>
                                ) : batchSheet.batches.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground border-2 border-dashed rounded-xl">
                                        <Package className="w-10 h-10 opacity-20" />
                                        <p className="text-sm">لا توجد دفعات نشطة</p>
                                        <p className="text-xs opacity-60">ستظهر الدفعات بعد استلام أول طلب شراء</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                                            <Truck className="w-3.5 h-3.5 shrink-0" />
                                            مرتبة حسب FIFO — الدفعات الأقدم تُصرف أولاً
                                        </div>

                                        {batchSheet.batches.map((batch, idx) => {
                                            const isExpired = batch.expiryDate && new Date(batch.expiryDate) < new Date();
                                            const daysLeft = batch.expiryDate
                                                ? Math.ceil((new Date(batch.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                                                : null;
                                            const isExpiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft > 0;

                                            return (
                                                <div
                                                    key={batch.id}
                                                    className={`rounded-xl border p-4 space-y-2.5 ${
                                                        isExpired
                                                            ? 'border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-700'
                                                            : isExpiringSoon
                                                            ? 'border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-700'
                                                            : 'border-border bg-muted/20'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-full">
                                                            دفعة #{idx + 1}
                                                        </span>
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="font-mono font-bold text-xl tabular-nums">
                                                                {batch.remainingQty}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                {batchSheet.material.unit}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                / {batch.receivedQty} مستلم
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {batch.poItem?.purchaseOrder && (
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                            <Truck className="w-3 h-3 shrink-0" />
                                                            <span>{batch.poItem.purchaseOrder.supplier.name}</span>
                                                            <span className="font-mono text-primary font-medium">
                                                                {batch.poItem.purchaseOrder.poNumber}
                                                            </span>
                                                            <span>· {dateFmt(batch.poItem.purchaseOrder.createdAt)}</span>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center justify-between pt-0.5 border-t border-border/50">
                                                        <span className="text-xs font-mono font-semibold">
                                                            {fmt(batch.unitCost)} د.ع
                                                            <span className="text-muted-foreground font-normal"> / {batchSheet.material.unit}</span>
                                                        </span>
                                                        {batch.expiryDate ? (
                                                            <div className="flex items-center gap-1.5">
                                                                <CalendarDays className="w-3 h-3 text-muted-foreground" />
                                                                <span className="text-xs text-muted-foreground">
                                                                    {dateFmt(batch.expiryDate)}
                                                                </span>
                                                                {isExpired ? (
                                                                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">منتهية</Badge>
                                                                ) : isExpiringSoon ? (
                                                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-orange-100 text-orange-700 border-orange-200">
                                                                        {daysLeft} أيام
                                                                    </Badge>
                                                                ) : (
                                                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground opacity-50">بلا تاريخ صلاحية</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        <div className="rounded-xl bg-primary/5 border border-primary/20 p-3 flex items-center justify-between">
                                            <span className="text-sm font-semibold text-muted-foreground">القيمة الإجمالية للمخزون</span>
                                            <span className="font-mono font-bold text-primary tabular-nums">
                                                {fmt(batchSheet.material.currentStock * batchSheet.material.costPerUnit)} د.ع
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
