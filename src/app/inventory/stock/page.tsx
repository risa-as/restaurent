import { StockList } from '@/components/inventory/stock-list';
import { getRawMaterials } from '@/lib/actions/inventory';

export default async function StockPage() {
    const materials = await getRawMaterials();

    return (
        <div className="h-full flex flex-col space-y-6">
            <StockList materials={materials} />
        </div>
    );
}
