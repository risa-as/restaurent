'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { addRecipeItem, removeRecipeItem } from '@/lib/actions/inventory';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, ChefHat, Info } from 'lucide-react';
import { MenuItem, RecipeItem, RawMaterial, Category } from '@prisma/client';
import { Badge } from '@/components/ui/badge';

type MenuItemWithRecipe = MenuItem & {
    recipe: (RecipeItem & { material: RawMaterial })[];
    category: Category;
};

interface RecipeManagerProps {
    menuItems: MenuItemWithRecipe[];
    rawMaterials: RawMaterial[];
}

export function RecipeManager({ menuItems, rawMaterials }: RecipeManagerProps) {
    const [selectedItemId, setSelectedItemId] = useState<string>('');
    const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
    const [quantity, setQuantity] = useState<number>(0);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const selectedItem = menuItems.find(i => i.id === selectedItemId);

    const handleAdd = () => {
        if (!selectedItemId || !selectedMaterialId || quantity <= 0) return;

        startTransition(async () => {
            const res = await addRecipeItem(selectedItemId, selectedMaterialId, quantity);
            if (res.success) {
                toast({ title: 'تمت إضافة المادة للوصفة' });
                setSelectedMaterialId('');
                setQuantity(0);
            } else {
                toast({ title: 'فشل الإضافة', variant: 'destructive' });
            }
        });
    };

    const handleRemove = (id: string) => {
        startTransition(async () => {
            const res = await removeRecipeItem(id);
            if (res.success) {
                toast({ title: 'تمت الإزالة من الوصفة' });
            } else {
                toast({ title: 'فشل الإزالة', variant: 'destructive' });
            }
        });
    };

    // Calculate total cost
    const totalCost = selectedItem?.recipe.reduce((acc, curr) => acc + (curr.quantity * curr.material.costPerUnit), 0) || 0;
    const profitMargin = selectedItem ? selectedItem.price - totalCost : 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Left Col: Menu Item Selection */}
            <Card className="lg:col-span-1 h-fit">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <ChefHat className="w-5 h-5" />
                        اختيار الصنف
                    </CardTitle>
                    <CardDescription>اختر وجبة لتعديل وصفتها</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Select onValueChange={setSelectedItemId} value={selectedItemId}>
                        <SelectTrigger className="h-12 text-lg">
                            <SelectValue placeholder="بحث عن وجبة..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[300px]" dir="rtl">
                            {menuItems.map(item => (
                                <SelectItem key={item.id} value={item.id}>
                                    {item.name}
                                    <span className="text-muted-foreground mr-2 text-xs">({item.category.name})</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {selectedItem && (
                        <div className="bg-slate-50 p-4 rounded-lg border space-y-2 mt-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">سعر البيع:</span>
                                <span className="font-bold">{selectedItem.price.toLocaleString()} د.ع</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">تكلفة المكونات:</span>
                                <span className="font-bold text-red-600">{totalCost.toLocaleString()} د.ع</span>
                            </div>
                            <div className="border-t pt-2 mt-2 flex justify-between text-sm">
                                <span className="text-muted-foreground">هامش الربح:</span>
                                <span className={`font-bold ${profitMargin > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {profitMargin.toLocaleString()} د.ع
                                </span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Right Col: Recipe Editor */}
            <Card className="lg:col-span-2 flex flex-col h-full">
                <CardHeader>
                    <CardTitle>مكونات الوصفة: {selectedItem?.name || '---'}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-4">
                    {/* Add Form */}
                    <div className="flex gap-2 items-end bg-gray-50 p-3 rounded-lg border">
                        <div className="flex-1 space-y-1">
                            <label className="text-xs font-semibold">المادة الخام</label>
                            <Select
                                value={selectedMaterialId}
                                onValueChange={setSelectedMaterialId}
                                disabled={!selectedItem}
                            >
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="اختر مادة..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-[300px]" dir="rtl">
                                    {rawMaterials.map(mat => (
                                        <SelectItem key={mat.id} value={mat.id}>
                                            {mat.name} ({mat.unit}) - {mat.costPerUnit} د.ع
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-24 space-y-1">
                            <label className="text-xs font-semibold">الكمية</label>
                            <Input
                                type="number"
                                className="bg-white"
                                placeholder="0"
                                min="0"
                                step="0.1"
                                value={quantity || ''}
                                onChange={e => setQuantity(parseFloat(e.target.value))}
                                disabled={!selectedItem}
                            />
                        </div>
                        <Button onClick={handleAdd} disabled={!selectedItem || isPending || !selectedMaterialId} className="mb-[1px]">
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Table */}
                    <div className="border rounded-md flex-1 overflow-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right w-[40%]">المادة</TableHead>
                                    <TableHead className="text-right">الكمية</TableHead>
                                    <TableHead className="text-right">التكلفة</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!selectedItem ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                                            يرجى اختيار وجبة من القائمة لعرض وتعديل وصفتها
                                        </TableCell>
                                    </TableRow>
                                ) : selectedItem.recipe.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2">
                                                <Info className="w-8 h-8 opacity-50" />
                                                لم تتم إضافة أي مكونات لهذه الوصفة بعد
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    selectedItem.recipe.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.material.name}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="font-mono">
                                                    {item.quantity} {item.material.unit}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {(item.quantity * item.material.costPerUnit).toFixed(0)} د.ع
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleRemove(item.id)}
                                                    disabled={isPending}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
