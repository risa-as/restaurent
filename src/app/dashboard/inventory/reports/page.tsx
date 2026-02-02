import { getInventoryStats, getLowStockItems, getMostUsedItems } from '@/lib/actions/reports';
import { MetricCard } from '@/components/reports/metric-card';
import { ConsumptionChart } from '@/components/reports/consumption-chart';
import { LowStockList } from '@/components/reports/low-stock-list';
import { DollarSign, AlertTriangle, Package } from 'lucide-react';

export default async function ReportsPage() {
    const stats = await getInventoryStats();
    const lowStockItems = await getLowStockItems();
    const mostUsed = await getMostUsedItems();

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Inventory Reports</h1>

            <div className="grid gap-4 md:grid-cols-3">
                <MetricCard
                    title="Total Inventory Value"
                    value={`${stats.totalInventoryValue.toFixed(0)} د.ع`}
                    icon={DollarSign}
                    description="Based on current stock cost"
                />
                <MetricCard
                    title="Low Stock Items"
                    value={stats.lowStockCount}
                    icon={AlertTriangle}
                    description="Items below minimum level"
                />
                <MetricCard
                    title="Total SKUs"
                    value={stats.totalItems}
                    icon={Package}
                    description="Active materials"
                />
            </div>

            <div className="grid gap-4 md:grid-cols-7">
                <ConsumptionChart data={mostUsed} />
                <LowStockList items={lowStockItems} />
            </div>
        </div>
    );
}
