import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CashierPageClient } from '@/components/cashier/cashier-page-client';

export const metadata = {
    title: 'الكاشير',
};

export const dynamic = 'force-dynamic';

export default async function CashierPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const tenantId = (session.user as any).tenantId ?? '';
  const cashierName = (session.user as any).name ?? '';

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <CashierPageClient tenantId={tenantId} cashierName={cashierName} />
    </div>
  );
}
