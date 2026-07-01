import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { CaptainPageClient } from '@/components/captain/captain-page-client';

export const metadata = {
    title: 'الكابتن',
};

export const dynamic = 'force-dynamic';

export default async function CaptainPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  const tenantId = (session.user as any).tenantId ?? '';

  return (
    <div className="h-full">
      <h1 className="sr-only">نظام الكابتن</h1>
      <CaptainPageClient tenantId={tenantId} />
    </div>
  );
}
