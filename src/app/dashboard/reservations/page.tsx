import { getReservations } from '@/lib/actions/reservations';

export const metadata = {
    title: 'الحجوزات',
};

export const dynamic = 'force-dynamic';
import { getTables } from '@/lib/actions/tables';
import { ReservationList } from '@/components/reservations/reservation-list';
import { AddReservationSheet } from '@/components/reservations/add-reservation-sheet';
import { PageHeader } from '@/components/ui/page-header';
import { ar } from 'date-fns/locale';
import { format } from 'date-fns';

export default async function ReservationsPage() {
    const [reservations, tables] = await Promise.all([getReservations(), getTables()]);

    return (
        <div className="space-y-6">
            <PageHeader
                title="الحجوزات"
                subtitle={format(new Date(), 'PPPP', { locale: ar })}
                breadcrumbs={[{ label: 'لوحة التحكم', href: '/dashboard' }, { label: 'الحجوزات' }]}
                actions={<AddReservationSheet tables={tables} />}
            />

            <ReservationList reservations={reservations} tables={tables} />
        </div>
    );
}
