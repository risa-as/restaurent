import { getStationOrders, getStations } from '@/lib/actions/kitchen-stations';
import { StationBoard } from '@/components/kitchen/station-board';
import { notFound } from 'next/navigation';

export const metadata = {
    title: 'محطة المطبخ',
};

export const dynamic = 'force-dynamic';

interface Props {
    params: Promise<{ stationId: string }>;
}

export default async function StationPage({ params }: Props) {
    const { stationId } = await params;
    const [stations, orders] = await Promise.all([
        getStations(),
        getStationOrders(stationId),
    ]);

    const station = stations.find(s => s.id === stationId);
    if (!station) notFound();

    return (
        <StationBoard
            station={{ id: station.id, name: station.nameAr || station.name, colour: station.colour }}
            orders={orders}
        />
    );
}
