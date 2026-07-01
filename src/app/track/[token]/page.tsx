import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { TrackingPage } from '@/components/delivery/tracking-page';

export const metadata = {
    title: 'تتبع الطلب',
};

export const dynamic = 'force-dynamic';

interface Props {
    params: Promise<{ token: string }>;
}

export default async function DeliveryTrackingPage({ params }: Props) {
    const { token } = await params;
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const record = await prisma.deliveryTrackingToken.findUnique({
        where: { tokenHash },
        include: {
            delivery: {
                include: {
                    order: {
                        select: { orderNumber: true, status: true }
                    },
                    driver: { select: { name: true } }
                }
            }
        }
    });

    if (!record) notFound();

    const { delivery } = record;

    return (
        <TrackingPage
            deliveryId={delivery.id}
            orderNumber={delivery.order.orderNumber}
            orderStatus={delivery.order.status}
            address={delivery.address}
            driverName={delivery.driver?.name ?? null}
            lastLat={delivery.lastLat ?? null}
            lastLng={delivery.lastLng ?? null}
            destLat={delivery.lat ?? null}
            destLng={delivery.lng ?? null}
            status={delivery.status}
        />
    );
}
