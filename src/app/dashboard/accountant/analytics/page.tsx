import { verifyRole } from '@/lib/auth-guard';
import { getAnalyticsData } from '@/lib/analytics';
import { AIInsightsCard } from '@/components/analytics/ai-insights-card';
import { AnalyticsCharts } from '@/components/analytics/analytics-charts';
import { PlanUpgradePrompt } from '@/components/plan/plan-upgrade-prompt';
import { getTenantWithPlan, getEffectiveLimits } from '@/lib/plan-limits';
import { Sparkles } from 'lucide-react';

export const metadata = {
    title: 'تحليلات المحاسبة',
};

export const dynamic = 'force-dynamic';

export default async function AccountantAnalyticsPage() {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'ACCOUNTANT']);

    if (!tenantId) return <div>غير مصرح</div>;

    const tenant = await getTenantWithPlan(tenantId);
    if (tenant && !getEffectiveLimits(tenant).modules.analytics) {
        return <PlanUpgradePrompt feature="التحليلات المتقدمة" requiredPlan="PRO" />;
    }

    const data = await getAnalyticsData(tenantId);

    return (
        <div className="space-y-6 pt-4 animate-in fade-in duration-500" dir="rtl">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">التحليلات المتقدمة</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    رؤى مبنية على بيانات المطعم الفعلية — مبيعات، عملاء، مخزون، أداء
                </p>
            </div>

            {/* AI Advisor */}
            <div className="rounded-xl border border-primary/20 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/5 border-b border-primary/10">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    <span className="text-sm font-semibold text-primary">مستشار الذكاء الاصطناعي</span>
                    <span className="text-xs text-muted-foreground mr-1">— تحليل وتوصيات تلقائية</span>
                </div>
                <AIInsightsCard />
            </div>

            {/* All analytics sections */}
            <AnalyticsCharts data={data} />
        </div>
    );
}
