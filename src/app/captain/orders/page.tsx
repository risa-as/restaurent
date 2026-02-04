import { getCaptainActiveOrders } from '@/lib/actions/captain';


export const dynamic = 'force-dynamic';

import { AutoRefresh } from '@/components/ui/auto-refresh';

export default async function CaptainOrdersPage() {
    const orders = await getCaptainActiveOrders();

    const statusConfig: Record<string, { label: string, color: string }> = {
        PENDING: { label: 'انتظار', color: 'bg-blue-100 text-blue-800 border-blue-200' },
        PREPARING: { label: 'تحضير', color: 'bg-orange-100 text-orange-800 border-orange-200' },
        READY: { label: 'جاهز', color: 'bg-green-100 text-green-800 border-green-200' },
    };

    return (
        <div className="h-full overflow-y-auto max-w-5xl mx-auto">
            <AutoRefresh intervalMs={10000} />
            <h1 className="text-2xl font-bold mb-6">متابعة طلبات المطبخ</h1>

            <div className="grid gap-4">
                {orders.length === 0 ? (
                    <div className="text-center text-muted-foreground py-10">
                        لا توجد طلبات نشطة حالياً
                    </div>
                ) : (
                    orders.map(order => {
                        const config = statusConfig[order.status] || statusConfig.PENDING;

                        return (
                            <OrderCard key={order.id} order={order} config={config} status={order.status} />
                        );
                    })
                )}
            </div>
        </div>
    );
}

// Separate component for client-side logic
import { ClientOrderCard } from './client-order-card';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function OrderCard({ order, config, status }: { order: any, config: any, status: string }) {
    return <ClientOrderCard order={order} config={config} status={status} />;
}
