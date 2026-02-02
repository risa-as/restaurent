import { getReservations } from '@/lib/actions/reservations';
import { getTables } from '@/lib/actions/tables';
import { ReservationList } from '@/components/reservations/reservation-list';
import { AddReservationSheet } from '@/components/reservations/add-reservation-sheet';
import { ar } from 'date-fns/locale';
import { format } from 'date-fns';

export default async function ReservationsPage() {
    const reservations = await getReservations();
    const tables = await getTables();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">الحجوزات</h1>
                    <p className="text-muted-foreground">{format(new Date(), 'PPPP', { locale: ar })}</p>
                </div>

                <AddReservationSheet />
            </div>

            <ReservationList reservations={reservations} tables={tables} />
        </div>
    );
}
