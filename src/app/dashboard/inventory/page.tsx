import { getRawMaterials } from '@/lib/actions/inventory';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { RawMaterialActions } from '@/components/inventory/raw-material-actions';
import { AddMaterialSheet } from '@/components/inventory/add-material-sheet';
import { AlertTriangle, Plus, Search } from 'lucide-react';

export default async function InventoryPage({
    searchParams,
}: {
    searchParams?: { query?: string };
}) {
    const query = searchParams?.query || '';
    const rawMaterials = await getRawMaterials(query);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">المخزون</h1>
                <AddMaterialSheet />
            </div>

            <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <form>
                        <Input
                            name="query"
                            placeholder="بحث في المواد..."
                            defaultValue={query}
                            className="pr-8"
                        />
                    </form>
                </div>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-right">الاسم</TableHead>
                            <TableHead className="text-right">الوحدة</TableHead>
                            <TableHead className="text-right">المخزون</TableHead>
                            <TableHead className="text-right">التكلفة/الوحدة</TableHead>
                            <TableHead className="text-left">الإجراءات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rawMaterials.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                    لم يتم العثور على مواد.
                                </TableCell>
                            </TableRow>
                        ) : (
                            rawMaterials.map((material) => (
                                <TableRow key={material.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            {material.name}
                                            {material.currentStock <= material.minStockLevel && (
                                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>{material.unit}</TableCell>
                                    <TableCell>{material.currentStock}</TableCell>
                                    <TableCell>{material.costPerUnit.toFixed(0)} د.ع</TableCell>
                                    <TableCell className="text-left">
                                        <RawMaterialActions material={material} />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
