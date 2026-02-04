
import { getCashierOrders, getCashierHistory } from '@/lib/actions/cashier';
import { getPOSData } from '@/lib/actions/pos';
import { CashierView } from '@/components/cashier/cashier-view';

export const dynamic = 'force-dynamic';

export default async function CashierPage() {
    const orders = await getCashierOrders();
    const history = await getCashierHistory();
    const { categories, menuItems, tables } = await getPOSData();

    return (
        <div className="h-full">
            <h1 className="text-2xl font-bold mb-4 hidden print:block">نظام الكاشير</h1>
            <CashierView
                initialOrders={orders}
                historyOrders={history}
                categories={categories}
                menuItems={menuItems}
                tables={tables}
            />
        </div>
    );
}
