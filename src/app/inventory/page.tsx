import { InventoryDashboard } from '@/components/inventory/inventory-dashboard';
import { prisma } from '@/lib/prisma';

export default async function InventoryPage() {
    const totalItems = await prisma.rawMaterial.count();
    // Doing simpler query:
    const allMaterials = await prisma.rawMaterial.findMany();

    // Calculate stats in memory for now to avoid advanced Prisma queries without testing
    const lowStock = allMaterials.filter(m => m.currentStock <= m.minStockLevel && m.currentStock > 0).length;
    const outOfStock = allMaterials.filter(m => m.currentStock <= 0).length;
    const totalValue = allMaterials.reduce((acc, curr) => acc + (curr.currentStock * curr.costPerUnit), 0);

    const stats = {
        totalItems,
        lowStockItems: lowStock,
        outOfStockItems: outOfStock,
        totalValue
    };

    return <InventoryDashboard stats={stats} />;
}
