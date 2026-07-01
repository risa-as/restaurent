import { getConsolidatedReport } from '@/lib/actions/consolidated-reports';
import { ConsolidatedBranchReport } from '@/components/reports/consolidated-branch-report';
import { PlanUpgradePrompt } from '@/components/plan/plan-upgrade-prompt';
import { verifyRole } from '@/lib/auth-guard';
import { getTenantWithPlan, type PlanLimits , getEffectiveLimits } from '@/lib/plan-limits';
import { BarChart3, Building2, CalendarDays, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export const metadata = {
    title: 'التقارير الموحّدة',
};

export const dynamic = 'force-dynamic';

interface Props {
    searchParams: Promise<{ from?: string; to?: string; branchId?: string }>;
}

export default async function ConsolidatedReportPage({ searchParams }: Props) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'ACCOUNTANT']);

    let modules: PlanLimits['modules'] | null = null;
    if (tenantId) {
        const tenant = await getTenantWithPlan(tenantId);
        if (tenant) modules = getEffectiveLimits(tenant).modules;
        if (!modules?.advancedReports) {
            return <PlanUpgradePrompt feature="التقارير الموحدة للفروع" requiredPlan="PRO" description="مقارنة إيرادات وتكاليف جميع الفروع في تقرير واحد — متاح في خطة المتقدمة أو أعلى." />;
        }
    }

    const showCOGS = modules?.multiBranch ?? false;

    const { from: fromStr, to: toStr, branchId: branchIdParam } = await searchParams;
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const from = fromStr ? new Date(fromStr) : firstOfMonth;
    const to = toStr ? new Date(toStr) : now;
    const filterBranchId = branchIdParam && branchIdParam !== '__all__' ? branchIdParam : null;

    const { rows, totals, branches } = await getConsolidatedReport(from, to, filterBranchId);

    const fromLabel = from.toLocaleDateString('ar-IQ', { day: 'numeric', month: 'long', year: 'numeric' });
    const toLabel = to.toLocaleDateString('ar-IQ', { day: 'numeric', month: 'long', year: 'numeric' });

    return (
        <div className="space-y-6" dir="rtl">
            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                        <BarChart3 className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">التقارير الموحدة</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">مقارنة أداء الفروع في فترة زمنية واحدة</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-muted/60 border rounded-lg px-3 py-1.5 text-xs text-muted-foreground self-start sm:self-auto">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                    <span>{fromLabel} — {toLabel}</span>
                </div>
            </div>

            {/* ── Filter bar ── */}
            <Card className="shadow-sm border-border/60">
                <CardContent className="pt-4 pb-4">
                    <form className="flex flex-wrap gap-4 items-end">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground self-center pb-0.5">
                            <Filter className="h-4 w-4" />
                            <span>تصفية</span>
                        </div>
                        <div className="h-6 w-px bg-border self-center" />

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-muted-foreground">من تاريخ</label>
                            <input
                                type="date"
                                name="from"
                                defaultValue={from.toISOString().split('T')[0]}
                                className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors h-9"
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-medium text-muted-foreground">إلى تاريخ</label>
                            <input
                                type="date"
                                name="to"
                                defaultValue={to.toISOString().split('T')[0]}
                                className="rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors h-9"
                            />
                        </div>

                        {branches.length > 1 && (
                            <div className="flex flex-col gap-1">
                                <label className="text-xs font-medium text-muted-foreground">الفرع</label>
                                <div className="relative">
                                    <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                                    <select
                                        name="branchId"
                                        defaultValue={branchIdParam ?? '__all__'}
                                        className="rounded-lg border border-border bg-background pe-3 ps-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors h-9 appearance-none min-w-[160px]"
                                    >
                                        <option value="__all__">جميع الفروع</option>
                                        {branches.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            className="h-9 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                        >
                            تطبيق
                        </button>
                    </form>
                </CardContent>
            </Card>

            <ConsolidatedBranchReport rows={rows} totals={totals} from={from} to={to} showCOGS={showCOGS} />
        </div>
    );
}
