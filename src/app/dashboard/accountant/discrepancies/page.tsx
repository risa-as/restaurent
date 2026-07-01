import { getShiftDiscrepancies } from '@/lib/actions/reports';
import { DiscrepancyReport } from '@/components/finance/discrepancy-report';
import { PlanUpgradePrompt } from '@/components/plan/plan-upgrade-prompt';
import { verifyRole } from '@/lib/auth-guard';
import { getTenantWithPlan, getEffectiveLimits } from '@/lib/plan-limits';
import { ScanSearch } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'كشف التناقضات المالية',
};

export default async function DiscrepanciesPage({
    searchParams,
}: {
    searchParams: { from?: string; to?: string };
}) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'ACCOUNTANT']);
    if (tenantId) {
        const tenant = await getTenantWithPlan(tenantId);
        if (tenant && !getEffectiveLimits(tenant).modules.advancedReports) {
            return <PlanUpgradePrompt feature="كشف التناقضات المالية" requiredPlan="PRO" description="مقارنة أرقام الورديات بالفواتير الفعلية للكشف عن الأخطاء — متاح في خطة المتقدمة أو أعلى." />;
        }
    }

    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    const fromDate = searchParams.from ? new Date(searchParams.from) : defaultFrom;
    const toDate = searchParams.to ? new Date(searchParams.to) : now;

    let shifts = null;
    let error = '';
    try {
        shifts = await getShiftDiscrepancies(fromDate, toDate);
    } catch (e: any) {
        error = e?.message ?? 'حدث خطأ';
    }

    const fromStr = fromDate.toISOString().slice(0, 10);
    const toStr = toDate.toISOString().slice(0, 10);

    return (
        <div className="space-y-6" dir="rtl">
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                        <ScanSearch className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">كشف التناقضات المالية</h1>
                        <p className="text-muted-foreground text-sm">
                            مقارنة أرقام الورديات مع الفواتير الفعلية للكشف عن الأخطاء
                        </p>
                    </div>
                </div>

                <form method="get" className="flex items-center gap-2 flex-wrap">
                    <label className="text-sm text-muted-foreground">من</label>
                    <input
                        type="date"
                        name="from"
                        defaultValue={fromStr}
                        className="h-9 rounded-md border bg-background px-3 text-sm"
                    />
                    <label className="text-sm text-muted-foreground">إلى</label>
                    <input
                        type="date"
                        name="to"
                        defaultValue={toStr}
                        className="h-9 rounded-md border bg-background px-3 text-sm"
                    />
                    <button
                        type="submit"
                        className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium"
                    >
                        بحث
                    </button>
                </form>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {shifts && <DiscrepancyReport shifts={shifts} />}
        </div>
    );
}
