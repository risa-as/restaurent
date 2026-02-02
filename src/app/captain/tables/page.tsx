import { getTables } from '@/lib/actions/captain';
import { TableCard } from '@/components/captain/table-card';

export const dynamic = 'force-dynamic';

export default async function CaptainTablesPage() {
    const tables = await getTables();

    return (
        <div className="h-full overflow-y-auto">
            <h1 className="text-2xl font-bold mb-6">إدارة الطاولات</h1>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {tables.map(table => (
                    <TableCard key={table.id} table={table} />
                ))}
            </div>
        </div>
    );
}
