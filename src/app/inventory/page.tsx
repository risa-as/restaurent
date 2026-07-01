import { getRawMaterials } from '@/lib/actions/inventory';
import { getExpiringBatches } from '@/lib/actions/purchase-orders';
import { InventoryDashboard } from '@/components/inventory/inventory-dashboard';
import { BatchExpiryList } from '@/components/inventory/batch-expiry-list';

export const metadata = {
    title: 'المخزون',
};

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
    const [materials, expiringBatches] = await Promise.all([
        getRawMaterials(),
        getExpiringBatches(7),
    ]);

    const stats = {
        totalItems: materials.length,
        lowStockItems: materials.filter(m => m.currentStock <= m.minStockLevel && m.currentStock > 0).length,
        outOfStockItems: materials.filter(m => m.currentStock <= 0).length,
        totalValue: materials.reduce((acc, m) => acc + (m.currentStock * m.costPerUnit), 0),
    };

    return (
        <div className="space-y-4 p-4">
            {expiringBatches.length > 0 && <BatchExpiryList batches={expiringBatches} />}
            <InventoryDashboard stats={stats} />
        </div>
    );
}
