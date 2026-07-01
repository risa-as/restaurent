import { getUnsettledCashierBills, getSettledCashierBills } from '@/lib/actions/accountant';
import { getShiftHistory } from '@/lib/actions/shifts';
import { SettlementTable } from '@/components/accountant/settlement-table';
import { SettledBillsTable } from '@/components/accountant/settled-bills-table';
import { ShiftHistoryTable } from '@/components/cashier/shift-history-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardCheck, History, CheckCircle2 } from 'lucide-react';

export const metadata = {
    title: 'تسوية الكاشير',
};

export const dynamic = 'force-dynamic';

export default async function CashierSettlementPage() {
    const [bills, settled, shifts] = await Promise.all([
        getUnsettledCashierBills(),
        getSettledCashierBills(),
        getShiftHistory(
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            new Date(),
        ),
    ]);

    return (
        <div className="space-y-4" dir="rtl">
            <div>
                <h1 className="text-xl font-bold">تصفيات الكاشير</h1>
                <p className="text-sm text-muted-foreground mt-0.5">إدارة الورديات والفواتير النقدية</p>
            </div>

            <Tabs defaultValue="settlement">
                <TabsList className="mb-4">
                    <TabsTrigger value="settlement" className="gap-2">
                        <ClipboardCheck className="h-3.5 w-3.5" />
                        تصفيات معلقة
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
                    <TabsTrigger value="shifts" className="gap-2">
                        <History className="h-3.5 w-3.5" />
                        الورديات
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="settlement">
                    <SettlementTable
                        bills={bills}
                        title="تصفيات الكاشير (في الذمة)"
                        emptyMessage="لا توجد مبالغ معلقة لدى الكاشير."
                    />
                </TabsContent>

                <TabsContent value="settled">
                    <SettledBillsTable
                        bills={settled as any}
                        emptyMessage="لا توجد تصفيات مسجلة خلال آخر 30 يوم"
                    />
                </TabsContent>

                <TabsContent value="shifts">
                    <ShiftHistoryTable shifts={shifts} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
