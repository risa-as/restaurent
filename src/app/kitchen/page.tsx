import { getKitchenOrders } from '@/lib/actions/kitchen';
import { KitchenBoard } from '@/components/kitchen/kitchen-board';
import { RefreshButton } from '@/components/common/refresh-button';

export const dynamic = 'force-dynamic';

export default async function KitchenPage() {
    const orders = await getKitchenOrders();

    return (
        <div className="h-full flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-800">الطلبات النشطة</h2>
                    <p className="text-muted-foreground">مراقبة وتحضير الطلبات الواردة للمطبخ</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full border border-green-100 animate-pulse">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        <span className="text-xs font-medium">اتصال مباشر</span>
                    </div>
                    <RefreshButton />
                </div>
            </div>

            <div className="flex-1 overflow-hidden bg-card rounded-xl border shadow-sm p-1">
                <KitchenBoard orders={orders} />
            </div>
        </div>
    );
}
