'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { MenuItemForm } from '@/components/menu/menu-item-form';
import { Plus } from 'lucide-react';
import { Category } from '@prisma/client';

interface AddItemSheetProps {
    categories: Category[];
}

export function AddItemSheet({ categories }: AddItemSheetProps) {
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> إضافة عنصر
                </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-xl overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>إضافة عنصر جديد</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                    <MenuItemForm categories={categories} onSuccess={() => setOpen(false)} />
                </div>
            </SheetContent>
        </Sheet>
    );
}
