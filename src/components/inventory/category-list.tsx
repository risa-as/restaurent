'use client';

import { Category } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, UtensilsCrossed } from 'lucide-react';
import { AddCategoryDialog } from '@/components/menu/add-category-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CategoryForm } from '@/components/menu/category-form';
import { useState, useTransition } from 'react';
import { deleteCategory } from '@/lib/actions/menu';
import { useToast } from '@/hooks/use-toast';

interface CategoryListProps {
    categories: Category[];
}

export function CategoryList({ categories }: CategoryListProps) {
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const handleDelete = (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا القسم؟ قد يؤثر ذلك على عناصر القائمة المرتبطة به.')) return;

        startTransition(async () => {
            const res = await deleteCategory(id);
            if (res.success) {
                toast({ title: 'تم حذف القسم بنجاح' });
            } else {
                toast({
                    title: 'فشل حذف القسم',
                    description: res.error,
                    variant: 'destructive'
                });
            }
        });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <UtensilsCrossed className="w-6 h-6 text-primary" />
                        أقسام الطعام (القائمة)
                    </CardTitle>
                    <AddCategoryDialog />
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categories.map((category) => (
                            <div key={category.id} className="p-4 border rounded-lg flex items-center justify-between bg-card text-card-foreground shadow-sm">
                                <div>
                                    <h3 className="font-bold text-lg">{category.name}</h3>
                                </div>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="icon" onClick={() => setEditingCategory(category)}>
                                        <Edit2 className="w-4 h-4 text-blue-600" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(category.id)} disabled={isPending}>
                                        <Trash2 className="w-4 h-4 text-red-600" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        {categories.length === 0 && (
                            <p className="text-muted-foreground col-span-full text-center py-8">
                                لا توجد أقسام حالياً.
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>تعديل القسم</DialogTitle>
                    </DialogHeader>
                    {editingCategory && (
                        <CategoryForm
                            initialData={editingCategory}
                            onSuccess={() => setEditingCategory(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
