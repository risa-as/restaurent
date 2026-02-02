import { getActiveOrders } from '@/lib/actions/orders';
import { OrderBoard } from '@/components/orders/order-board';
import { RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { revalidatePath } from 'next/cache';

export default async function OrdersPage() {
    const orders = await getActiveOrders();

    return (
        <div className="space-y-4 h-full">
            {/* Full height container */}
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">المطبخ ومتابعة الطلبات</h1>
            </div>

            <OrderBoard orders={orders} />
        </div>
    );
}
