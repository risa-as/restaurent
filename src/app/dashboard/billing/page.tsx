import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { getBillingInfo, getPaymentHistory } from '@/lib/actions/billing';
import BillingInfo from '@/components/billing/billing-info';
import PaymentSubmissionForm from '@/components/billing/payment-submission-form';
import PaymentHistoryTable from '@/components/billing/payment-history-table';
import { CreditCard, CalendarDays, AlertCircle, Clock, CheckCircle2, Zap, Star, Crown, PhoneCall } from 'lucide-react';

export const metadata = {
    title: 'الاشتراك والفوترة',
};

export const dynamic = 'force-dynamic';

const PLAN_LABELS: Record<string, string> = {
    TRIAL: 'تجريبية',
    BASIC: 'الأساسية',
    PRO: 'المتقدمة',
    ENTERPRISE: 'المؤسسات',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    TRIAL: { label: 'تجريبي', color: 'text-blue-700', bg: 'bg-blue-100 border-blue-200' },
    ACTIVE: { label: 'نشط', color: 'text-green-700', bg: 'bg-green-100 border-green-200' },
    PAST_DUE: { label: 'متأخر', color: 'text-red-700', bg: 'bg-red-100 border-red-200' },
    CANCELED: { label: 'ملغي', color: 'text-gray-700', bg: 'bg-gray-100 border-gray-200' },
    PAUSED: { label: 'موقوف', color: 'text-yellow-700', bg: 'bg-yellow-100 border-yellow-200' },
};

const PLAN_FEATURES: Record<string, { icon: typeof Star; color: string; features: string[] }> = {
    TRIAL: {
        icon: Clock,
        color: 'text-blue-500',
        features: ['طلبات محدودة', 'كاشير وأوامر مطبخ', 'إدارة المخزون', 'لوحة تحكم أساسية'],
    },
    BASIC: {
        icon: Star,
        color: 'text-slate-600',
        features: ['طلبات غير محدودة', 'كاشير، مطبخ، كابتن', 'إدارة المخزون', 'تقارير أساسية'],
    },
    PRO: {
        icon: Zap,
        color: 'text-purple-600',
        features: ['كل ميزات الأساسية', 'QR Menu للزبائن', 'نظام الولاء', 'التوصيل + خريطة', 'Talabat تكامل', 'تقارير متقدمة'],
    },
    ENTERPRISE: {
        icon: Crown,
        color: 'text-amber-600',
        features: ['كل ميزات المتقدمة', 'تعدد الأفرع', 'دعم مخصص 24/7', 'تخصيص كامل', 'API مفتوح'],
    },
};

export default async function BillingPage() {
    const session = await auth();
    if (!session || !['ADMIN', 'MANAGER'].includes(session.user?.role || '')) {
        redirect('/dashboard');
    }

    const [{ tenant, settings, pendingRequest, latestRejection, supportPhone }, payments] = await Promise.all([
        getBillingInfo(),
        getPaymentHistory(),
    ]);

    if (!tenant) redirect('/');

    const expiryDate = tenant.subscriptionStatus === 'TRIAL'
        ? tenant.trialEndsAt
        : tenant.currentPeriodEnd;

    const daysLeft = expiryDate
        ? Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

    const statusCfg = STATUS_CONFIG[tenant.subscriptionStatus] || STATUS_CONFIG.TRIAL;
    const planFeatures = PLAN_FEATURES[tenant.plan] || PLAN_FEATURES.BASIC;
    const PlanIcon = planFeatures.icon;
    const isUrgent = daysLeft !== null && daysLeft <= 7;

    return (
        <div className="space-y-6 max-w-5xl" dir="rtl">
            {/* Page Header */}
            <div className="flex items-center gap-3 border-b pb-5">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">الاشتراك والفوترة</h1>
                    <p className="text-sm text-muted-foreground">إدارة اشتراك مطعمك ومتابعة المدفوعات</p>
                </div>
            </div>

            {/* Alerts */}
            {pendingRequest && (
                <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-yellow-800 dark:bg-yellow-950/20 dark:border-yellow-800 dark:text-yellow-400">
                    <Clock className="w-5 h-5 shrink-0" />
                    <div>
                        <p className="font-semibold text-sm">طلب ترقية بانتظار الموافقة</p>
                        <p className="text-xs mt-0.5 opacity-80">
                            تم تقديم طلب ترقية إلى خطة <strong>{PLAN_LABELS[pendingRequest.plan] || pendingRequest.plan}</strong> بتاريخ {new Date(pendingRequest.createdAt).toLocaleDateString('ar-SA')}. سيتم إشعارك فور المراجعة.
                        </p>
                    </div>
                </div>
            )}

            {latestRejection && !pendingRequest && (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-800 dark:bg-red-950/20 dark:border-red-800 dark:text-red-400">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-semibold text-sm">تم رفض آخر طلب ترقية</p>
                        {latestRejection.adminNote && (
                            <p className="text-xs mt-1 opacity-80">السبب: {latestRejection.adminNote}</p>
                        )}
                        <p className="text-xs mt-0.5 opacity-70">يمكنك تقديم طلب جديد أدناه.</p>
                    </div>
                </div>
            )}

            {/* Current Plan Card */}
            <div className={`rounded-xl border-2 p-5 ${isUrgent ? 'border-red-300 bg-red-50/50 dark:bg-red-950/10' : 'border-border bg-card'}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                    {/* Plan info */}
                    <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10`}>
                            <PlanIcon className={`w-6 h-6 ${planFeatures.color}`} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="font-bold text-xl">خطة {PLAN_LABELS[tenant.plan] || tenant.plan}</h2>
                                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${statusCfg.bg} ${statusCfg.color}`}>
                                    {statusCfg.label}
                                </span>
                            </div>

                            {expiryDate && (
                                <div className="flex items-center gap-1.5 text-sm mt-1">
                                    <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                                    <span className="text-muted-foreground">
                                        {tenant.subscriptionStatus === 'TRIAL' ? 'تنتهي التجربة' : 'يجدد'} في:&nbsp;
                                        <span className="font-semibold text-foreground">{new Date(expiryDate).toLocaleDateString('ar-SA')}</span>
                                    </span>
                                    {daysLeft !== null && (
                                        <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${isUrgent ? 'bg-red-100 text-red-700' : 'bg-muted text-muted-foreground'}`}>
                                            {Math.max(0, daysLeft)} يوم متبقي
                                        </span>
                                    )}
                                </div>
                            )}

                            {/* Plan features */}
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {planFeatures.features.map(f => (
                                    <span key={f} className="flex items-center gap-1 text-xs bg-muted/60 border rounded-lg px-2 py-0.5 text-muted-foreground">
                                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                                        {f}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Support contact */}
                    {supportPhone ? (
                        <a
                            href={`https://wa.me/+964${supportPhone.slice(1).replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-sm bg-green-50 hover:bg-green-100 border border-green-200 text-green-800 rounded-xl px-4 py-3 transition-colors"
                        >
                            <PhoneCall className="w-4 h-4 shrink-0" />
                            <div>
                                <p className="font-semibold text-xs">الدعم الفني</p>
                                <p className="text-xs font-mono" dir="ltr">{supportPhone}</p>
                            </div>
                        </a>
                    ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/40 rounded-xl px-4 py-3">
                            <PhoneCall className="w-4 h-4 shrink-0" />
                            <div>
                                <p className="font-semibold text-foreground text-xs">الدعم الفني</p>
                                <p className="text-xs">تواصل معنا لأي استفسار</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* Payment info */}
                <div className="space-y-4">
                    <h2 className="font-bold text-lg">معلومات الدفع</h2>
                    <BillingInfo
                        bankName={settings.bankName}
                        bankAccount={settings.bankAccount}
                        bankAccountName={settings.bankAccountName}
                        bankIban={settings.bankIban}
                        zainCashNumber={settings.zainCashNumber}
                        usdToIqdRate={settings.usdToIqdRate}
                    />
                </div>

                {/* Submission form */}
                <div className="space-y-4">
                    <h2 className="font-bold text-lg">
                        {tenant.subscriptionStatus === 'TRIAL' ? 'ترقية الاشتراك' : 'تجديد أو ترقية'}
                    </h2>
                    <PaymentSubmissionForm
                        currentPlan={tenant.plan}
                        hasPendingRequest={!!pendingRequest}
                        pricing={{
                            pricingBasic: settings.pricingBasic,
                            pricingPro: settings.pricingPro,
                            pricingEnterprise: settings.pricingEnterprise,
                        }}
                    />
                </div>
            </div>

            {/* Payment history */}
            <div className="space-y-3">
                <h2 className="font-bold text-lg">سجل المدفوعات</h2>
                <PaymentHistoryTable payments={payments} />
            </div>
        </div>
    );
}
