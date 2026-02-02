'use client';

import { RawMaterial } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, ArrowRightLeft } from 'lucide-react';
import { deleteRawMaterial } from '@/lib/actions/inventory';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { RawMaterialForm } from './raw-material-form';
import { TransactionForm } from './transaction-form';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface RawMaterialActionsProps {
    material: RawMaterial;
}

export function RawMaterialActions({ material }: RawMaterialActionsProps) {
    const [open, setOpen] = useState(false);
    const [transactionOpen, setTransactionOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);

    return (
        <div className="flex items-center gap-2 justify-end">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Sheet open={transactionOpen} onOpenChange={setTransactionOpen}>
                            <SheetTrigger asChild>
                                <Button variant="ghost" size="icon" className="hover:text-blue-500">
                                    <ArrowRightLeft className="h-4 w-4" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent>
                                <SheetHeader>
                                    <SheetTitle>معاملة جديدة: {material.name}</SheetTitle>
                                </SheetHeader>
                                <div className="mt-4">
                                    <TransactionForm
                                        preSelectedMaterialId={material.id}
                                        onSuccess={() => setTransactionOpen(false)}
                                    />
                                </div>
                            </SheetContent>
                        </Sheet>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>معاملة جديدة</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                    </Button>
                </SheetTrigger>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>تعديل المادة</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4">
                        <RawMaterialForm initialData={material} onSuccess={() => setOpen(false)} />
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
                        <DialogTitle>حذف المادة</DialogTitle>
                        <DialogDescription>
                            هل أنت متأكد من حذف <strong>{material.name}</strong>؟ لا يمكن التراجع عن هذا الإجراء.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteOpen(false)}>إلغاء</Button>
                        <Button variant="destructive" onClick={async () => {
                            await deleteRawMaterial(material.id);
                            setDeleteOpen(false);
                        }}>حذف</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
