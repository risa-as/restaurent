'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { createSupplier, updateSupplier, deleteSupplier, toggleSupplierStatus } from '@/lib/actions/suppliers';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
    Plus, Search, Edit2, Trash2, Truck, Phone, Mail, User2,
    MapPin, ShoppingCart, TrendingUp, CreditCard, AlertTriangle,
    CheckCircle2, XCircle, ChevronLeft, Power, CalendarDays, Banknote
} from 'lucide-react';
import { useFmt, useDateFmt } from '@/contexts/number-locale-context';

interface PurchaseOrder {
    id: string;
    poNumber: string;
    status: string;
    totalCost: number;
    paidAmount: number;
    paymentType: string;
    paymentStatus: string;
    dueDate?: Date | null;
    createdAt: Date;
}

interface Supplier {
    id: string;
    name: string;
    contact: string | null;
    phone: string | null;
    email: string | null;
    address: string | null;
    isActive: boolean;
    createdAt: Date;
    totalPurchased: number;
    totalDebt: number;
    ordersCount: number;
    purchaseOrders: PurchaseOrder[];
}

const EMPTY_FORM = { name: '', contact: '', phone: '', email: '', address: '' };

const PO_STATUS: Record<string, { label: string; color: string }> = {
    DRAFT:              { label: 'مسودة',         color: 'text-gray-500' },
    SENT:               { label: 'مرسل',           color: 'text-blue-600' },
    PARTIALLY_RECEIVED: { label: 'استلام جزئي',   color: 'text-amber-600' },
    RECEIVED:           { label: 'مستلم',          color: 'text-green-600' },
    CANCELLED:          { label: 'ملغي',           color: 'text-red-400' },
};

export function SupplierList({ suppliers }: { suppliers: Supplier[] }) {
    const fmt = useFmt();
    const dateFmt = useDateFmt();
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [searchTerm, setSearchTerm] = useState('');
    const [showInactive, setShowInactive] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState(EMPTY_FORM);

    const resetForm = () => { setFormData(EMPTY_FORM); setEditingId(null); };

    const handleEdit = (s: Supplier) => {
        setEditingId(s.id);
        setFormData({ name: s.name, contact: s.contact ?? '', phone: s.phone ?? '', email: s.email ?? '', address: s.address ?? '' });
        setFormOpen(true);
    };

    const handleSubmit = () => {
        if (!formData.name.trim()) {
            toast({ title: 'خطأ', description: 'يرجى إدخال اسم المورد', variant: 'destructive' });
            return;
        }
        startTransition(async () => {
            const res = editingId
                ? await updateSupplier(editingId, formData)
                : await createSupplier(formData);
            if (res.success) {
                toast({ title: editingId ? 'تم تعديل المورد' : 'تمت إضافة المورد' });
                setFormOpen(false);
                resetForm();
                router.refresh();
            } else {
                toast({ title: res.error || 'حدث خطأ', variant: 'destructive' });
            }
        });
    };

    const handleDelete = (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا المورد؟')) return;
        startTransition(async () => {
            const res = await deleteSupplier(id);
            if (res.success) { toast({ title: 'تم الحذف' }); router.refresh(); }
            else toast({ title: res.error || 'فشل الحذف', variant: 'destructive' });
        });
    };

    const handleToggleStatus = (id: string, current: boolean) => {
        startTransition(async () => {
            const res = await toggleSupplierStatus(id, !current);
            if (res.success) { toast({ title: current ? 'تم إيقاف المورد' : 'تم تفعيل المورد' }); router.refresh(); }
            else toast({ title: res.error || 'حدث خطأ', variant: 'destructive' });
        });
    };

    const filtered = suppliers.filter(s => {
        const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.contact ?? '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchActive = showInactive ? true : s.isActive;
        return matchSearch && matchActive;
    });

    const totalDebt = suppliers.reduce((s, sup) => s + sup.totalDebt, 0);
    const totalPurchased = suppliers.reduce((s, sup) => s + sup.totalPurchased, 0);
    const activeCount = suppliers.filter(s => s.isActive).length;

    return (
        <div className="flex flex-col h-full" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Truck className="w-6 h-6 text-primary" />
                        الموردون
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">إدارة الموردين وتتبع المشتريات والديون</p>
                </div>
                <Button onClick={() => { resetForm(); setFormOpen(true); }} className="gap-2 font-semibold shadow-sm">
                    <Plus className="w-4 h-4" />
                    إضافة مورد
                </Button>
            </div>

            <div className="flex-1 overflow-auto px-6 py-4 space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl border p-4 bg-primary/5 border-primary/20 flex items-center gap-3">
                        <TrendingUp className="w-5 h-5 text-primary shrink-0" />
                        <div>
                            <p className="text-xs text-muted-foreground">إجمالي المشتريات</p>
                            <p className="font-bold font-mono">{fmt(totalPurchased)} <span className="text-xs font-normal">د.ع</span></p>
                        </div>
                    </div>
                    <div className="rounded-xl border p-4 bg-red-50 border-red-200 flex items-center gap-3">
                        <CreditCard className="w-5 h-5 text-red-500 shrink-0" />
                        <div>
                            <p className="text-xs text-muted-foreground">ديون مستحقة</p>
                            <p className="font-bold font-mono text-red-600">{fmt(totalDebt)} <span className="text-xs font-normal">د.ع</span></p>
                        </div>
                    </div>
                    <div className="rounded-xl border p-4 bg-green-50 border-green-200 flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                        <div>
                            <p className="text-xs text-muted-foreground">موردون نشطون</p>
                            <p className="font-bold">{activeCount} / {suppliers.length}</p>
                        </div>
                    </div>
                </div>

                {/* Search + filter */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="بحث..." className="pr-8" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <Button variant={showInactive ? 'default' : 'outline'} size="sm" onClick={() => setShowInactive(v => !v)} className="gap-1.5 shrink-0">
                        <XCircle className="w-4 h-4" />
                        {showInactive ? 'إخفاء الموقوفين' : 'عرض الموقوفين'}
                    </Button>
                </div>

                {/* Table */}
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground border-2 border-dashed rounded-2xl">
                        <Truck className="w-14 h-14 opacity-20" />
                        <p className="font-medium">لا يوجد موردون</p>
                    </div>
                ) : (
                    <div className="rounded-xl border overflow-hidden">
                        <table className="w-full text-sm" style={{ tableLayout: 'fixed', borderCollapse: 'collapse' }}>
                            <colgroup>
                                <col style={{ width: '20%' }} />
                                <col style={{ width: '15%' }} />
                                <col style={{ width: '15%' }} />
                                <col style={{ width: '15%' }} />
                                <col style={{ width: '13%' }} />
                                <col style={{ width: '13%' }} />
                                <col style={{ width: '9%' }} />
                            </colgroup>
                            <thead>
                                <tr className="bg-muted/50 text-muted-foreground text-xs font-semibold border-b">
                                    <th className="px-4 py-3 text-right">المورد</th>
                                    <th className="px-4 py-3 text-center">جهة الاتصال</th>
                                    <th className="px-4 py-3 text-center">الهاتف</th>
                                    <th className="px-4 py-3 text-center">البريد</th>
                                    <th className="px-4 py-3 text-center">إجمالي الشراء</th>
                                    <th className="px-4 py-3 text-center">الديون</th>
                                    <th className="px-4 py-3 text-center">إجراءات</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((s, idx) => (
                                    <tr key={s.id} className={`border-b last:border-0 transition-colors hover:bg-muted/20 ${idx % 2 !== 0 ? 'bg-muted/5' : ''} ${!s.isActive ? 'opacity-50' : ''}`}>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div>
                                                    <button onClick={() => setDetailSupplier(s)} className="font-semibold hover:text-primary hover:underline text-right">
                                                        {s.name}
                                                    </button>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {!s.isActive && <span className="text-[10px] text-red-500 font-medium">موقوف</span>}
                                                        {s.address && <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{s.address}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center text-muted-foreground">
                                            {s.contact ? <span className="flex items-center justify-center gap-1"><User2 className="w-3.5 h-3.5" /><span className="truncate">{s.contact}</span></span> : <span className="opacity-40">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-center text-muted-foreground">
                                            {s.phone ? <span className="flex items-center justify-center gap-1"><Phone className="w-3.5 h-3.5" /><span className="font-mono text-xs">{s.phone}</span></span> : <span className="opacity-40">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-center text-muted-foreground">
                                            {s.email ? <span className="flex items-center justify-center gap-1"><Mail className="w-3.5 h-3.5" /><span className="font-mono text-xs truncate">{s.email}</span></span> : <span className="opacity-40">—</span>}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="font-mono text-xs font-semibold">{fmt(s.totalPurchased)}</span>
                                            <p className="text-[10px] text-muted-foreground">{s.ordersCount} طلب</p>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {s.totalDebt > 0 ? (
                                                <span className="font-mono text-xs font-bold text-red-600">{fmt(s.totalDebt)}</span>
                                            ) : (
                                                <span className="text-xs text-green-600 flex items-center justify-center gap-0.5"><CheckCircle2 className="w-3 h-3" />مسدّد</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-center gap-0.5">
                                                <button onClick={() => setDetailSupplier(s)} title="التفاصيل" className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                                                    <ChevronLeft className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleEdit(s)} title="تعديل" className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => handleToggleStatus(s.id, s.isActive)} title={s.isActive ? 'إيقاف' : 'تفعيل'} className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${s.isActive ? 'text-muted-foreground hover:text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}>
                                                    <Power className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => handleDelete(s.id)} title="حذف" className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ── Add/Edit Sheet ── */}
            <Sheet open={formOpen} onOpenChange={open => { setFormOpen(open); if (!open) resetForm(); }}>
                <SheetContent side="left" className="w-full max-w-md overflow-y-auto" dir="rtl">
                    <SheetHeader className="border-b pb-4">
                        <SheetTitle className="flex items-center gap-2">
                            <Truck className="w-5 h-5 text-primary" />
                            {editingId ? 'تعديل مورد' : 'إضافة مورد جديد'}
                        </SheetTitle>
                    </SheetHeader>
                    <div className="space-y-4 pt-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">اسم المورد *</label>
                            <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="مثال: شركة الغذاء المتحدة" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">جهة الاتصال</label>
                                <Input value={formData.contact} onChange={e => setFormData({ ...formData, contact: e.target.value })} placeholder="اسم المسؤول" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">رقم الهاتف</label>
                                <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="07XXXXXXXXX" dir="ltr" className="text-left" />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">البريد الإلكتروني</label>
                            <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="supplier@example.com" dir="ltr" className="text-left" />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-muted-foreground" />العنوان</label>
                            <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="بغداد، الكرادة..." />
                        </div>
                        <Button onClick={handleSubmit} disabled={isPending || !formData.name.trim()} className="w-full">
                            {isPending ? 'جاري الحفظ...' : 'حفظ'}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* ── Detail Sheet ── */}
            {detailSupplier && (
                <Sheet open={!!detailSupplier} onOpenChange={open => { if (!open) setDetailSupplier(null); }}>
                    <SheetContent side="left" className="w-full max-w-xl overflow-y-auto" dir="rtl">
                        <SheetHeader className="border-b pb-4">
                            <SheetTitle className="flex items-center justify-between">
                                <span className="flex items-center gap-2"><Truck className="w-5 h-5 text-primary" />{detailSupplier.name}</span>
                                <Badge variant={detailSupplier.isActive ? 'default' : 'secondary'}>{detailSupplier.isActive ? 'نشط' : 'موقوف'}</Badge>
                            </SheetTitle>
                        </SheetHeader>
                        <div className="space-y-4 pt-4">
                            {/* Contact Info */}
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                {detailSupplier.phone && <div className="rounded-lg bg-muted/40 p-3 flex items-center gap-2"><Phone className="w-4 h-4 text-primary" />{detailSupplier.phone}</div>}
                                {detailSupplier.email && <div className="rounded-lg bg-muted/40 p-3 flex items-center gap-2 text-xs"><Mail className="w-4 h-4 text-primary" />{detailSupplier.email}</div>}
                                {detailSupplier.address && <div className="rounded-lg bg-muted/40 p-3 flex items-center gap-2 col-span-2"><MapPin className="w-4 h-4 text-primary" />{detailSupplier.address}</div>}
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="rounded-lg border p-3 text-center">
                                    <ShoppingCart className="w-4 h-4 text-primary mx-auto mb-1" />
                                    <p className="text-xs text-muted-foreground">الطلبات</p>
                                    <p className="font-bold">{detailSupplier.ordersCount}</p>
                                </div>
                                <div className="rounded-lg border p-3 text-center">
                                    <Banknote className="w-4 h-4 text-green-500 mx-auto mb-1" />
                                    <p className="text-xs text-muted-foreground">إجمالي الشراء</p>
                                    <p className="font-bold font-mono text-xs">{fmt(detailSupplier.totalPurchased)}</p>
                                </div>
                                <div className="rounded-lg border p-3 text-center">
                                    <CreditCard className="w-4 h-4 text-red-500 mx-auto mb-1" />
                                    <p className="text-xs text-muted-foreground">الديون</p>
                                    <p className={`font-bold font-mono text-xs ${detailSupplier.totalDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        {detailSupplier.totalDebt > 0 ? fmt(detailSupplier.totalDebt) : 'لا ديون'}
                                    </p>
                                </div>
                            </div>

                            <Separator />

                            {/* Orders History */}
                            <div>
                                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                                    <ShoppingCart className="w-4 h-4 text-primary" />
                                    سجل الطلبات ({detailSupplier.purchaseOrders.length})
                                </p>
                                {detailSupplier.purchaseOrders.length === 0 ? (
                                    <p className="text-sm text-muted-foreground text-center py-6">لا توجد طلبات</p>
                                ) : (
                                    <div className="space-y-2">
                                        {detailSupplier.purchaseOrders.map(po => {
                                            const cfg = PO_STATUS[po.status] ?? { label: po.status, color: 'text-gray-500' };
                                            const isOverdue = po.paymentType === 'DEFERRED' && po.paymentStatus !== 'PAID' && po.dueDate && new Date(po.dueDate) < new Date();
                                            return (
                                                <div key={po.id} className={`rounded-lg border p-3 ${isOverdue ? 'border-red-300 bg-red-50/50' : ''}`}>
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-mono font-bold text-primary text-sm">{po.poNumber}</span>
                                                        <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-1.5 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1"><CalendarDays className="w-3 h-3" />{dateFmt(po.createdAt)}</span>
                                                        <span className="font-mono font-semibold">{fmt(po.totalCost)} د.ع</span>
                                                    </div>
                                                    {po.paymentType === 'DEFERRED' && (
                                                        <div className="mt-1.5 flex items-center justify-between text-xs">
                                                            <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-semibold' : 'text-amber-600'}`}>
                                                                {isOverdue && <AlertTriangle className="w-3 h-3" />}
                                                                آجل — {po.paymentStatus === 'PAID' ? 'مسدّد' : po.paymentStatus === 'PARTIAL' ? `جزئي (${fmt(po.paidAmount)})` : 'غير مسدّد'}
                                                            </span>
                                                            {po.dueDate && <span className="text-muted-foreground">{dateFmt(po.dueDate)}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            )}
        </div>
    );
}
