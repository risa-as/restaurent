import { getPOSData, getPendingCaptainOrders } from '@/lib/actions/pos';
import { POSInterface } from '@/components/pos/pos-interface';

export const dynamic = 'force-dynamic';

export default async function POSPage() {
    const { categories, menuItems, tables } = await getPOSData();
    const pendingOrders = await getPendingCaptainOrders();

    return (
        <div className="absolute inset-0 bg-background z-10">
            <POSInterface
                categories={categories}
                menuItems={menuItems}
                tables={tables}
                initialPendingOrders={pendingOrders}
            />
        </div>
    );
}
