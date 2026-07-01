'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { adjustCustomerPoints, deleteCustomer } from '@/lib/actions/loyalty';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Star, Trash2, Plus, Minus, Users, TrendingUp, Search } from 'lucide-react';
import { useFmt } from '@/contexts/number-locale-context';

interface Customer {
    id: string;
    name: string | null;
    phone: string;
    totalPoints: number;
    totalSpent: number;
    lastVisitAt: Date | null;
    createdAt: Date;
}

interface CustomersTableProps {
    customers: Customer[];
    loyaltyEnabled: boolean;
    pointValueIqd: number;
}

export function CustomersTable({ customers, loyaltyEnabled, pointValueIqd }: CustomersTableProps) {
    const fmt = useFmt();
    const [search, setSearch] = useState('');
    const [adjustDialog, setAdjustDialog] = useState<{ open: boolean; customer: Customer | null; op: 'add' | 'subtract' }>({
        open: false, customer: null, op: 'add',
    });
    const [points, setPoints] = useState(0);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const filtered = customers.filter(c =>
        (c.name || '').includes(search) || c.phone.includes(search)
    );

    const totalPoints = customers.reduce((s, c) => s + c.totalPoints, 0);
    const totalSpent = customers.reduce((s, c) => s + c.totalSpent, 0);

    function openAdjust(customer: Customer, op: 'add' | 'subtract') {
        setAdjustDialog({ open: true, customer, op });
        setPoints(0);
    }

    function handleAdjust() {
        if (!adjustDialog.customer || points <= 0) return;
        startTransition(async () => {
            const res = await adjustCustomerPoints(adjustDialog.customer!.id, points, adjustDialog.op);
            if (res.success) {
                toast({ title: adjustDialog.op === 'add' ? 'تمت إضافة النقاط' : 'تم خصم النقاط' });
                setAdjustDialog({ open: false, customer: null, op: 'add' });
            } else {
                toast({ title: 'خطأ', description: res.error, variant: 'destructive' });
            }
        });
    }

    function handleDelete(id: string, name: string) {
        if (!confirm(`هل تريد حذف ${name || 'هذا العميل'}؟`)) return;
        startTransition(async () => {
            await deleteCustomer(id);
            toast({ title: 'تم حذف العميل' });
        });
    }

    return (
        <>
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4">
                <Card className="shadow-sm">
                    <CardContent className="pt-4 pb-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Users className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">عدد العملاء</p>
                            <p className="text-2xl font-black">{customers.length}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="pt-4 pb-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center shrink-0">
                            <Star className="w-5 h-5 text-yellow-600 fill-yellow-500" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">إجمالي النقاط الفعّالة</p>
                            <p className="text-2xl font-black text-yellow-600 dark:text-yellow-400">{fmt(totalPoints)}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="pt-4 pb-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                            <TrendingUp className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">إجمالي إنفاق الأعضاء</p>
                            <p className="text-2xl font-black text-green-600 dark:text-green-400">{fmt(totalSpent)} <span className="text-sm font-normal text-muted-foreground">د.ع</span></p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card className="shadow-sm overflow-hidden">
                <CardHeader className="border-b bg-muted/30 pb-3">
                    <div className="flex items-center justify-between gap-4">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Users className="w-4 h-4 text-primary" />
                            سجل العملاء
                        </CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="بحث بالاسم أو الرقم..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pr-9 h-8 text-sm"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="font-bold text-foreground">العميل</TableHead>
                                <TableHead className="font-bold text-foreground text-center">رقم الهاتف</TableHead>
                                <TableHead className="font-bold text-foreground text-center">النقاط</TableHead>
                                <TableHead className="font-bold text-foreground text-center">قيمة النقاط</TableHead>
                                <TableHead className="font-bold text-foreground text-center">الإنفاق التراكمي</TableHead>
                                <TableHead className="font-bold text-foreground text-center">آخر زيارة</TableHead>
                                {loyaltyEnabled && <TableHead className="font-bold text-foreground text-center">الإجراءات</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={loyaltyEnabled ? 7 : 6} className="text-center py-16 text-muted-foreground">
                                        <Star className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                        <p>لا يوجد عملاء{search ? ' يطابقون البحث' : ' بعد'}</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filtered.map((c, i) => (
                                    <TableRow key={c.id} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                                                    {(c.name || c.phone).charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-sm">{c.name || 'غير محدد'}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        منذ {format(new Date(c.createdAt), 'MMM yyyy', { locale: ar })}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span dir="ltr" className="inline-block bg-muted px-2 py-0.5 rounded text-sm font-mono">{c.phone}</span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800 font-black gap-1">
                                                <Star className="w-3 h-3 fill-yellow-500" />
                                                {fmt(c.totalPoints)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center text-sm text-muted-foreground">
                                            {fmt(c.totalPoints * pointValueIqd)} د.ع
                                        </TableCell>
                                        <TableCell className="text-center font-bold text-green-600 dark:text-green-400">
                                            {fmt(c.totalSpent)} د.ع
                                        </TableCell>
                                        <TableCell className="text-center text-sm text-muted-foreground">
                                            {c.lastVisitAt
                                                ? format(new Date(c.lastVisitAt), 'dd/MM/yyyy', { locale: ar })
                                                : '—'
                                            }
                                        </TableCell>
                                        {loyaltyEnabled && (
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                                                        onClick={() => openAdjust(c, 'add')}>
                                                        <Plus className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                                                        onClick={() => openAdjust(c, 'subtract')}>
                                                        <Minus className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleDelete(c.id, c.name || '')}>
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Adjust Points Dialog */}
            <Dialog open={adjustDialog.open} onOpenChange={o => setAdjustDialog(p => ({ ...p, open: o }))}>
                <DialogContent dir="rtl" className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                            {adjustDialog.op === 'add' ? 'إضافة نقاط' : 'خصم نقاط'} — {adjustDialog.customer?.name || adjustDialog.customer?.phone}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 py-2">
                        <div className="space-y-1.5">
                            <Label>عدد النقاط</Label>
                            <Input
                                type="number"
                                min={1}
                                value={points || ''}
                                onChange={e => setPoints(Number(e.target.value))}
                                placeholder="0"
                                className="text-center text-xl font-bold"
                            />
                        </div>
                        {points > 0 && (
                            <p className="text-sm text-muted-foreground text-center">
                                = {fmt(points * pointValueIqd)} د.ع
                            </p>
                        )}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setAdjustDialog(p => ({ ...p, open: false }))}>إلغاء</Button>
                        <Button
                            onClick={handleAdjust}
                            disabled={isPending || points <= 0}
                            className={adjustDialog.op === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-500 hover:bg-orange-600'}
                        >
                            {isPending ? 'جارٍ...' : adjustDialog.op === 'add' ? 'إضافة' : 'خصم'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
