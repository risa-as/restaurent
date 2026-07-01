'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ShiftCloseModal } from '@/components/cashier/shift-close-modal';
import { LogOut } from 'lucide-react';

interface Shift {
    id: string;
    openingCash: number;
    totalCash: number;
    totalCard: number;
    totalSales: number;
}

export function ShiftCloseButton({ shift }: { shift: Shift }) {
    const [open, setOpen] = useState(false);

    return (
        <>
            <Button
                variant="outline"
                size="sm"
                className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5"
                onClick={() => setOpen(true)}
            >
                <LogOut className="w-4 h-4" />
                إغلاق الوردية
            </Button>

            <ShiftCloseModal
                open={open}
                onOpenChange={setOpen}
                shiftId={shift.id}
                openingCash={shift.openingCash}
                totalCash={shift.totalCash}
                totalCard={shift.totalCard}
                totalSales={shift.totalSales}
            />
        </>
    );
}
