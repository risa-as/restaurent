import { getFeedbackStats, getFeedbackList, getFeedbackTrend } from '@/lib/actions/feedback';
import { FeedbackClient } from '@/components/feedback/feedback-client';
import { verifyRole } from '@/lib/auth-guard';
import { getTenantWithPlan } from '@/lib/plan-limits';
import { Star } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'تقييمات العملاء',
    description: 'تحليل رضا العملاء، استعراض وإدارة تقييماتهم وآرائهم',
};

export default async function FeedbackPage() {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER']);

    // Reply feature: available on BASIC and above (not TRIAL)
    let canReply = false;
    if (tenantId) {
        const tenant = await getTenantWithPlan(tenantId);
        canReply = !!tenant && tenant.plan !== 'TRIAL';
    }

    const [stats, list, trend] = await Promise.all([
        getFeedbackStats(),
        getFeedbackList(),
        getFeedbackTrend(),
    ]);

    return (
        <div className="space-y-6" dir="rtl">
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                            <Star className="w-6 h-6 text-amber-500 fill-amber-400" />
                        </div>
                        <h1 className="text-2xl font-black tracking-tight">تقييمات العملاء</h1>
                    </div>
                    <p className="text-muted-foreground text-sm mr-12">
                        تحليل رضا العملاء، استعراض التقييمات وإدارتها
                    </p>
                </div>
            </div>

            <FeedbackClient
                initialStats={stats}
                initialList={list}
                initialTrend={trend}
                canReply={canReply}
            />
        </div>
    );
}
