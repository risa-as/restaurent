import { getSettledCashierBills } from '@/lib/actions/accountant';
import { SettlementHistoryTable } from '@/components/accountant/settlement-history-table';

export const metadata = {
    title: 'سجل تسويات الكاشير',
};

export default async function CashierHistoryPage() {
    const bills = await getSettledCashierBills();

    return (
        <SettlementHistoryTable
            bills={bills}
            title="سجل تصفيات الكاشير"
            emptyMessage="لا توجد سجلات تصفية سابقة."
        />
    );
}
