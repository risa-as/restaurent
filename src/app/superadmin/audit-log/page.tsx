import { getAuditLogs } from '@/lib/actions/superadmin';
import { ClipboardList } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export const metadata = {
    title: 'سجل التدقيق',
};

export const dynamic = 'force-dynamic';

const ACTION_LABELS: Record<string, string> = {
    PAYMENT_APPROVED: 'قبول دفعة',
    PAYMENT_REJECTED: 'رفض دفعة',
    PLAN_CHANGED: 'تغيير خطة',
    TRIAL_EXTENDED: 'تمديد تجربة',
    TENANT_ACTIVATED: 'تفعيل مطعم',
    TENANT_SUSPENDED: 'إيقاف مطعم',
    SETTINGS_UPDATED: 'تحديث إعدادات',
    ANNOUNCEMENT_CREATED: 'إنشاء إعلان',
    ANNOUNCEMENT_TOGGLED: 'تغيير حالة إعلان',
    ANNOUNCEMENT_DELETED: 'حذف إعلان',
};

export default async function AuditLogPage({
    searchParams
}: {
    searchParams: { dateFrom?: string; dateTo?: string; page?: string }
}) {
    const { logs, total, page, totalPages } = await getAuditLogs({
        dateFrom: searchParams.dateFrom,
        dateTo: searchParams.dateTo,
        page: searchParams.page ? parseInt(searchParams.page) : 1,
    });

    return (
        <div className="space-y-6 max-w-5xl">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <ClipboardList className="w-7 h-7" />
                    سجل المراجعة
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    جميع العمليات المنجزة من قِبل مديري المنصة — {total} عملية
                </p>
            </div>

            {/* Filters */}
            <form className="bg-card border rounded-xl p-4 flex flex-wrap gap-3 items-end">
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">من تاريخ</label>
                    <input
                        type="date"
                        name="dateFrom"
                        defaultValue={searchParams.dateFrom || ''}
                        className="h-9 px-3 rounded-lg border bg-background text-sm"
                        dir="ltr"
                    />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">إلى تاريخ</label>
                    <input
                        type="date"
                        name="dateTo"
                        defaultValue={searchParams.dateTo || ''}
                        className="h-9 px-3 rounded-lg border bg-background text-sm"
                        dir="ltr"
                    />
                </div>
                <button type="submit" className="h-9 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium">
                    تصفية
                </button>
                <a href="/superadmin/audit-log" className="h-9 px-4 border rounded-lg text-sm font-medium flex items-center">
                    إعادة تعيين
                </a>
            </form>

            {logs.length === 0 ? (
                <Card>
                    <CardContent className="py-10 text-center text-muted-foreground">
                        لا توجد سجلات مطابقة
                    </CardContent>
                </Card>
            ) : (
                <div className="bg-card border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">التاريخ والوقت</th>
                                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">الإجراء</th>
                                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">التفاصيل</th>
                                <th className="px-4 py-3 text-right font-semibold text-muted-foreground">بواسطة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {logs.map(log => (
                                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                                        {new Date(log.createdAt).toLocaleString('ar-SA')}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                            {ACTION_LABELS[log.action] || log.action}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                                        {log.details || '—'}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        {log.user?.name || '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                        <a
                            key={p}
                            href={`/superadmin/audit-log?page=${p}${searchParams.dateFrom ? `&dateFrom=${searchParams.dateFrom}` : ''}${searchParams.dateTo ? `&dateTo=${searchParams.dateTo}` : ''}`}
                            className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm ${page === p ? 'bg-primary text-primary-foreground' : 'border hover:bg-muted'}`}
                        >
                            {p}
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}
