'use client';

import { Branch, Category, MenuItem, RecipeItem, RawMaterial, ModifierGroup, ModifierOption } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { deleteMenuItem } from '@/lib/actions/menu';
import { getItemModifiers } from '@/lib/actions/modifiers';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MenuItemForm } from './menu-item-form';
import { ModifierGroupManager } from './modifier-group-manager';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type GroupWithOptions = ModifierGroup & { options: ModifierOption[]; sortOrder?: number };

interface MenuItemActionsProps {
    item: MenuItem & { recipe: (RecipeItem & { material: RawMaterial })[] };
    categories: Category[];
    branches?: Branch[];
    defaultBranchId?: string | null;
    tenantId?: string;
    allModifierGroups?: GroupWithOptions[];
}

export function MenuItemActions({ item, categories, branches, defaultBranchId, allModifierGroups }: MenuItemActionsProps) {
    const [open, setOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [allGroups] = useState<GroupWithOptions[]>(allModifierGroups ?? []);
    const [attachedGroups, setAttachedGroups] = useState<GroupWithOptions[]>([]);
    const [isLoadingModifiers, setIsLoadingModifiers] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (!open) return;
        setIsLoadingModifiers(true);
        getItemModifiers(item.id).then((attached) => {
            setAttachedGroups(attached as GroupWithOptions[]);
        }).finally(() => {
            setIsLoadingModifiers(false);
        });
    }, [open, item.id]);

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
                        <Tabs defaultValue="details">
                            <TabsList className="w-full mb-4">
                                <TabsTrigger value="details" className="flex-1">التفاصيل</TabsTrigger>
                                <TabsTrigger value="modifiers" className="flex-1">الخيارات والإضافات</TabsTrigger>
                            </TabsList>
                            <TabsContent value="details">
                                <MenuItemForm initialData={item} categories={categories} onSuccess={() => setOpen(false)} branches={branches} defaultBranchId={defaultBranchId} />
                            </TabsContent>
                            <TabsContent value="modifiers">
                                <ModifierGroupManager
                                    menuItemId={item.id}
                                    allGroups={allGroups}
                                    attachedGroups={attachedGroups}
                                    isLoading={isLoadingModifiers}
                                />
                            </TabsContent>
                        </Tabs>
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
