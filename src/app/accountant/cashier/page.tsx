import { getUnsettledCashierBills } from '@/lib/actions/accountant';
import { SettlementTable } from '@/components/accountant/settlement-table';

export default async function CashierSettlementPage() {
    const bills = await getUnsettledCashierBills();

    return (
        <SettlementTable
            bills={bills}
            title="تصفيات الكاشير (في الذمة)"
            emptyMessage="لا توجد مبالغ معلقة لدى الكاشير."
        />
    );
}
