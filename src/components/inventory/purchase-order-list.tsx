'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import {
    Plus, Package, Clock, CheckCircle2, Send, XCircle,
    PackageCheck, Truck, CalendarDays, FileText, AlertTriangle,
    Ban, ChevronLeft, TrendingUp, ShoppingCart, Loader2,
    CreditCard, DollarSign
} from 'lucide-react';
import { PurchaseOrderForm } from '@/components/inventory/purchase-order-form';
import { ReceiveGoodsForm } from '@/components/inventory/receive-goods-form';
import { cancelPurchaseOrder, recordSupplierPayment } from '@/lib/actions/purchase-orders';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useFmt, useDateFmt } from '@/contexts/number-locale-context';

type POStatus = 'DRAFT' | 'SENT' | 'RECEIVED' | 'PARTIALLY_RECEIVED' | 'CANCELLED';
type POPaymentType = 'CASH' | 'DEFERRED';
type POPaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';

interface POItem {
    id: string;
    materialId: string;
    orderedQty: number;
    receivedQty: number;
    unitCost: number;
    material: { name: string; unit: string };
}

interface SupplierPayment {
    id: string;
    amount: number;
    paidAt: Date;
    notes?: string | null;
}

interface PurchaseOrder {
    id: string;
    poNumber: string;
    status: POStatus;
    totalCost: number;
    paidAmount: number;
    paymentType: POPaymentType;
    paymentStatus: POPaymentStatus;
    dueDate?: Date | null;
    expectedDate: Date | null;
    createdAt: Date;
    notes?: string | null;
    supplier: { id: string; name: string };
    items: POItem[];
    payments: SupplierPayment[];
}

const STATUS_CONFIG: Record<POStatus, {
    label: string;
    color: string;
    bg: string;
    border: string;
    icon: React.ReactNode;
}> = {
    DRAFT:              { label: 'مسودة',         color: 'text-gray-600',   bg: 'bg-gray-100',   border: 'border-gray-200',  icon: <Clock className="w-3.5 h-3.5" /> },
    SENT:               { label: 'مرسل',           color: 'text-blue-600',   bg: 'bg-blue-50',    border: 'border-blue-200',  icon: <Send className="w-3.5 h-3.5" /> },
    PARTIALLY_RECEIVED: { label: 'استلام جزئي',   color: 'text-amber-600',  bg: 'bg-amber-50',   border: 'border-amber-200', icon: <PackageCheck className="w-3.5 h-3.5" /> },
    RECEIVED:           { label: 'مستلم بالكامل', color: 'text-green-600',  bg: 'bg-green-50',   border: 'border-green-200', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    CANCELLED:          { label: 'ملغي',           color: 'text-red-500',    bg: 'bg-red-50',     border: 'border-red-200',   icon: <XCircle className="w-3.5 h-3.5" /> },
};

const TABS: { key: 'ALL' | POStatus; label: string }[] = [
    { key: 'ALL',               label: 'الكل' },
    { key: 'DRAFT',             label: 'مسودة' },
    { key: 'SENT',              label: 'مرسل' },
    { key: 'PARTIALLY_RECEIVED',label: 'استلام جزئي' },
    { key: 'RECEIVED',          label: 'مستلم' },
    { key: 'CANCELLED',         label: 'ملغي' },
];

function StatusBadge({ status }: { status: POStatus }) {
    const cfg = STATUS_CONFIG[status];
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
            {cfg.icon}
            {cfg.label}
        </span>
    );
}

function StatCard({ label, value, sub, icon, color }: {
    label: string; value: string | number; sub?: string;
    icon: React.ReactNode; color: string;
}) {
    return (
        <div className={`rounded-xl border p-4 flex items-start gap-3 ${color}`}>
            <div className="mt-0.5 shrink-0">{icon}</div>
            <div className="min-w-0">
                <p className="text-xs text-muted-foreground leading-tight">{label}</p>
                <p className="text-xl font-bold mt-0.5 truncate">{value}</p>
                {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            </div>
        </div>
    );
}

export function PurchaseOrderList({ orders }: { orders: PurchaseOrder[] }) {
    const fmt = useFmt();
    const dateFmt = useDateFmt();
    const router = useRouter();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [createOpen, setCreateOpen] = useState(false);
    const [detailPO, setDetailPO] = useState<PurchaseOrder | null>(null);
    const [receiveOrder, setReceiveOrder] = useState<PurchaseOrder | null>(null);
    const [activeTab, setActiveTab] = useState<'ALL' | POStatus>('ALL');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [paymentPending, startPaymentTransition] = useTransition();

    // ── Stats ──────────────────────────────────────────────────────────────
    const totalPending = orders.filter(o => o.status === 'SENT' || o.status === 'PARTIALLY_RECEIVED').length;
    const totalValue   = orders.filter(o => o.status !== 'CANCELLED')
        .reduce((s, o) => s + o.totalCost, 0);
    const receivedCount = orders.filter(o => o.status === 'RECEIVED').length;
    const draftCount    = orders.filter(o => o.status === 'DRAFT').length;
    const totalDebt     = orders
        .filter(o => o.paymentType === 'DEFERRED' && o.paymentStatus !== 'PAID' && o.status !== 'CANCELLED')
        .reduce((s, o) => s + (o.totalCost - o.paidAmount), 0);

    // ── Filtered ───────────────────────────────────────────────────────────
    const filtered = activeTab === 'ALL' ? orders : orders.filter(o => o.status === activeTab);

    const handleCancel = (id: string) => {
        if (!confirm('هل تريد إلغاء هذا الطلب؟')) return;
        startTransition(async () => {
            const res = await cancelPurchaseOrder(id);
            if (res.success) {
                toast({ title: 'تم إلغاء الطلب' });
                router.refresh();
            } else {
                toast({ title: res.error || 'حدث خطأ', variant: 'destructive' });
            }
        });
    };

    const handleRecordPayment = () => {
        if (!detailPO) return;
        const amount = parseFloat(paymentAmount);
        if (!amount || amount <= 0) {
            toast({ title: 'خطأ', description: 'يرجى إدخال مبلغ صحيح', variant: 'destructive' });
            return;
        }
        const remaining = detailPO.totalCost - detailPO.paidAmount;
        if (amount > remaining) {
            toast({ title: 'خطأ', description: `المبلغ أكبر من المتبقي (${fmt(remaining)} د.ع)`, variant: 'destructive' });
            return;
        }
        startPaymentTransition(async () => {
            const res = await recordSupplierPayment({
                purchaseOrderId: detailPO.id,
                supplierId: detailPO.supplier.id,
                amount,
                notes: paymentNotes || undefined,
            });
            if (res.success) {
                toast({ title: '✅ تم تسجيل الدفعة بنجاح' });
                setPaymentAmount('');
                setPaymentNotes('');
                setDetailPO(null);
                router.refresh();
            } else {
                toast({ title: res.error || 'حدث خطأ', variant: 'destructive' });
            }
        });
    };


    return (
        <div className="flex flex-col h-full" dir="rtl">
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <ShoppingCart className="w-6 h-6 text-primary" />
                        طلبات الشراء
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">إدارة وتتبع طلبات الشراء وعمليات الاستلام</p>
                </div>
                <Button onClick={() => setCreateOpen(true)} className="gap-2 font-semibold shadow-sm">
                    <Plus className="w-4 h-4" />
                    إنشاء طلب جديد
                </Button>
            </div>

            <div className="flex-1 overflow-auto px-6 py-4 space-y-5">

                {/* ── Stats Row ── */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    <StatCard
                        label="إجمالي القيمة"
                        value={`${fmt(totalValue)} د.ع`}
                        icon={<TrendingUp className="w-5 h-5 text-primary" />}
                        color="bg-primary/5 border-primary/20"
                    />
                    <StatCard
                        label="ديون مستحقة"
                        value={`${fmt(totalDebt)} د.ع`}
                        icon={<CreditCard className="w-5 h-5 text-red-500" />}
                        color="bg-red-50 border-red-200"
                    />
                    <StatCard
                        label="طلبات معلقة"
                        value={totalPending}
                        sub="مرسلة / استلام جزئي"
                        icon={<Truck className="w-5 h-5 text-blue-500" />}
                        color="bg-blue-50 border-blue-200"
                    />
                    <StatCard
                        label="مستلمة بالكامل"
                        value={receivedCount}
                        icon={<CheckCircle2 className="w-5 h-5 text-green-500" />}
                        color="bg-green-50 border-green-200"
                    />
                    <StatCard
                        label="مسودات"
                        value={draftCount}
                        icon={<FileText className="w-5 h-5 text-gray-400" />}
                        color="bg-muted/50 border-border"
                    />
                </div>

                {/* ── Tabs ── */}
                <div className="flex gap-1 bg-muted/40 rounded-xl p-1 w-fit border">
                    {TABS.map(tab => {
                        const count = tab.key === 'ALL'
                            ? orders.length
                            : orders.filter(o => o.status === tab.key).length;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                                    activeTab === tab.key
                                        ? 'bg-background shadow-sm text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {tab.label}
                                {count > 0 && (
                                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                                        activeTab === tab.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                                    }`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* ── Table ── */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground border-2 border-dashed rounded-2xl">
                        <Package className="w-14 h-14 opacity-20" />
                        <p className="text-base font-medium">لا توجد طلبات شراء</p>
                        <p className="text-sm">ابدأ بإنشاء طلب شراء جديد</p>
                        <Button size="sm" variant="outline" className="mt-2 gap-2" onClick={() => setCreateOpen(true)}>
                            <Plus className="w-4 h-4" /> إنشاء طلب
                        </Button>
                    </div>
                ) : (
                    <div className="rounded-xl border overflow-hidden">
                        <table className="w-full text-sm" style={{ tableLayout: 'fixed', borderCollapse: 'collapse' }}>
                            <colgroup>
                                <col style={{ width: '12%' }} />
                                <col style={{ width: '18%' }} />
                                <col style={{ width: '14%' }} />
                                <col style={{ width: '16%' }} />
                                <col style={{ width: '14%' }} />
                                <col style={{ width: '14%' }} />
                                <col style={{ width: '12%' }} />
                            </colgroup>
                            <thead>
                                <tr className="bg-muted/50 text-muted-foreground text-xs font-semibold border-b">
                                    <th className="px-4 py-3 text-right">رقم الطلب</th>
                                    <th className="px-4 py-3 text-right">المورد</th>
                                    <th className="px-4 py-3 text-center">الحالة</th>
                                    <th className="px-4 py-3 text-center">القيمة الإجمالية</th>
                                    <th className="px-4 py-3 text-center">الأصناف</th>
                                    <th className="px-4 py-3 text-center">تاريخ التسليم</th>
                                    <th className="px-4 py-3 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((po, idx) => {
                                    const canReceive = po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED';
                                    const canCancel  = po.status === 'DRAFT' || po.status === 'SENT';
                                    const isOverdue  = po.expectedDate && new Date(po.expectedDate) < new Date() && po.status !== 'RECEIVED' && po.status !== 'CANCELLED';

                                    return (
                                        <tr
                                            key={po.id}
                                            className={`border-b last:border-0 transition-colors hover:bg-muted/20 ${idx % 2 !== 0 ? 'bg-muted/5' : ''}`}
                                        >
                                            {/* رقم الطلب */}
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => setDetailPO(po)}
                                                    className="font-mono font-bold text-primary hover:underline text-right w-full"
                                                >
                                                    {po.poNumber}
                                                </button>
                                            </td>

                                            {/* المورد */}
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center gap-1.5">
                                                    <Truck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                    <span className="truncate font-medium">{po.supplier.name}</span>
                                                </div>
                                            </td>

                                            {/* الحالة */}
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex flex-col items-center gap-1">
                                                    <StatusBadge status={po.status} />
                                                    {isOverdue && (
                                                        <span className="flex items-center gap-0.5 text-[10px] text-red-500 font-medium">
                                                            <AlertTriangle className="w-2.5 h-2.5" />
                                                            متأخر
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* القيمة */}
                                            <td className="px-4 py-3 text-center font-mono font-bold">
                                                {fmt(po.totalCost)} <span className="text-xs font-normal text-muted-foreground">د.ع</span>
                                            </td>

                                            {/* الأصناف */}
                                            <td className="px-4 py-3 text-center text-muted-foreground">
                                                {po.items.length} صنف
                                            </td>

                                            {/* تاريخ التسليم */}
                                            <td className="px-4 py-3 text-center">
                                                {po.expectedDate ? (
                                                    <span className={`flex items-center justify-center gap-1 text-xs ${isOverdue ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
                                                        <CalendarDays className="w-3.5 h-3.5" />
                                                        {dateFmt(po.expectedDate)}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground opacity-40">—</span>
                                                )}
                                            </td>

                                            {/* إجراءات */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button
                                                        onClick={() => setDetailPO(po)}
                                                        title="عرض التفاصيل"
                                                        className="flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                                                    >
                                                        <ChevronLeft className="w-4 h-4" />
                                                    </button>
                                                    {canReceive && (
                                                        <button
                                                            onClick={() => setReceiveOrder(po)}
                                                            title="تسجيل استلام"
                                                            className="flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-green-600 hover:bg-green-50 transition-colors"
                                                        >
                                                            <Package className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    {canCancel && (
                                                        <button
                                                            onClick={() => handleCancel(po.id)}
                                                            title="إلغاء الطلب"
                                                            disabled={isPending}
                                                            className="flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                                                        >
                                                            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Create PO Sheet ── */}
            <Sheet open={createOpen} onOpenChange={setCreateOpen}>
                <SheetContent side="left" className="w-full max-w-xl overflow-y-auto" dir="rtl">
                    <SheetHeader className="border-b pb-4 mb-2">
                        <SheetTitle className="flex items-center gap-2">
                            <ShoppingCart className="w-5 h-5 text-primary" />
                            إنشاء طلب شراء جديد
                        </SheetTitle>
                    </SheetHeader>
                    <PurchaseOrderForm
                        onSuccess={() => { setCreateOpen(false); router.refresh(); }}
                    />
                </SheetContent>
            </Sheet>

            {/* ── Detail Sheet ── */}
            {detailPO && (
                <Sheet open={!!detailPO} onOpenChange={open => { if (!open) setDetailPO(null); }}>
                    <SheetContent side="left" className="w-full max-w-2xl overflow-y-auto" dir="rtl">
                        <SheetHeader className="border-b pb-4">
                            <SheetTitle className="flex items-center justify-between">
                                <span className="font-mono text-primary">{detailPO.poNumber}</span>
                                <StatusBadge status={detailPO.status} />
                            </SheetTitle>
                        </SheetHeader>
                        <div className="space-y-4 pt-4">
                            {/* Info Grid */}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div className="rounded-lg bg-muted/40 p-3">
                                    <p className="text-xs text-muted-foreground mb-1">المورد</p>
                                    <p className="font-semibold flex items-center gap-1">
                                        <Truck className="w-3.5 h-3.5 text-primary" />
                                        {detailPO.supplier.name}
                                    </p>
                                </div>
                                <div className="rounded-lg bg-muted/40 p-3">
                                    <p className="text-xs text-muted-foreground mb-1">القيمة الإجمالية</p>
                                    <p className="font-bold font-mono text-primary">
                                        {fmt(detailPO.totalCost)} د.ع
                                    </p>
                                </div>
                                <div className="rounded-lg bg-muted/40 p-3">
                                    <p className="text-xs text-muted-foreground mb-1">تاريخ الإنشاء</p>
                                    <p className="font-medium flex items-center gap-1">
                                        <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                                        {dateFmt(detailPO.createdAt)}
                                    </p>
                                </div>
                                <div className="rounded-lg bg-muted/40 p-3">
                                    <p className="text-xs text-muted-foreground mb-1">تاريخ التسليم المتوقع</p>
                                    <p className="font-medium flex items-center gap-1">
                                        <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                                        {detailPO.expectedDate
                                            ? dateFmt(detailPO.expectedDate)
                                            : 'غير محدد'}
                                    </p>
                                </div>
                            </div>

                            {detailPO.notes && (
                                <div className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
                                    <p className="text-xs font-semibold mb-1 text-foreground">ملاحظات</p>
                                    {detailPO.notes}
                                </div>
                            )}

                            <Separator />

                            {/* Items Table */}
                            <div>
                                <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                                    <Package className="w-4 h-4 text-primary" />
                                    الأصناف ({detailPO.items.length})
                                </p>
                                <div className="rounded-lg border overflow-x-auto">
                                    <table className="w-full text-sm" style={{ tableLayout: 'auto', borderCollapse: 'collapse', minWidth: '480px' }}>
                                        <colgroup>
                                            <col style={{ width: '28%' }} />
                                            <col style={{ width: '18%' }} />
                                            <col style={{ width: '14%' }} />
                                            <col style={{ width: '20%' }} />
                                            <col style={{ width: '20%' }} />
                                        </colgroup>
                                        <thead>
                                            <tr className="bg-muted/40 text-xs text-muted-foreground border-b">
                                                <th className="px-3 py-2 text-right">المادة</th>
                                                <th className="px-3 py-2 text-center">مطلوب</th>
                                                <th className="px-3 py-2 text-center">مستلم</th>
                                                <th className="px-3 py-2 text-center">السعر</th>
                                                <th className="px-3 py-2 text-center">الإجمالي</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {detailPO.items.map((item, i) => {
                                                const pct = item.orderedQty > 0 ? (item.receivedQty / item.orderedQty) * 100 : 0;
                                                return (
                                                    <tr key={item.id} className={`border-b last:border-0 ${i % 2 !== 0 ? 'bg-muted/10' : ''}`}>
                                                        <td className="px-3 py-2.5 font-medium text-right">{item.material.name}</td>
                                                        <td className="px-3 py-2.5 text-center text-muted-foreground font-mono">
                                                            {item.orderedQty} {item.material.unit}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center">
                                                            <span className={`font-mono font-semibold ${pct >= 100 ? 'text-green-600' : pct > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                                                                {item.receivedQty}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center font-mono text-muted-foreground">
                                                            {fmt(item.unitCost)}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center font-mono font-bold">
                                                            {fmt(item.orderedQty * item.unitCost)}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Payment Status */}
                            {detailPO.paymentType === 'DEFERRED' && (
                                <>
                                    <Separator />
                                    <div className="space-y-3">
                                        <p className="text-sm font-semibold flex items-center gap-2">
                                            <CreditCard className="w-4 h-4 text-amber-500" />
                                            حالة الدفع الآجل
                                        </p>
                                        {/* Progress Bar */}
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-xs text-muted-foreground">
                                                <span>مدفوع: {fmt(detailPO.paidAmount)} د.ع</span>
                                                <span>المتبقي: {fmt(detailPO.totalCost - detailPO.paidAmount)} د.ع</span>
                                            </div>
                                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${detailPO.paymentStatus === 'PAID' ? 'bg-green-500' : detailPO.paymentStatus === 'PARTIAL' ? 'bg-amber-500' : 'bg-red-400'}`}
                                                    style={{ width: `${Math.min((detailPO.paidAmount / detailPO.totalCost) * 100, 100)}%` }}
                                                />
                                            </div>
                                            {detailPO.dueDate && (
                                                <p className={`text-xs flex items-center gap-1 ${new Date(detailPO.dueDate) < new Date() && detailPO.paymentStatus !== 'PAID' ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
                                                    <CalendarDays className="w-3 h-3" />
                                                    تاريخ الاستحقاق: {dateFmt(detailPO.dueDate)}
                                                    {new Date(detailPO.dueDate) < new Date() && detailPO.paymentStatus !== 'PAID' && ' — متأخر'}
                                                </p>
                                            )}
                                        </div>

                                        {/* Payments History */}
                                        {detailPO.payments.length > 0 && (
                                            <div className="rounded-lg border divide-y text-xs">
                                                {detailPO.payments.map(p => (
                                                    <div key={p.id} className="flex items-center justify-between px-3 py-2">
                                                        <span className="text-muted-foreground">{dateFmt(p.paidAt)}</span>
                                                        <span className="font-mono font-semibold text-green-600">+{fmt(p.amount)} د.ع</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Record Payment */}
                                        {detailPO.paymentStatus !== 'PAID' && (
                                            <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-2">
                                                <p className="text-xs font-semibold text-amber-700">تسجيل دفعة</p>
                                                <div className="flex gap-2">
                                                    <Input
                                                        type="number"
                                                        placeholder={`المبلغ (المتبقي: ${fmt(detailPO.totalCost - detailPO.paidAmount)})`}
                                                        value={paymentAmount}
                                                        onChange={e => setPaymentAmount(e.target.value)}
                                                        className="h-9 text-sm"
                                                        dir="ltr"
                                                    />
                                                    <Button
                                                        size="sm"
                                                        className="h-9 gap-1 bg-amber-600 hover:bg-amber-700 shrink-0"
                                                        onClick={handleRecordPayment}
                                                        disabled={paymentPending}
                                                    >
                                                        {paymentPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <DollarSign className="w-3 h-3" />}
                                                        دفع
                                                    </Button>
                                                </div>
                                                <Input
                                                    placeholder="ملاحظة (اختياري)"
                                                    value={paymentNotes}
                                                    onChange={e => setPaymentNotes(e.target.value)}
                                                    className="h-8 text-xs"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            {/* Actions */}
                            {(detailPO.status === 'SENT' || detailPO.status === 'PARTIALLY_RECEIVED') && (
                                <Button
                                    className="w-full gap-2"
                                    onClick={() => { setDetailPO(null); setReceiveOrder(detailPO); }}
                                >
                                    <Package className="w-4 h-4" />
                                    تسجيل استلام البضاعة
                                </Button>
                            )}
                        </div>

                    </SheetContent>
                </Sheet>
            )}

            {/* ── Receive Goods Sheet ── */}
            {receiveOrder && (
                <Sheet open={!!receiveOrder} onOpenChange={open => { if (!open) setReceiveOrder(null); }}>
                    <SheetContent side="left" className="w-full max-w-xl overflow-y-auto" dir="rtl">
                        <SheetHeader className="border-b pb-4 mb-2">
                            <SheetTitle className="flex items-center gap-2">
                                <PackageCheck className="w-5 h-5 text-green-600" />
                                تسجيل استلام — <span className="font-mono text-primary">{receiveOrder.poNumber}</span>
                            </SheetTitle>
                            <p className="text-sm text-muted-foreground">{receiveOrder.supplier.name}</p>
                        </SheetHeader>
                        <ReceiveGoodsForm
                            po={receiveOrder}
                            onSuccess={() => { setReceiveOrder(null); router.refresh(); }}
                        />
                    </SheetContent>
                </Sheet>
            )}
        </div>
    );
}
