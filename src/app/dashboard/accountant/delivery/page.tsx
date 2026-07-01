import { getUnsettledDeliveryBills, getSettledDeliveryBills } from '@/lib/actions/accountant';
import { SettlementTable } from '@/components/accountant/settlement-table';
import { SettledBillsTable } from '@/components/accountant/settled-bills-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardCheck, CheckCircle2 } from 'lucide-react';

export const metadata = {
    title: 'تسوية التوصيل',
};

export const dynamic = 'force-dynamic';

export default async function DeliverySettlementPage() {
    const [bills, settled] = await Promise.all([
        getUnsettledDeliveryBills(),
        getSettledDeliveryBills(),
    ]);

    return (
        <div className="space-y-4" dir="rtl">
            <div>
                <h1 className="text-xl font-bold">تصفيات التوصيل</h1>
                <p className="text-sm text-muted-foreground mt-0.5">المبالغ النقدية في ذمة قسم التوصيل</p>
            </div>

            <Tabs defaultValue="pending">
                <TabsList className="mb-4">
                    <TabsTrigger value="pending" className="gap-2">
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        معلقة
                        {bills.length > 0 && (
                            <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                                {bills.length}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="settled" className="gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        سجل التصفيات
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pending">
                    <SettlementTable
                        bills={bills}
                        title="تصفيات التوصيل (في ذمة مدير السائقين)"
                        emptyMessage="لا توجد مبالغ معلقة لدى قسم التوصيل."
                    />
                </TabsContent>

                <TabsContent value="settled">
                    <SettledBillsTable
                        bills={settled as any}
                        emptyMessage="لا توجد تصفيات توصيل مسجلة خلال آخر 30 يوم"
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
