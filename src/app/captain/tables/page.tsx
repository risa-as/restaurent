import { getTables } from '@/lib/actions/captain';
import { auth } from '@/lib/auth';
import { CaptainTablesClient } from '@/components/captain/captain-tables-client';
import { CaptainCacheProvider } from '@/components/captain/captain-cache-provider';

export const metadata = {
    title: 'الطاولات',
};

export const dynamic = 'force-dynamic';

export default async function CaptainTablesPage() {
    const [tables, session] = await Promise.all([
        getTables(),
        auth(),
    ]);

    const tenantId = (session?.user as any)?.tenantId as string ?? '';

    return (
        <div className="h-full overflow-y-auto p-6">
            <h1 className="text-2xl font-bold mb-6">إدارة الطاولات</h1>
            <CaptainCacheProvider tables={tables} />
            <CaptainTablesClient initialTables={tables} tenantId={tenantId} />
        </div>
    );
}
