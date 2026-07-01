import { getPendingPayments } from '@/lib/actions/superadmin';
import PaymentApprovalCard from '@/components/superadmin/payment-approval-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, Clock, CheckCircle2, XCircle } from 'lucide-react';

export const metadata = {
    title: 'المدفوعات',
};

export const dynamic = 'force-dynamic';

export default async function SuperAdminPaymentsPage() {
    const allPayments = await getPendingPayments();

    const pending = allPayments.filter(p => p.status === 'PENDING');
    const approved = allPayments.filter(p => p.status === 'APPROVED');
    const rejected = allPayments.filter(p => p.status === 'REJECTED');

    const toCardData = (p: (typeof allPayments)[0]) => ({
        id: p.id,
        tenantName: p.tenant.name,
        tenantSlug: p.tenant.slug,
        amount: p.amount,
        method: p.method,
        plan: p.plan,
        months: p.months,
        receiptUrl: p.receiptUrl,
        receiptNote: p.receiptNote,
        createdAt: p.createdAt,
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <CreditCard className="w-7 h-7" />
                    إدارة المدفوعات
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">مراجعة وقبول أو رفض طلبات الدفع</p>
            </div>

            <Tabs defaultValue="pending" dir="rtl">
                <TabsList className="grid w-full grid-cols-3 max-w-md">
                    <TabsTrigger value="pending" className="gap-2">
                        <Clock className="w-4 h-4" />
                        قيد الانتظار
                        {pending.length > 0 && (
                            <span className="bg-yellow-500 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">
                                {pending.length}
                            </span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="approved" className="gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        مقبولة
                    </TabsTrigger>
                    <TabsTrigger value="rejected" className="gap-2">
                        <XCircle className="w-4 h-4" />
                        مرفوضة
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="mt-6">
                    {pending.length === 0 ? (
                        <div className="text-center text-muted-foreground py-16 bg-card rounded-xl border">
                            <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="text-lg">لا توجد مدفوعات معلقة</p>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {pending.map(p => (
                                <PaymentApprovalCard key={p.id} payment={toCardData(p)} />
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="approved" className="mt-6">
                    {approved.length === 0 ? (
                        <div className="text-center text-muted-foreground py-16 bg-card rounded-xl border">
                            <p className="text-lg">لا توجد مدفوعات مقبولة</p>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {approved.map(p => (
                                <div key={p.id} className="bg-card border border-green-200 rounded-xl p-4 text-sm space-y-2">
                                    <div className="flex justify-between">
                                        <span className="font-bold">{p.tenant.name}</span>
                                        <span className="text-green-600 font-semibold">{p.amount.toLocaleString('ar-IQ')} د.ع</span>
                                    </div>
                                    <p className="text-muted-foreground">{p.plan} × {p.months} شهر</p>
                                    <p className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString('ar-SA')}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="rejected" className="mt-6">
                    {rejected.length === 0 ? (
                        <div className="text-center text-muted-foreground py-16 bg-card rounded-xl border">
                            <p className="text-lg">لا توجد مدفوعات مرفوضة</p>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {rejected.map(p => (
                                <div key={p.id} className="bg-card border border-red-200 rounded-xl p-4 text-sm space-y-2">
                                    <div className="flex justify-between">
                                        <span className="font-bold">{p.tenant.name}</span>
                                        <span className="text-red-600 font-semibold">{p.amount.toLocaleString('ar-IQ')} د.ع</span>
                                    </div>
                                    {p.adminNote && <p className="text-xs text-muted-foreground">السبب: {p.adminNote}</p>}
                                    <p className="text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString('ar-SA')}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    );
}
