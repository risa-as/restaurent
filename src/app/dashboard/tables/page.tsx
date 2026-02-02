import { getTables } from '@/lib/actions/tables';
import { TableMap } from '@/components/tables/table-map';

export default async function TablesPage() {
    const tables = await getTables();

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">إدارة الطاولات</h1>
            <TableMap initialTables={tables} />
        </div>
    );
}
