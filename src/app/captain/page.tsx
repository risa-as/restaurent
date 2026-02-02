import { getCaptainMenu, getTables } from '@/lib/actions/captain';
import { CaptainOrderForm } from '@/components/captain/captain-order-form';

export const dynamic = 'force-dynamic';

export default async function CaptainPage() {
    const categories = await getCaptainMenu();
    const tables = await getTables();

    return (
        <div className="h-full">
            <h1 className="text-3xl font-bold mb-6 text-primary sr-only">نظام الكابتن</h1>
            <CaptainOrderForm categories={categories} tables={tables} />
        </div>
    );
}
