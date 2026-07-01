'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Plus } from 'lucide-react';
import { OfferForm } from './offer-form';
import { Branch, MenuItem } from '@prisma/client';

interface CategoryOption {
    id: string;
    name: string;
}

interface AddOfferSheetProps {
    menuItems: MenuItem[];
    categories?: CategoryOption[];
    branches?: Branch[];
    defaultBranchId?: string | null;
}

export function AddOfferSheet({ menuItems, categories = [], branches, defaultBranchId }: AddOfferSheetProps) {
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button>
                    <Plus className="ms-2 h-4 w-4" /> إضافة عرض
                </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-md overflow-y-auto" dir="rtl">
                <SheetHeader>
                    <SheetTitle>عرض جديد</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                    <OfferForm
                        menuItems={menuItems}
                        categories={categories}
                        onSuccess={() => setOpen(false)}
                        branches={branches}
                        defaultBranchId={defaultBranchId}
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}
