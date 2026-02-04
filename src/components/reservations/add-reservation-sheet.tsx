'use client';

import { Table } from '@prisma/client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Plus } from 'lucide-react';
import { ReservationForm } from './reservation-form';


interface AddReservationSheetProps {
    tables: Table[];
}

export function AddReservationSheet({ tables }: AddReservationSheetProps) {
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button>
                    <Plus className="ml-2 h-4 w-4" /> حجز جديد
                </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-md overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>حجز جديد</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                    <ReservationForm onSuccess={() => setOpen(false)} tables={tables} />
                </div>
            </SheetContent>
        </Sheet>
    );
}
