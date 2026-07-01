import { getTenantDetail } from '@/lib/actions/superadmin';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
    ArrowRight, Calendar, Globe, Mail, ShoppingBag,
    Users, UtensilsCrossed, TrendingUp, CreditCard,
    Bot, Clock, CheckCircle2, XCircle, Building2,
    GitBranch, Zap, ReceiptText,
} from 'lucide-react';
import TenantDetailActions from '@/components/superadmin/tenant-detail-actions';
import { TenantFeatureOverrides } from '@/components/superadmin/tenant-feature-overrides';
import { getPlanLimits } from '@/lib/plan-limits';
import { cn } from '@/lib/utils';

export const metadata = {
    title: 'تفاصيل المطعم',
};

export const dynamic = 'force-dynamic';

const PLAN_CONFIG: Record<string, { label: string; className: string }> = {
    TRIAL:      { label: 'تجريبي',  className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    BASIC:      { label: 'أساسي',   className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    PRO:        { label: 'متقدم',   className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
    ENTERPRISE: { label: 'مؤسسي',  className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
};

const STATUS_CONFIG: Record<string, { label: string; bar: string; dot: string }> = {
    TRIAL:    { label: 'تجريبي', bar: 'from-blue-500 to-blue-400',     dot: 'bg-blue-500' },
    ACTIVE:   { label: 'نشط',    bar: 'from-emerald-500 to-green-400', dot: 'bg-emerald-500' },
    PAST_DUE: { label: 'متأخر',  bar: 'from-red-500 to-rose-400',     dot: 'bg-red-500' },
    CANCELED: { label: 'ملغي',   bar: 'from-slate-400 to-slate-300',  dot: 'bg-slate-400' },
    PAUSED:   { label: 'موقوف',  bar: 'from-yellow-500 to-amber-400', dot: 'bg-yellow-500' },
};

const METHOD_LABELS: Record<string, string> = {
    BANK_TRANSFER: 'حوالة مصرفية',
    ZAIN_CASH: 'زين كاش',
    OTHER: 'أخرى',
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
    PENDING:  { label: 'قيد الانتظار', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
    APPROVED: { label: 'مقبول',        className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
    REJECTED: { label: 'مرفوض',        className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

export default async function TenantDetailPage({ params }: { params: { id: string } }) {
    const result = await getTenantDetail(params.id);
    if (!result) notFound();

    const { tenant, totalRevenue, todayOrders } = result;
    const adminUser = tenant.users.find(u => u.role === 'ADMIN');
    const plan = PLAN_CONFIG[tenant.plan] ?? PLAN_CONFIG.BASIC;
    const status = STATUS_CONFIG[tenant.subscriptionStatus] ?? STATUS_CONFIG.PAUSED;

    const expiryDate = tenant.subscriptionStatus === 'TRIAL'
        ? tenant.trialEndsAt
        : tenant.currentPeriodEnd;
    const daysLeft = expiryDate
        ? Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000)
        : null;

    return (
        <div className="space-y-6 max-w-6xl" dir="rtl">

            {/* ── Back ───────────────────────────────────────────────────── */}
            <Link href="/superadmin/tenants">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                    <ArrowRight className="w-4 h-4" />
                    العودة إلى المطاعم
                </Button>
            </Link>

            {/* ── Hero header ─────────────────────────────────────────────── */}
            <div className="relative rounded-2xl overflow-hidden border bg-card">
                {/* Gradient bar */}
                <div className={cn(
                    'h-1.5 w-full bg-gradient-to-l',
                    tenant.isActive ? status.bar : 'from-red-500 to-rose-400',
                )} />

                <div className="px-6 py-5 flex flex-wrap items-start justify-between gap-4">
                    {/* Name + meta */}
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="text-2xl font-bold">{tenant.name}</h1>
                            <span className={cn('text-xs px-2.5 py-0.5 rounded-full font-bold', plan.className)}>
                                {plan.label}
                            </span>
                            {tenant.isActive ? (
                                <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-semibold">
                                    <CheckCircle2 className="w-3 h-3" /> نشط
                                </span>
                            ) : (
                                <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-semibold">
                                    <XCircle className="w-3 h-3" /> موقوف
                                </span>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                                <Globe className="w-3.5 h-3.5" />
                                {tenant.slug}
                            </span>
                            {adminUser && (
                                <span className="flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5" />
                                    {adminUser.name} — {adminUser.email}
                                </span>
                            )}
                            <span className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5" />
                                انضم {new Date(tenant.createdAt).toLocaleDateString('ar-SA')}
                            </span>
                        </div>
                    </div>

                    {/* Expiry card */}
                    {expiryDate && daysLeft !== null && (
                        <div className={cn(
                            'flex items-center gap-3 px-4 py-3 rounded-xl border',
                            daysLeft <= 0
                                ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                                : daysLeft <= 7
                                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                                    : 'bg-muted/50 border-border',
                        )}>
                            <Clock className={cn('w-5 h-5 shrink-0',
                                daysLeft <= 0 ? 'text-red-500' :
                                daysLeft <= 7 ? 'text-amber-500' : 'text-muted-foreground'
                            )} />
                            <div>
                                <p className="text-[11px] text-muted-foreground leading-none">
                                    {tenant.subscriptionStatus === 'TRIAL' ? 'نهاية التجربة' : 'انتهاء الاشتراك'}
                                </p>
                                <p className={cn('text-sm font-bold mt-0.5',
                                    daysLeft <= 0 ? 'text-red-600 dark:text-red-400' :
                                    daysLeft <= 7 ? 'text-amber-600 dark:text-amber-400' : 'text-foreground',
                                )}>
                                    {new Date(expiryDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
                                </p>
                                <p className={cn('text-[11px] mt-0.5',
                                    daysLeft <= 0 ? 'text-red-500' :
                                    daysLeft <= 7 ? 'text-amber-500' : 'text-muted-foreground',
                                )}>
                                    {daysLeft <= 0 ? 'انتهى الاشتراك' :
                                     daysLeft === 0 ? 'ينتهي اليوم' :
                                     `${daysLeft} يوم متبقي`}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* KPI strip */}
                <div className="border-t grid grid-cols-2 sm:grid-cols-4 divide-x divide-x-reverse divide-border">
                    {[
                        { icon: ShoppingBag, label: 'إجمالي الطلبات', value: tenant._count.orders, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/20' },
                        { icon: Calendar,    label: 'طلبات اليوم',    value: todayOrders,            color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-950/20' },
                        { icon: UtensilsCrossed, label: 'أصناف القائمة', value: tenant._count.menuItems, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950/20' },
                        { icon: Users,       label: 'الموظفون',       value: tenant.users.length,    color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/20' },
                    ].map(({ icon: Icon, label, value, color, bg }) => (
                        <div key={label} className={cn('flex items-center gap-3 px-5 py-4', bg)}>
                            <Icon className={cn('w-5 h-5 shrink-0', color)} />
                            <div>
                                <p className="text-xl font-bold leading-none">{value}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Body ────────────────────────────────────────────────────── */}
            <div className="grid lg:grid-cols-3 gap-6">

                {/* ── Left — info + payments ─────────────────────────────── */}
                <div className="lg:col-span-2 space-y-5">

                    {/* Info grid */}
                    <div className="rounded-2xl border bg-card overflow-hidden">
                        <div className="px-5 py-3.5 border-b flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <h2 className="font-semibold text-sm">معلومات المنظمة</h2>
                        </div>
                        <div className="p-5 grid sm:grid-cols-2 gap-3">
                            {[
                                {
                                    label: 'الخطة والحالة',
                                    value: `${plan.label} — ${status.label}`,
                                    icon: TrendingUp,
                                    iconClass: 'text-purple-500',
                                },
                                {
                                    label: 'نظام الخدمة',
                                    value: tenant.serviceMode === 'TABLE_SERVICE' ? '🪑 خدمة طاولات' : '⚡ خدمة سريعة',
                                    icon: Zap,
                                    iconClass: 'text-orange-500',
                                },
                                {
                                    label: 'الأفرع المتعددة',
                                    value: tenant.multiBranchEnabled ? 'مفعّل' : 'غير مفعّل',
                                    icon: GitBranch,
                                    iconClass: 'text-indigo-500',
                                },
                                expiryDate ? {
                                    label: tenant.subscriptionStatus === 'TRIAL' ? 'نهاية التجربة' : 'انتهاء الاشتراك',
                                    value: `${new Date(expiryDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}${daysLeft !== null ? (daysLeft <= 0 ? ' — منتهي' : ` — ${daysLeft} يوم متبقي`) : ''}`,
                                    icon: Clock,
                                    iconClass: daysLeft !== null && daysLeft <= 0 ? 'text-red-500' : daysLeft !== null && daysLeft <= 7 ? 'text-amber-500' : 'text-muted-foreground',
                                } : null,
                            ].filter(Boolean).map((item) => {
                                const { label, value, icon: Icon, iconClass } = item!;
                                return (
                                    <div key={label} className="flex items-start gap-3 p-3 rounded-xl bg-muted/40">
                                        <div className="w-8 h-8 rounded-lg bg-background border flex items-center justify-center shrink-0 mt-0.5">
                                            <Icon className={cn('w-4 h-4', iconClass)} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">{label}</p>
                                            <p className="font-semibold text-sm mt-0.5">{value}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Revenue + AI limit row */}
                    <div className="grid sm:grid-cols-2 gap-4">
                        {/* Revenue */}
                        <div className="rounded-2xl border bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 p-5 flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                                <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">إجمالي الإيرادات</p>
                                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400 leading-tight">
                                    {Math.round(totalRevenue).toLocaleString('ar-IQ')}
                                </p>
                                <p className="text-xs text-muted-foreground">دينار عراقي</p>
                            </div>
                        </div>

                        {/* AI limit */}
                        <div className={cn(
                            'rounded-2xl border p-5 flex items-center gap-4',
                            tenant.aiDailyLimit > 0
                                ? 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30'
                                : 'bg-muted/40',
                        )}>
                            <div className={cn(
                                'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0',
                                tenant.aiDailyLimit > 0
                                    ? 'bg-amber-100 dark:bg-amber-900/40'
                                    : 'bg-muted',
                            )}>
                                <Bot className={cn('w-6 h-6', tenant.aiDailyLimit > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')} />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">المساعد الذكي — الحد اليومي</p>
                                <p className={cn(
                                    'text-2xl font-bold leading-tight',
                                    tenant.aiDailyLimit > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground',
                                )}>
                                    {tenant.aiDailyLimit === 0 ? '∞' : tenant.aiDailyLimit}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {tenant.aiDailyLimit === 0 ? 'غير محدود' : 'محادثة يومياً'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Team */}
                    <div className="rounded-2xl border bg-card overflow-hidden">
                        <div className="px-5 py-3.5 border-b flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <h2 className="font-semibold text-sm">الفريق ({tenant.users.length})</h2>
                        </div>
                        <div className="divide-y">
                            {tenant.users.slice(0, 8).map(user => (
                                <div key={user.id} className="flex items-center gap-3 px-5 py-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                                        {user.name.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{user.name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                                    </div>
                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium shrink-0">
                                        {user.role}
                                    </span>
                                </div>
                            ))}
                            {tenant.users.length > 8 && (
                                <div className="px-5 py-3 text-xs text-muted-foreground text-center">
                                    +{tenant.users.length - 8} موظف إضافي
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Payment history */}
                    {tenant.manualPayments.length > 0 && (
                        <div className="rounded-2xl border bg-card overflow-hidden">
                            <div className="px-5 py-3.5 border-b flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                                    <h2 className="font-semibold text-sm">سجل مدفوعات المنصة</h2>
                                </div>
                                <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                                    {tenant.manualPayments.length} دفعة
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-muted/40">
                                            <th className="px-5 py-2.5 text-right text-xs font-semibold text-muted-foreground">#</th>
                                            <th className="px-5 py-2.5 text-right text-xs font-semibold text-muted-foreground">التاريخ</th>
                                            <th className="px-5 py-2.5 text-right text-xs font-semibold text-muted-foreground">المبلغ</th>
                                            <th className="px-5 py-2.5 text-right text-xs font-semibold text-muted-foreground">الطريقة</th>
                                            <th className="px-5 py-2.5 text-right text-xs font-semibold text-muted-foreground">الحالة</th>
                                            <th className="px-5 py-2.5 text-right text-xs font-semibold text-muted-foreground">بواسطة</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {tenant.manualPayments.map((payment) => {
                                            const pStatus = PAYMENT_STATUS_CONFIG[payment.status] ?? PAYMENT_STATUS_CONFIG.PENDING;
                                            return (
                                                <tr key={payment.id} className="hover:bg-muted/20 transition-colors">
                                                    <td className="px-5 py-3 text-muted-foreground text-xs font-mono">
                                                        {payment.invoiceNumber ? `#${payment.invoiceNumber}` : `—`}
                                                    </td>
                                                    <td className="px-5 py-3 text-muted-foreground text-xs">
                                                        {new Date(payment.createdAt).toLocaleDateString('ar-SA')}
                                                    </td>
                                                    <td className="px-5 py-3 font-bold text-sm">
                                                        {payment.amount.toLocaleString('ar-IQ')}
                                                        <span className="text-xs font-normal text-muted-foreground ml-1">د.ع</span>
                                                    </td>
                                                    <td className="px-5 py-3 text-muted-foreground text-xs">
                                                        {METHOD_LABELS[payment.method] ?? payment.method}
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold', pStatus.className)}>
                                                            {pStatus.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3 text-xs text-muted-foreground">
                                                        {payment.approvedBy?.name ?? '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {tenant.manualPayments.length === 0 && (
                        <div className="rounded-2xl border border-dashed bg-muted/20 flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                            <ReceiptText className="w-8 h-8 opacity-30" />
                            <p className="text-sm">لا توجد مدفوعات مسجلة بعد</p>
                        </div>
                    )}
                </div>

                {/* ── Right — actions sidebar ────────────────────────────── */}
                <div className="space-y-4">
                    <TenantDetailActions tenant={{
                        id: tenant.id,
                        name: tenant.name,
                        isActive: tenant.isActive,
                        plan: tenant.plan,
                        adminEmail: adminUser?.email ?? '',
                        serviceMode: tenant.serviceMode,
                        multiBranchEnabled: tenant.multiBranchEnabled,
                        aiDailyLimit: tenant.aiDailyLimit,
                        currentPeriodEnd: tenant.currentPeriodEnd,
                        trialEndsAt: tenant.trialEndsAt,
                        subscriptionStatus: tenant.subscriptionStatus,
                    }} />

                    <TenantFeatureOverrides
                        tenantId={tenant.id}
                        planModules={getPlanLimits(tenant.plan).modules as unknown as Record<string, boolean>}
                        overrides={
                            tenant.featureOverrides && typeof tenant.featureOverrides === 'object' && !Array.isArray(tenant.featureOverrides)
                                ? (tenant.featureOverrides as Record<string, boolean>)
                                : {}
                        }
                    />
                </div>
            </div>
        </div>
    );
}
