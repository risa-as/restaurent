'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updatePlanPricing } from '@/lib/actions/superadmin';
import { PlanFeatureEditor } from './plan-feature-editor';
import { useFmt } from '@/contexts/number-locale-context';
import {
    CheckCircle2, XCircle, Crown, Zap, Star, Gift,
    Loader2, CheckCircle, Pencil, Users, Store, AlertCircle
} from 'lucide-react';

// ─── Basics (included in ALL plans) ──────────────────────────────────────────

const BASICS = [
    'واجهة الكاشير (POS مباشر)',
    'نظام الكابتن وإدارة الطاولات',
    'واجهة المطبخ (KDS)',
    'واجهة النادل',
    'الفئات والتصنيفات',
    'إدارة الأدوار والصلاحيات',
    'لوحة المخزون وإدارة المواد الخام',
];

// ─── Differentiating features only ───────────────────────────────────────────

interface Feature {
    label: string;
    trial: boolean | string;
    basic: boolean | string;
    pro: boolean | string;
    enterprise: boolean | string;
    highlight?: boolean;
    // When set, this row's per-plan cells are derived from the live plan config
    // (what the super admin toggles in the editor) instead of the hardcoded
    // values below — so the comparison table always matches enforcement.
    module?: string;
}

const FEATURE_GROUPS: { title: string; features: Feature[] }[] = [
    {
        title: 'نظام الطلبات والخدمة',
        features: [
            { label: 'حجم الطلبات الشهرية', trial: '50 طلب', basic: 'غير محدود', pro: 'غير محدود', enterprise: 'غير محدود', highlight: true },
            { label: 'نظامَي الخدمة (طاولات + سريع)', trial: false, basic: false, pro: true, enterprise: true, highlight: true },
        ],
    },
    {
        title: 'القائمة والأصناف',
        features: [
            { label: 'عدد عناصر القائمة', trial: '10 أصناف', basic: 'غير محدود', pro: 'غير محدود', enterprise: 'غير محدود', highlight: true },
            { label: 'صور الأصناف', trial: false, basic: true, pro: true, enterprise: true },
            { label: 'العروض والخصومات', trial: false, basic: true, pro: true, enterprise: true, module: 'offers' },
            { label: 'قائمة QR للعملاء', trial: false, basic: false, pro: true, enterprise: true, highlight: true, module: 'qrMenu' },
        ],
    },
    {
        title: 'التوصيل والحجوزات',
        features: [
            { label: 'نظام الحجوزات', trial: false, basic: true, pro: true, enterprise: true, module: 'reservations' },
            { label: 'إدارة التوصيل والسائقين', trial: false, basic: false, pro: true, enterprise: true, highlight: true, module: 'delivery' },
            { label: 'تتبع الموقع للسائق', trial: false, basic: false, pro: true, enterprise: true, module: 'delivery' },
        ],
    },
    {
        title: 'المخزون والتكاليف',
        features: [
            { label: 'الوصفات وتكاليف الأصناف', trial: false, basic: false, pro: true, enterprise: true },
            { label: 'تنبيهات نقص المخزون', trial: false, basic: false, pro: true, enterprise: true, module: 'inventory' },
            { label: 'إدارة الموردين وطلبات الشراء', trial: false, basic: false, pro: true, enterprise: true, module: 'inventory' },
        ],
    },
    {
        title: 'العملاء والولاء',
        features: [
            { label: 'قاعدة بيانات العملاء', trial: false, basic: false, pro: true, enterprise: true, module: 'loyalty' },
            { label: 'نظام نقاط الولاء', trial: false, basic: false, pro: true, enterprise: true, highlight: true, module: 'loyalty' },
        ],
    },
    {
        title: 'التقارير والمالية',
        features: [
            { label: 'تقارير المبيعات اليومية', trial: false, basic: true, pro: true, enterprise: true },
            { label: 'الإقفال اليومي والمحاسبة', trial: false, basic: true, pro: true, enterprise: true },
            { label: 'تقرير الأرباح والمصروفات', trial: false, basic: false, pro: true, enterprise: true, module: 'advancedReports' },
            { label: 'تحليلات الذكاء الاصطناعي', trial: false, basic: false, pro: true, enterprise: true, highlight: true, module: 'analytics' },
            { label: 'تصدير التقارير (Excel/PDF)', trial: false, basic: false, pro: false, enterprise: true },
        ],
    },
    {
        title: 'الفريق والموظفون',
        features: [
            { label: 'عدد حسابات الموظفين', trial: '3 حسابات', basic: '8 حسابات', pro: '20 حساب', enterprise: 'غير محدود', highlight: true },
        ],
    },
    {
        title: 'التخصيص والعلامة التجارية',
        features: [
            { label: 'شعار المطعم', trial: false, basic: false, pro: true, enterprise: true, module: 'customBranding' },
            { label: 'تخصيص لون المطعم', trial: false, basic: false, pro: false, enterprise: true, highlight: true, module: 'customBranding' },
            { label: 'اسم التطبيق المخصص', trial: false, basic: false, pro: false, enterprise: true, module: 'customBranding' },
            { label: 'أفرع متعددة', trial: false, basic: false, pro: false, enterprise: true, highlight: true, module: 'multiBranch' },
        ],
    },
    {
        title: 'الدعم والخدمة',
        features: [
            { label: 'دعم عبر البريد الإلكتروني', trial: false, basic: true, pro: true, enterprise: true },
            { label: 'دعم الأولوية (واتساب/هاتف)', trial: false, basic: false, pro: false, enterprise: true, highlight: true },
            { label: 'إعداد وتدريب مجاني', trial: false, basic: false, pro: false, enterprise: true },
        ],
    },
];

// ─── Plan Config ──────────────────────────────────────────────────────────────

const PLAN_META = [
    { key: 'TRIAL', label: 'تجريبية', duration: '14 يوماً مجاناً', icon: Gift, gradient: 'from-blue-400 to-blue-600', ring: 'ring-blue-200', badge: null, description: 'جرّب النظام كاملاً قبل الالتزام.', priceKey: null as null | 'pricingBasic' | 'pricingPro' | 'pricingEnterprise' },
    { key: 'BASIC', label: 'الأساسية', duration: 'شهرياً', icon: Star, gradient: 'from-slate-400 to-slate-600', ring: 'ring-slate-200', badge: null, description: 'للمطاعم الصغيرة. طلبات ومبيعات وتقارير أساسية.', priceKey: 'pricingBasic' as const },
    { key: 'PRO', label: 'المتقدمة', duration: 'شهرياً', icon: Zap, gradient: 'from-purple-500 to-purple-700', ring: 'ring-purple-200', badge: 'الأكثر شيوعاً', description: 'للمطاعم المتوسطة والكبيرة. مخزون وتوصيل وولاء كامل.', priceKey: 'pricingPro' as const },
    { key: 'ENTERPRISE', label: 'المؤسسات', duration: 'شهرياً', icon: Crown, gradient: 'from-amber-400 to-orange-500', ring: 'ring-amber-200', badge: 'الأفضل قيمة', description: 'للسلاسل والمطاعم الكبرى. أفرع متعددة ودعم أولوية.', priceKey: 'pricingEnterprise' as const },
];

function FeatureCell({ value }: { value: boolean | string }) {
    if (value === true) return <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" />;
    if (value === false) return <XCircle className="w-4 h-4 text-muted-foreground/30 mx-auto" />;
    return <span className="text-xs font-medium text-center block">{value}</span>;
}

const COL_TO_PLAN = { trial: 'TRIAL', basic: 'BASIC', pro: 'PRO', enterprise: 'ENTERPRISE' } as const;
type ColKey = keyof typeof COL_TO_PLAN;

interface Props {
    pricing: { pricingBasic: number; pricingPro: number; pricingEnterprise: number };
    tenantCounts: Record<string, number>;
    planConfigs: Record<string, { modules?: Record<string, boolean>; maxOrdersPerMonth?: number | null; maxMenuItems?: number | null; maxStaffAccounts?: number | null }>;
}

export default function PlansPageClient({ pricing, tenantCounts, planConfigs }: Props) {
    const fmt = useFmt();
    const [isPending, startTransition] = useTransition();
    const [editPricing, setEditPricing] = useState(false);
    const [saved, setSaved] = useState(false);
    const [prices, setPrices] = useState({ ...pricing });

    function handleSavePricing(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
            await updatePlanPricing(formData);
            setPrices({
                pricingBasic: parseInt(formData.get('pricingBasic') as string),
                pricingPro: parseInt(formData.get('pricingPro') as string),
                pricingEnterprise: parseInt(formData.get('pricingEnterprise') as string),
            });
            setSaved(true);
            setEditPricing(false);
            setTimeout(() => setSaved(false), 3000);
        });
    }

    const totalTenants = Object.values(tenantCounts).reduce((a, b) => a + b, 0);

    // Module-backed rows read their per-plan value from the live plan config the
    // super admin edits; non-module rows keep their hardcoded value.
    const cellValue = (feat: Feature, col: ColKey): boolean | string => {
        if (feat.module) return !!planConfigs[COL_TO_PLAN[col]]?.modules?.[feat.module];
        return feat[col];
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Crown className="w-7 h-7 text-amber-500" />
                        إدارة الخطط
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        تحديد مميزات وأسعار كل خطة — {totalTenants} مطعم مشترك حالياً
                    </p>
                </div>
                <Button variant={editPricing ? 'outline' : 'default'} size="sm" onClick={() => setEditPricing(!editPricing)} className="gap-2">
                    <Pencil className="w-4 h-4" />
                    {editPricing ? 'إلغاء' : 'تعديل الأسعار'}
                </Button>
            </div>

            {/* Plan feature/limit editor (collapsed = button, expanded = full card) */}
            <PlanFeatureEditor configs={planConfigs} />

            {saved && (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 p-3 rounded-lg text-sm">
                    <CheckCircle className="w-4 h-4" /> تم حفظ الأسعار بنجاح
                </div>
            )}

            {/* Pricing edit */}
            {editPricing && (
                <form onSubmit={handleSavePricing}>
                    <Card className="border-primary/30 bg-primary/5">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">تعديل أسعار الخطط (د.ع / شهر)</CardTitle>
                            <CardDescription>الأسعار تنعكس فوراً على صفحة الفوترة لجميع المطاعم</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid sm:grid-cols-3 gap-4 mb-4">
                                {(['pricingBasic', 'pricingPro', 'pricingEnterprise'] as const).map((key, i) => (
                                    <div key={key} className="space-y-1.5">
                                        <label className="text-sm font-medium">{['الأساسية', 'المتقدمة', 'المؤسسات'][i]}</label>
                                        <div className="relative">
                                            <Input name={key} type="number" defaultValue={prices[key]} min={1000} step={1000} required dir="ltr" className="pl-14" />
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">د.ع</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-amber-50 border border-amber-200 p-2.5 rounded-lg mb-4">
                                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                                التغيير يطبّق على الطلبات الجديدة فقط، ولا يؤثر على المدفوعات المعتمدة.
                            </div>
                            <Button type="submit" disabled={isPending} className="gap-2">
                                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                حفظ الأسعار
                            </Button>
                        </CardContent>
                    </Card>
                </form>
            )}

            {/* Plan cards */}
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
                {PLAN_META.map(plan => {
                    const Icon = plan.icon;
                    const price = plan.priceKey ? prices[plan.priceKey] : null;
                    const count = tenantCounts[plan.key] || 0;
                    const pct = totalTenants > 0 ? Math.round((count / totalTenants) * 100) : 0;
                    return (
                        <Card key={plan.key} className={`relative overflow-hidden ${plan.badge ? `ring-2 ${plan.ring}` : ''}`}>
                            {plan.badge && (
                                <div className={`absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${plan.gradient} text-white`}>
                                    {plan.badge}
                                </div>
                            )}
                            <div className={`h-1.5 bg-gradient-to-r ${plan.gradient}`} />
                            <CardHeader className="pb-2 pt-5">
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.gradient} flex items-center justify-center mb-3`}>
                                    <Icon className="w-5 h-5 text-white" />
                                </div>
                                <CardTitle className="text-xl">{plan.label}</CardTitle>
                                <CardDescription className="text-xs leading-relaxed mt-1">{plan.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-muted/50 rounded-xl p-3 text-center">
                                    {price !== null ? (
                                        <><p className="text-2xl font-black">{fmt(price)}</p><p className="text-xs text-muted-foreground">د.ع / {plan.duration}</p></>
                                    ) : (
                                        <><p className="text-2xl font-black text-blue-600">مجاني</p><p className="text-xs text-muted-foreground">{plan.duration}</p></>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="flex items-center gap-1.5 text-muted-foreground"><Store className="w-3 h-3" />المطاعم الحالية</span>
                                        <span className="font-bold">{count} ({pct}%)</span>
                                    </div>
                                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div className={`h-full bg-gradient-to-r ${plan.gradient} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Feature comparison */}
            <div>
                <h2 className="text-xl font-bold mb-1">مقارنة المميزات التفصيلية</h2>
                <p className="text-sm text-muted-foreground mb-5">الميزات المتاحة في كل خطة</p>

                {/* Basics box */}
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-xl p-5 mb-6">
                    <div className="flex items-center gap-2 mb-3">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <h3 className="font-bold text-green-800 dark:text-green-400">الأساسيات المشمولة في جميع الخطط</h3>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4">
                        {BASICS.map(b => (
                            <div key={b} className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-green-500" />
                                {b}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-card border rounded-xl overflow-hidden">
                    <div className="grid grid-cols-5 bg-muted/50 border-b">
                        <div className="px-4 py-3 text-sm font-semibold text-muted-foreground">الميزة</div>
                        {PLAN_META.map(plan => {
                            const Icon = plan.icon;
                            return (
                                <div key={plan.key} className="px-3 py-3 text-center">
                                    <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-gradient-to-r ${plan.gradient} text-white`}>
                                        <Icon className="w-3 h-3" />{plan.label}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {FEATURE_GROUPS.map((group, gi) => (
                        <div key={gi}>
                            <div className="col-span-5 px-4 py-2 text-xs font-bold text-muted-foreground uppercase tracking-wide bg-muted/20 border-b border-t">
                                {group.title}
                            </div>
                            {group.features.map((feat, fi) => (
                                <div key={fi} className={`grid grid-cols-5 border-b last:border-b-0 hover:bg-muted/20 transition-colors ${feat.highlight ? 'bg-primary/[0.02]' : ''}`}>
                                    <div className="px-4 py-2.5 text-sm flex items-center gap-2">
                                        {feat.highlight && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                                        {feat.label}
                                    </div>
                                    {(['trial', 'basic', 'pro', 'enterprise'] as const).map(p => (
                                        <div key={p} className="px-3 py-2.5 flex items-center justify-center">
                                            <FeatureCell value={cellValue(feat, p)} />
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {/* Notes */}
            <div className="bg-muted/40 rounded-xl p-5 space-y-3 text-sm text-muted-foreground">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    ملاحظات مهمة
                </h3>
                <ul className="space-y-1.5 pr-4">
                    {[
                        'الأسعار بالدينار العراقي (IQD) — يُحسب الشهر بـ 30 يوماً.',
                        'فترة التجربة المجانية 14 يوماً قابلة للتمديد من صفحة إدارة المطاعم.',
                        'بعد انتهاء التجربة، يدخل المطعم فترة سماح 3 أيام قبل الإيقاف التلقائي.',
                        'الترقية تُفعَّل فور قبول الدفعة — الدفع يدوي (حوالة أو زين كاش).',
                        'حدود الموظفين تُحسب على جميع الأدوار (كاشير، نادل، طباخ، سائق...).',
                    ].map((note, i) => (
                        <li key={i} className="flex items-start gap-2">
                            <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-muted-foreground/50 mt-1.5" />
                            {note}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Revenue projection */}
            <div className="grid sm:grid-cols-3 gap-4">
                {[
                    { label: 'إيراد الخطط المدفوعة الحالية', value: (tenantCounts['BASIC'] || 0) * prices.pricingBasic + (tenantCounts['PRO'] || 0) * prices.pricingPro + (tenantCounts['ENTERPRISE'] || 0) * prices.pricingEnterprise, icon: Store, color: 'text-green-600' },
                    { label: 'لو التجريبيون تحولوا لـ BASIC', value: ((tenantCounts['TRIAL'] || 0) + (tenantCounts['BASIC'] || 0)) * prices.pricingBasic + (tenantCounts['PRO'] || 0) * prices.pricingPro + (tenantCounts['ENTERPRISE'] || 0) * prices.pricingEnterprise, icon: Users, color: 'text-blue-600' },
                    { label: 'لو كل المطاعم على ENTERPRISE', value: totalTenants * prices.pricingEnterprise, icon: Crown, color: 'text-amber-600' },
                ].map(({ label, value, icon: Icon, color }) => (
                    <Card key={label}>
                        <CardContent className="pt-4 pb-4">
                            <Icon className={`w-5 h-5 ${color} mb-2`} />
                            <p className="text-xs text-muted-foreground mb-1">{label}</p>
                            <p className={`text-xl font-bold ${color}`}>{fmt(Math.round(value))} د.ع</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
