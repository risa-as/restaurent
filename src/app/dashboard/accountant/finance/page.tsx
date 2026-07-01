import { FinanceDashboard } from '@/components/finance/finance-dashboard';
import { getSelectedBranchId } from '@/lib/actions/branches';

export const metadata = {
    title: 'الإدارة المالية',
};

export const dynamic = 'force-dynamic';

export default async function AccountantFinancePage() {
    const selectedBranchId = await getSelectedBranchId();
    return <FinanceDashboard selectedBranchId={selectedBranchId} />;
}
