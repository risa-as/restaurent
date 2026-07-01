export const metadata = {
    title: 'الفوترة',
};

export const dynamic = 'force-dynamic';

import { getSuperAdminBillingDashboard } from '@/lib/actions/superadmin';
import SuperAdminBillingDashboard from '@/components/superadmin/billing-dashboard';

export default async function SuperAdminBillingPage() {
    const data = await getSuperAdminBillingDashboard();
    return <SuperAdminBillingDashboard data={data} />;
}
