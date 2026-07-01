import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    Store, Activity, Plus, TrendingUp,
    Clock, Users, BarChart2,
    AlertTriangle, ArrowLeft, ShoppingBag,
} from 'lucide-react';
import { getDashboardAnalytics, getSuperAdminBillingDashboard } from '@/lib/actions/superadmin';
import RegistrationChart from '@/components/superadmin/registration-chart';
import { cn } from '@/lib/utils';

export const metadata = {
    title: 'الإدارة العليا',
};

export const dynamic = 'force-dynamic';

const PLAN_LABELS: Record<string, string> = {
    TRIAL: 'تجريبي', BASIC: 'أساسي', PRO: 'متقدم', ENTERPRISE: 'مؤسسي',
};

export default async function SuperAdminDashboard() {
    const [
        { registrationData, conversionRate },
        billing,
        [
            totalTenants,
            activeTenants,
            suspendedTenants,
            trialTenants,
            pastDueTenants,
            recentTenants,
            topTenants,
        ]
    ] = await Promise.all([
        getDashboardAnalytics(),
        getSuperAdminBillingDashboard(),
        Promise.all([
            prisma.tenant.count(),
            prisma.tenant.count({ where: { isActive: true, subscriptionStatus: 'ACTIVE' } }),
            prisma.tenant.count({ where: { isActive: false } }),
            prisma.tenant.count({ where: { subscriptionStatus: 'TRIAL' } }),
            prisma.tenant.count({ where: { subscriptionStatus: 'PAST_DUE' } }),
            prisma.tenant.findMany({
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: { users: { where: { role: 'ADMIN' }, take: 1 } },
            }),
            prisma.tenant.findMany({
                where: { isActive: true },
                include: { _count: { select: { orders: true } } },
                orderBy: { createdAt: 'desc' },
                take: 5,
            }),
        ]),
    ]);

    const newToday = recentTenants.filter(
        t => t.createdAt.toDateString() === new Date().toDateString()
    ).length;

    const sortedTopTenants = [...topTenants].sort(
        (a, b) => b._count.orders - a._count.orders
    );

    const hasAlerts = (billing as any).pendingRequestsCount > 0 || pastDueTenants > 0;

    const kpiStrip = [
        { label: 'الإجمالي',    value: totalTenants,    dot: 'bg-slate-400',   color: 'text-slate-700 dark:text-slate-300' },
        { label: 'نشط',         value: activeTenants,   dot: 'bg-emerald-500', color: 'text-emerald-700 dark:text-emerald-400' },
        { label: 'تجريبي',      value: trialTenants,    dot: 'bg-blue-500',    color: 'text-blue-700 dark:text-blue-400' },
        { label: 'موقوف',       value: suspendedTenants,dot: 'bg-red-400',     color: 'text-red-700 dark:text-red-400' },
        { label: 'تأخر دفع',    value: pastDueTenants,  dot: 'bg-orange-400',  color: 'text-orange-700 dark:text-orange-400' },
    ];

    return (
        <div className="space-y-5" dir="rtl">

            {/* ── Hero header ─────────────────────────────────────────────── */}
            <div className="rounded-2xl border bg-card overflow-hidden">
                <div className="h-1.5 w-full bg-gradient-to-l from-primary to-primary/40" />

                <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold">لوحة القيادة</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date().toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button asChild variant="outline" size="sm" className="gap-1.5 h-8 text-xs">
                            <Link href="/superadmin/tenants">
                                <Store className="w-3.5 h-3.5" />
                                المطاعم
                            </Link>
                        </Button>
                        <Button asChild size="sm" className="gap-1.5 h-8 text-xs">
                            <Link href="/superadmin/tenants/new">
                                <Plus className="w-3.5 h-3.5" />
                                مطعم جديد
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* KPI strip */}
                <div className="border-t grid grid-cols-5 divide-x divide-x-reverse divide-border">
                    {kpiStrip.map(({ label, value, dot, color }) => (
                        <div key={label} className="flex flex-col items-center justify-center py-3 gap-0.5">
                            <div className="flex items-center gap-1.5">
                                <span className={cn('w-2 h-2 rounded-full shrink-0', dot)} />
                                <span className={cn('text-xl font-bold leading-none', color)}>{value}</span>
                            </div>
                            <span className="text-[11px] text-muted-foreground">{label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Action alerts ────────────────────────────────────────────── */}
            {hasAlerts && (
                <div className="grid sm:grid-cols-2 gap-4">
                    {(billing as any).pendingRequestsCount > 0 && (
                        <Link href="/superadmin/billing" className="group">
                            <div className="flex items-center gap-4 px-5 py-4 rounded-2xl border-2 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700 hover:border-amber-400 transition-colors">
                                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-amber-800 dark:text-amber-300 text-sm">
                                        {(billing as any).pendingRequestsCount} طلب دفع معلق
                                    </p>
                                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">يتطلب مراجعة وقبول أو رفض</p>
                                </div>
                                <ArrowLeft className="w-4 h-4 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </div>
                        </Link>
                    )}
                    {pastDueTenants > 0 && (
                        <Link href="/superadmin/tenants?status=PAST_DUE" className="group">
                            <div className="flex items-center gap-4 px-5 py-4 rounded-2xl border-2 border-red-300 bg-red-50 dark:bg-red-950/30 dark:border-red-700 hover:border-red-400 transition-colors">
                                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center shrink-0">
                                    <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-red-800 dark:text-red-300 text-sm">
                                        {pastDueTenants} مطعم متأخر في الدفع
                                    </p>
                                    <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">في فترة السماح — يحتاج متابعة</p>
                                </div>
                                <ArrowLeft className="w-4 h-4 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </div>
                        </Link>
                    )}
                </div>
            )}

            {/* ── Chart + Metrics ──────────────────────────────────────────── */}
            <div className="grid lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 rounded-2xl border bg-card overflow-hidden">
                    <div className="px-5 py-3.5 border-b flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-muted-foreground" />
                        <h2 className="font-semibold text-sm">نمو التسجيلات — آخر 30 يوم</h2>
                    </div>
                    <div className="p-4">
                        <RegistrationChart data={registrationData} />
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    {/* Conversion */}
                    <div className="flex-1 rounded-2xl border bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/20 p-5 flex flex-col items-center justify-center gap-1 text-center">
                        <TrendingUp className="w-6 h-6 text-emerald-500" />
                        <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400 leading-none mt-1">
                            {conversionRate}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">معدل تحويل التجربة</p>
                        <p className="text-[11px] text-muted-foreground/70">من التجريبي إلى اشتراك مدفوع</p>
                    </div>

                    {/* Quick stats */}
                    <div className="rounded-2xl border bg-card divide-y">
                        {[
                            { icon: Plus, label: 'جديد اليوم', value: newToday, color: 'text-blue-500' },
                            { icon: Activity, label: 'نشط الآن', value: activeTenants, color: 'text-emerald-500' },
                            { icon: Users, label: 'إجمالي المطاعم', value: totalTenants, color: 'text-purple-500' },
                        ].map(({ icon: Icon, label, value, color }) => (
                            <div key={label} className="flex items-center gap-3 px-4 py-3">
                                <Icon className={cn('w-4 h-4 shrink-0', color)} />
                                <span className="text-sm text-muted-foreground flex-1">{label}</span>
                                <span className="font-bold text-sm">{value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Tables ───────────────────────────────────────────────────── */}
            <div className="grid lg:grid-cols-2 gap-5">

                {/* Recent registrations */}
                <div className="rounded-2xl border bg-card overflow-hidden">
                    <div className="px-5 py-3.5 border-b flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Plus className="w-4 h-4 text-blue-500" />
                            <h2 className="font-semibold text-sm">أحدث التسجيلات</h2>
                        </div>
                        <Link href="/superadmin/tenants">
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground">
                                عرض الكل <ArrowLeft className="w-3 h-3" />
                            </Button>
                        </Link>
                    </div>
                    <div className="divide-y">
                        {recentTenants.map(tenant => (
                            <Link
                                key={tenant.id}
                                href={`/superadmin/tenants/${tenant.id}`}
                                className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors"
                            >
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                                    {tenant.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{tenant.name}</p>
                                    <p className="text-xs text-muted-foreground truncate" dir="ltr">{tenant.slug}</p>
                                </div>
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                    <span className={cn(
                                        'text-[10px] px-1.5 py-0.5 rounded-full font-semibold',
                                        tenant.plan === 'TRIAL'      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                                        tenant.plan === 'PRO'        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' :
                                        tenant.plan === 'ENTERPRISE' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                                                                        'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                                    )}>
                                        {PLAN_LABELS[tenant.plan] ?? tenant.plan}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {new Date(tenant.createdAt).toLocaleDateString('ar-SA')}
                                    </span>
                                </div>
                            </Link>
                        ))}
                        {recentTenants.length === 0 && (
                            <div className="py-10 text-center text-sm text-muted-foreground">لا توجد تسجيلات بعد</div>
                        )}
                    </div>
                </div>

                {/* Top tenants by orders */}
                <div className="rounded-2xl border bg-card overflow-hidden">
                    <div className="px-5 py-3.5 border-b flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-500" />
                            <h2 className="font-semibold text-sm">أكثر المطاعم نشاطاً</h2>
                        </div>
                        <Link href="/superadmin/tenants">
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-muted-foreground">
                                عرض الكل <ArrowLeft className="w-3 h-3" />
                            </Button>
                        </Link>
                    </div>
                    <div className="divide-y">
                        {sortedTopTenants.map((tenant, idx) => (
                            <Link
                                key={tenant.id}
                                href={`/superadmin/tenants/${tenant.id}`}
                                className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors"
                            >
                                <span className={cn(
                                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                                    idx === 0 ? 'bg-amber-400 text-white' :
                                    idx === 1 ? 'bg-slate-300 text-slate-700 dark:bg-slate-600 dark:text-slate-200' :
                                    idx === 2 ? 'bg-orange-300 text-white' :
                                               'bg-muted text-muted-foreground',
                                )}>
                                    {idx + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{tenant.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {tenant.serviceMode === 'TABLE_SERVICE' ? '🪑 طاولات' : '⚡ سريع'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <ShoppingBag className="w-3.5 h-3.5 text-orange-400" />
                                    <span className="font-bold text-sm text-emerald-600 dark:text-emerald-400">
                                        {tenant._count.orders}
                                    </span>
                                </div>
                            </Link>
                        ))}
                        {sortedTopTenants.length === 0 && (
                            <div className="py-10 text-center text-sm text-muted-foreground">لا توجد بيانات بعد</div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
