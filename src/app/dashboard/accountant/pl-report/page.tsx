import { getPLReport } from '@/lib/actions/reports';
import { PLReportView } from '@/components/finance/pl-report-view';
import { PlanUpgradePrompt } from '@/components/plan/plan-upgrade-prompt';
import { verifyRole } from '@/lib/auth-guard';
import { getTenantWithPlan, getEffectiveLimits } from '@/lib/plan-limits';
import { FileBarChart2, ChevronLeft, ChevronRight } from 'lucide-react';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export const metadata = {
    title: 'تقرير الأرباح والخسائر',
};

const MONTHS = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

function prevMonth(year: number, month: number) {
    return month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };
}
function nextMonth(year: number, month: number) {
    return month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
}

export default async function PLReportPage({
    searchParams,
}: {
    searchParams: { year?: string; month?: string };
}) {
    const { tenantId } = await verifyRole(['ADMIN', 'MANAGER', 'ACCOUNTANT']);
    if (tenantId) {
        const tenant = await getTenantWithPlan(tenantId);
        if (tenant && !getEffectiveLimits(tenant).modules.advancedReports) {
            return (
                <PlanUpgradePrompt
                    feature="تقرير الأرباح والخسائر P&L"
                    requiredPlan="PRO"
                    description="تقرير P&L الشهري الشامل مع حساب COGS والمصروفات متاح في خطة المتقدمة أو أعلى."
                />
            );
        }
    }

    const now = new Date();
    const year = parseInt(searchParams.year ?? String(now.getFullYear()), 10);
    const month = parseInt(searchParams.month ?? String(now.getMonth() + 1), 10);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
        redirect('/dashboard/accountant/pl-report');
    }

    const prev = prevMonth(year, month);
    const next = nextMonth(year, month);
    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1;

    let data = null;
    let error = '';
    try {
        data = await getPLReport(year, month);
    } catch (e: any) {
        error = e?.message ?? 'حدث خطأ';
    }

    const yearOptions = [now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear()];

    return (
        <div className="space-y-6" dir="rtl">

            {/* ── Page Header ── */}
            <div className="flex items-start justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800">
                        <FileBarChart2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black tracking-tight">تقرير الأرباح والخسائر</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">قائمة P&amp;L الشهرية القابلة للطباعة</p>
                    </div>
                </div>

                {/* Month navigator + selector */}
                <div className="flex items-center gap-2">
                    {/* Prev month arrow */}
                    <Link
                        href={`?year=${prev.year}&month=${prev.month}`}
                        className="flex items-center justify-center w-9 h-9 rounded-xl border bg-card hover:bg-muted transition-colors"
                        title="الشهر السابق"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Link>

                    {/* Month / Year dropdowns */}
                    <form method="get" className="flex items-center gap-2">
                        <select
                            name="month"
                            defaultValue={month}
                            className="h-9 rounded-xl border bg-card px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                        >
                            {MONTHS.map((m, i) => (
                                <option key={i + 1} value={i + 1}>{m}</option>
                            ))}
                        </select>
                        <select
                            name="year"
                            defaultValue={year}
                            className="h-9 rounded-xl border bg-card px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                        >
                            {yearOptions.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                        <button
                            type="submit"
                            className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
                        >
                            عرض
                        </button>
                    </form>

                    {/* Next month arrow */}
                    <Link
                        href={`?year=${next.year}&month=${next.month}`}
                        className={`flex items-center justify-center w-9 h-9 rounded-xl border bg-card hover:bg-muted transition-colors ${isCurrentMonth ? 'opacity-30 pointer-events-none' : ''}`}
                        title="الشهر التالي"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Link>
                </div>
            </div>

            {/* ── Current month badge ── */}
            {isCurrentMonth && (
                <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-2.5 w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse inline-block" />
                    تعرض الآن الشهر الحالي — الأرقام قيد التحديث المستمر
                </div>
            )}

            {/* ── Error ── */}
            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                    ⚠️ {error}
                </div>
            )}

            {/* ── Report ── */}
            {data && <PLReportView data={data} />}

            {!data && !error && (
                <div className="rounded-2xl border border-dashed py-16 flex flex-col items-center gap-3 text-muted-foreground">
                    <FileBarChart2 className="w-10 h-10 opacity-20" />
                    <p className="text-sm">لا توجد بيانات لهذه الفترة</p>
                </div>
            )}
        </div>
    );
}
