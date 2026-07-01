import { getTaxReport } from '@/lib/actions/reports';
import { TaxReportView } from '@/components/finance/tax-report-view';
import { Percent } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'التقرير الضريبي',
};

export default async function TaxReportPage({
    searchParams,
}: {
    searchParams: { from?: string; to?: string };
}) {
    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), 0, 1);
    const fromDate = searchParams.from ? new Date(searchParams.from) : defaultFrom;
    const toDate = searchParams.to ? new Date(searchParams.to) : now;

    let data = null;
    let error = '';
    try {
        data = await getTaxReport(fromDate, toDate);
    } catch (e: any) {
        error = e?.message ?? 'حدث خطأ';
    }

    const fromStr = fromDate.toISOString().slice(0, 10);
    const toStr = toDate.toISOString().slice(0, 10);

    return (
        <div className="space-y-6" dir="rtl">
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-900/30">
                        <Percent className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">التقرير الضريبي</h1>
                        <p className="text-muted-foreground text-sm">ملخص الضرائب المحسوبة على الإيرادات</p>
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
                        عرض
                    </button>
                </form>
            </div>

            {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {data && <TaxReportView data={data} />}
        </div>
    );
}
