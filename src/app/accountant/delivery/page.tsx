import { getUnsettledDeliveryBills } from '@/lib/actions/accountant';
import { SettlementTable } from '@/components/accountant/settlement-table';

export default async function DeliverySettlementPage() {
    const bills = await getUnsettledDeliveryBills();

    return (
        <SettlementTable
            bills={bills}
            title="تصفيات التوصيل (في ذمة مدير السائقين)"
            emptyMessage="لا توجد مبالغ معلقة لدى قسم التوصيل."
        />
    );
}
