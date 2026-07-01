import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DeliveryPageClient } from '@/components/delivery/delivery-page-client';

export const metadata = {
    title: 'التوصيل',
};

export const dynamic = 'force-dynamic';

export default async function DeliveryPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const tenantId = (session.user as any).tenantId ?? '';

  return <DeliveryPageClient tenantId={tenantId} />;
}
