import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CaptainOrdersClient } from './captain-orders-client';

export const metadata = {
    title: 'الطلبات',
};

export const dynamic = 'force-dynamic';

export default async function CaptainOrdersPage() {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const tenantId = (session.user as any).tenantId ?? '';

    return <CaptainOrdersClient tenantId={tenantId} />;
}
