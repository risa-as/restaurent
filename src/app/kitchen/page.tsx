import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { KitchenPageClient } from '@/components/kitchen/kitchen-page-client';

export const metadata = {
    title: 'المطبخ',
};

export const dynamic = 'force-dynamic';

export default async function KitchenPage({
  searchParams,
}: {
  searchParams: { station?: string };
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const tenantId = (session.user as any).tenantId ?? '';

  return (
    <KitchenPageClient
      tenantId={tenantId}
      stationParam={searchParams?.station}
    />
  );
}
