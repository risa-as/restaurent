'use client';

import { Reservation, Table } from '@prisma/client';
import {
    Table as UITable,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cancelReservation, checkInReservation } from '@/lib/actions/reservations';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import { Ban, CheckCircle, Pencil } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ReservationForm } from './reservation-form';

interface ReservationListProps {
    reservations: (Reservation & { table: Table | null })[];
    tables: Table[];
}

export function ReservationList({ reservations, tables }: ReservationListProps) {

    return (
        <div className="border rounded-md">
            <UITable>
                <TableHeader>
                    <TableRow>
                        <TableHead className="text-right">الوقت</TableHead>
                        <TableHead className="text-right">الضيف</TableHead>
                        <TableHead className="text-right">عدد الضيوف</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right">الطاولة</TableHead>
                        <TableHead className="text-left">إجراءات</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reservations.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                لا توجد حجوزات لهذا اليوم.
                            </TableCell>
                        </TableRow>
                    ) : (
                        reservations.map(res => (
                            <TableRow key={res.id}>
                                <TableCell>{format(res.reservationTime, 'p', { locale: ar })}</TableCell>
                                <TableCell>
                                    <div className="font-medium">{res.customerName}</div>
                                    <div className="text-xs text-muted-foreground">{res.customerPhone}</div>
                                </TableCell>
                                <TableCell>{res.guests}</TableCell>
                                <TableCell>
                                    <Badge variant={
                                        res.status === 'CONFIRMED' ? 'default' :
                                            res.status === 'COMPLETED' ? 'secondary' : 'destructive'
                                    }>
                                        {res.status === 'CONFIRMED' ? 'مؤكد' :
                                            res.status === 'COMPLETED' ? 'مكتمل' : 'ملغي'}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {res.table ? `طاولة ${res.table.number}` : '-'}
                                </TableCell>
                                <TableCell className="text-left gap-2 flex justify-end">
                                    {res.status === 'CONFIRMED' && (
                                        <>
                                            <CheckInDialog reservation={res} tables={tables} />
                                            <EditReservationSheet reservation={res as any} tables={tables} />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-red-500"
                                                onClick={async () => await cancelReservation(res.id)}
                                            >
                                                <Ban className="h-4 w-4" />
                                            </Button>
                                        </>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </UITable>
        </div>
    );
}

function CheckInDialog({ reservation, tables }: { reservation: Reservation, tables: Table[] }) {
    const [open, setOpen] = useState(false);
    const [selectedTable, setSelectedTable] = useState<string>('');

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                    <CheckCircle className="ml-2 h-4 w-4" /> تسجيل دخول
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>تسكين: {reservation.customerName}</DialogTitle>
                    <DialogDescription>
                        تعيين طاولة لـ {reservation.guests} ضيوف.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Select onValueChange={setSelectedTable}>
                        <SelectTrigger dir="rtl">
                            <SelectValue placeholder="اختر طاولة" />
                        </SelectTrigger>
                        <SelectContent>
                            {tables.length === 0 ? (
                                <div className="p-2 text-center text-sm text-muted-foreground">لا توجد طاولات</div>
                            ) : (
                                tables.map(t => {
                                    const isAvailable = t.status === 'AVAILABLE';
                                    return (
                                        <SelectItem key={t.id} value={t.id} disabled={!isAvailable}>
                                            <div className="flex items-center justify-between w-full min-w-[120px]">
                                                <span>طاولة {t.number} ({t.capacity} شخص)</span>
                                                <span className="text-xs text-muted-foreground ml-2">
                                                    {t.status === 'AVAILABLE' ? '(متاح)' :
                                                        t.status === 'OCCUPIED' ? '(مشغول)' :
                                                            t.status === 'RESERVED' ? '(محجوز)' : '(تنظيف)'}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    );
                                })
                            )}
                        </SelectContent>
                    </Select>
                </div>
                <DialogFooter>
                    <Button onClick={async () => {
                        if (selectedTable) {
                            await checkInReservation(reservation.id, selectedTable);
                            setOpen(false);
                            // Also refresh to show updated status
                            window.location.reload();
                        }
                    }}>
                        تأكيد التسكين
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}



function EditReservationSheet({ reservation, tables }: { reservation: Reservation, tables: Table[] }) {
    const [open, setOpen] = useState(false);

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Pencil className="h-4 w-4" />
                </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-md overflow-y-auto">
                <SheetHeader>
                    <SheetTitle>تعديل الحجز</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                    <ReservationForm
                        onSuccess={() => setOpen(false)}
                        tables={tables}
                        initialData={{
                            ...reservation,
                            reservationTime: new Date(reservation.reservationTime),
                            notes: reservation.notes || '',
                            tableId: reservation.tableId || '',
                        }}
                    />
                </div>
            </SheetContent>
        </Sheet>
    );
}
