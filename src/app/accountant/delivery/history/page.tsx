import { getSettledDeliveryBills } from '@/lib/actions/accountant';
import { SettlementHistoryTable } from '@/components/accountant/settlement-history-table';

export default async function DeliveryHistoryPage() {
    const bills = await getSettledDeliveryBills();

    return (
        <SettlementHistoryTable
            bills={bills}
            title="سجل تصفيات التوصيل"
            emptyMessage="لا توجد سجلات تصفية سابقة."
        />
    );
}
