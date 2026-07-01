import { getSmartAlerts } from '@/lib/actions/alerts';
import { SmartAlertsDashboard } from '@/components/alerts/smart-alerts-dashboard';
import { Bell } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'لوحة التنبيهات الذكية',
};

export default async function AlertsPage() {
    let data = null;
    let error = '';
    try {
        data = await getSmartAlerts();
    } catch (e: any) {
        error = e?.message ?? 'حدث خطأ';
    }

    return (
        <div className="space-y-6" dir="rtl">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                    <Bell className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                    <h1 className="text-2xl font-black tracking-tight">لوحة التنبيهات الذكية</h1>
                    <p className="text-muted-foreground text-sm">
                        نظرة شاملة على التنبيهات والحالات التي تحتاج إلى اهتمام
                    </p>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {data && <SmartAlertsDashboard data={data} />}
        </div>
    );
}
