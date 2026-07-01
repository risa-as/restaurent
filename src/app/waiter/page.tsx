import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { WaiterPageClient } from '@/components/waiter/waiter-page-client';

export const metadata = {
    title: 'النادل',
};

export const dynamic = 'force-dynamic';

export default async function WaiterPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const tenantId = (session.user as any).tenantId ?? '';

  return <WaiterPageClient tenantId={tenantId} />;
}
