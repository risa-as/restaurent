'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { MenuItemForm } from './menu-item-form';
import { Category } from '@prisma/client';

interface AddMenuItemDialogProps {
    categories: Category[];
}

export function AddMenuItemDialog({ categories }: AddMenuItemDialogProps) {
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button className="gap-2">
                    <Plus className="w-4 h-4" />
                    إضافة صنف جديد
                </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-xl overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>إضافة صنف جديد</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                    <MenuItemForm
                        categories={categories}
                        onSuccess={() => setOpen(false)}
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}
