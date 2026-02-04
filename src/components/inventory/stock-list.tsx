'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createRawMaterial, updateRawMaterial, deleteRawMaterial } from '@/lib/actions/inventory';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, Edit2, Trash2, Package, AlertCircle } from 'lucide-react';
import { RawMaterial } from '@prisma/client';
import { Badge } from '@/components/ui/badge';

interface StockListProps {
    materials: RawMaterial[];
}

export function StockList({ materials }: StockListProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [isPending, startTransition] = useTransition();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { toast } = useToast();

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        unit: 'kg',
        currentStock: 0,
        minStockLevel: 5,
        costPerUnit: 0
    });

    const resetForm = () => {
        setFormData({
            name: '',
            unit: 'kg',
            currentStock: 0,
            minStockLevel: 5,
            costPerUnit: 0
        });
        setEditingId(null);
    };

    const handleEdit = (item: RawMaterial) => {
        setEditingId(item.id);
        setFormData({
            name: item.name,
            unit: item.unit,
            currentStock: item.currentStock,
            minStockLevel: item.minStockLevel,
            costPerUnit: item.costPerUnit
        });
        setIsDialogOpen(true);
    };

    const handleSubmit = () => {
        startTransition(async () => {
            const dataToSubmit = {
                ...formData,
            };

            let res;
            if (editingId) {
                res = await updateRawMaterial(editingId, dataToSubmit);
            } else {
                res = await createRawMaterial(dataToSubmit);
            }

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

    const filteredMaterials = materials.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <Package className="w-6 h-6 text-primary" />
                        المواد الخام
                    </CardTitle>
                    <CardDescription>إدارة المخزون والمواد الأولية</CardDescription>
                </div>
                <div className="flex gap-2">
                    <div className="relative w-64">
                        <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="بحث عن مادة..."
                            className="pr-8"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 font-bold">
                                <Plus className="w-4 h-4" />
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
                                    <Select
                                        value={formData.unit}
                                        onValueChange={v => setFormData({ ...formData, unit: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="اختر الوحدة" />
                                        </SelectTrigger>
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
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.currentStock}
                                        onChange={e => setFormData({ ...formData, currentStock: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">حد التنبيه</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={formData.minStockLevel}
                                        onChange={e => setFormData({ ...formData, minStockLevel: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">تكلفة الوحدة (د.ع)</label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="1"
                                        value={formData.costPerUnit}
                                        onChange={e => setFormData({ ...formData, costPerUnit: parseFloat(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button onClick={handleSubmit} disabled={isPending || !formData.name} className="w-full">
                                    {isPending ? 'جاري الحفظ...' : 'حفظ'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-right">المادة</TableHead>
                            <TableHead className="text-right">الرصيد الحالي</TableHead>
                            <TableHead className="text-right">التكلفة (الوحدة)</TableHead>
                            <TableHead className="text-right">الحالة</TableHead>
                            <TableHead className="text-left w-[100px]">إجراءات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredMaterials.map(item => {
                            const isLowStock = item.currentStock <= item.minStockLevel;
                            const isOutOfStock = item.currentStock <= 0;
                            return (
                                <TableRow key={item.id} className={isOutOfStock ? 'bg-red-50' : ''}>
                                    <TableCell className="font-bold">{item.name}</TableCell>
                                    <TableCell>
                                        <div className="flex items-baseline gap-1">
                                            <span className="font-mono font-bold text-lg">{item.currentStock}</span>
                                            <span className="text-xs text-muted-foreground">{item.unit}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {item.costPerUnit.toLocaleString()} د.ع
                                    </TableCell>
                                    <TableCell>
                                        {isOutOfStock ? (
                                            <Badge variant="destructive" className="items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> نفذت
                                            </Badge>
                                        ) : isLowStock ? (
                                            <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200">
                                                منخفض
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">
                                                متوفر
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-left">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                                                <Edit2 className="w-4 h-4 text-blue-600" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                                                <Trash2 className="w-4 h-4 text-red-600" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
