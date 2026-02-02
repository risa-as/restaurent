'use client';

import { MenuItem, Category, RecipeItem, RawMaterial } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { deleteMenuItem } from '@/lib/actions/menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { MenuItemForm } from './menu-item-form';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface MenuItemActionsProps {
    item: MenuItem & { recipe: (RecipeItem & { material: RawMaterial })[] };
    categories: Category[];
}

export function MenuItemActions({ item, categories }: MenuItemActionsProps) {
    const [open, setOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const { toast } = useToast();

    return (
        <div className="flex items-center gap-2 justify-end">
            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                    </Button>
                </SheetTrigger>
                <SheetContent className="sm:max-w-xl overflow-y-auto">
                    <SheetHeader>
                        <SheetTitle>تحديث العنصر</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4">
                        <MenuItemForm initialData={item} categories={categories} onSuccess={() => setOpen(false)} />
                    </div>
                </SheetContent>
            </Sheet>

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-red-500">
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>حذف العنصر</DialogTitle>
                        <DialogDescription>
                            هل أنت متأكد من حذف <strong>{item.name}</strong>؟ لا يمكن التراجع عن هذا الإجراء.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteOpen(false)}>إلغاء</Button>
                        <Button variant="destructive" onClick={async () => {
                            const res = await deleteMenuItem(item.id);
                            if (res.success) {
                                toast({
                                    title: "تم حذف العنصر بنجاح",
                                });
                            } else {
                                toast({
                                    variant: "destructive",
                                    title: "فشل حذف العنصر",
                                });
                            }
                            setDeleteOpen(false);
                        }}>حذف</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
