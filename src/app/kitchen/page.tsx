import { getKitchenOrders } from '@/lib/actions/kitchen';
import { KitchenBoard } from '@/components/kitchen/kitchen-board';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function KitchenPage() {
    const orders = await getKitchenOrders();

    return (
        <div className="h-full flex flex-col gap-4">
            <div className="flex justify-between items-center bg-card p-4 rounded border shadow-sm">
                <h1 className="text-3xl font-black uppercase tracking-widest text-primary">نظام عرض المطبخ</h1>
                <div className="flex items-center gap-4">
                    <span className="text-sm font-mono text-muted-foreground animate-pulse">
                        مزامنة حية نشطة
                    </span>
                </div>
            </div>

            <div className="flex-1">
                <KitchenBoard orders={orders} />
            </div>
        </div>
    );
}
