'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createTenantBySuperAdmin } from '@/lib/actions/superadmin';
import {
    Loader2, CheckCircle2, AlertCircle,
    Building2, User, Bot, Globe, Lock,
    Mail, Sparkles, UtensilsCrossed, Zap,
    ChevronLeft, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ARABIC_TO_LATIN: Record<string, string> = {
    'أ': 'a', 'إ': 'i', 'آ': 'aa', 'ا': 'a',
    'ب': 'b', 'ت': 't', 'ث': 'th',
    'ج': 'j', 'ح': 'h', 'خ': 'kh',
    'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z',
    'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd',
    'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh',
    'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l',
    'م': 'm', 'ن': 'n', 'ه': 'h', 'و': 'w',
    'ي': 'y', 'ى': 'a', 'ة': 'h', 'ء': 'a',
    'ئ': 'y', 'ؤ': 'w', 'لا': 'la',
};

function transliterateArabic(text: string): string {
    // handle لا as a special two-char combo first
    const result = text.replace(/لا/g, 'la');
    return result.split('').map(ch => ARABIC_TO_LATIN[ch] ?? ch).join('');
}

function toSlug(name: string) {
    return transliterateArabic(name)
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40);
}

const PLANS = [
    {
        value: 'TRIAL',
        label: 'تجريبي',
        sublabel: '14 يوم مجاناً',
        icon: '🧪',
        color: 'border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-700',
        activeColor: 'border-blue-500 bg-blue-100 dark:bg-blue-900/50 ring-2 ring-blue-400',
        badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
        features: ['قائمة طعام كاملة', 'إدارة الطلبات', 'تقارير أساسية'],
    },
    {
        value: 'BASIC',
        label: 'أساسي',
        sublabel: 'للمطاعم الصغيرة',
        icon: '📦',
        color: 'border-slate-300 bg-slate-50 dark:bg-slate-900/30 dark:border-slate-600',
        activeColor: 'border-slate-500 bg-slate-100 dark:bg-slate-800/60 ring-2 ring-slate-400',
        badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
        features: ['كل مزايا التجريبي', 'دعم عملاء', 'تقارير متقدمة'],
    },
    {
        value: 'PRO',
        label: 'متقدم',
        sublabel: 'الأكثر شيوعاً',
        icon: '⚡',
        color: 'border-purple-300 bg-purple-50 dark:bg-purple-950/30 dark:border-purple-700',
        activeColor: 'border-purple-500 bg-purple-100 dark:bg-purple-900/50 ring-2 ring-purple-400',
        badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
        features: ['كل مزايا الأساسي', 'مساعد ذكي', 'تحليلات متقدمة'],
    },
    {
        value: 'ENTERPRISE',
        label: 'مؤسسي',
        sublabel: 'للسلاسل الكبيرة',
        icon: '🏢',
        color: 'border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-700',
        activeColor: 'border-amber-500 bg-amber-100 dark:bg-amber-900/50 ring-2 ring-amber-400',
        badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        features: ['كل مزايا المتقدم', 'أفرع متعددة', 'أولوية الدعم'],
    },
] as const;

const SERVICE_MODES = [
    {
        value: 'TABLE_SERVICE',
        label: 'خدمة الطاولات',
        desc: 'طلبات على الطاولات مع نظام الكابتن والنادل',
        icon: UtensilsCrossed,
        color: 'border-indigo-300 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-700',
        activeColor: 'border-indigo-500 bg-indigo-100 dark:bg-indigo-900/50 ring-2 ring-indigo-400',
        iconColor: 'text-indigo-500',
    },
    {
        value: 'QUICK_SERVICE',
        label: 'خدمة سريعة',
        desc: 'نقطة بيع سريعة (POS) بدون طاولات',
        icon: Zap,
        color: 'border-orange-300 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-700',
        activeColor: 'border-orange-500 bg-orange-100 dark:bg-orange-900/50 ring-2 ring-orange-400',
        iconColor: 'text-orange-500',
    },
] as const;

const AI_PRESETS = [
    { value: 0,   label: '∞',   sublabel: 'غير محدود' },
    { value: 10,  label: '10',  sublabel: 'محادثة/يوم' },
    { value: 50,  label: '50',  sublabel: 'محادثة/يوم' },
    { value: 100, label: '100', sublabel: 'محادثة/يوم' },
] as const;

function SectionHeader({
    step, icon: Icon, title, desc, iconBg,
}: {
    step: number;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    desc: string;
    iconBg: string;
}) {
    return (
        <div className="flex items-center gap-3 mb-5">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', iconBg)}>
                <Icon className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {step}
                    </span>
                    <h2 className="font-bold text-sm">{title}</h2>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
        </div>
    );
}

export default function CreateTenantForm() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const [nameValue, setNameValue] = useState('');
    const [slugValue, setSlugValue] = useState('');
    const [slugTouched, setSlugTouched] = useState(false);

    const [selectedPlan, setSelectedPlan] = useState<string>('TRIAL');
    const [selectedMode, setSelectedMode] = useState<string>('TABLE_SERVICE');
    const [aiLimit, setAiLimit] = useState<number>(0);
    const [aiCustom, setAiCustom] = useState('');
    const [aiMode, setAiMode] = useState<'preset' | 'custom'>('preset');

    function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
        const n = e.target.value;
        setNameValue(n);
        if (!slugTouched) setSlugValue(toSlug(n));
    }

    function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
        setSlugTouched(true);
        setSlugValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError('');
        const formData = new FormData(e.currentTarget);
        formData.set('slug', slugValue);
        formData.set('plan', selectedPlan);
        formData.set('serviceMode', selectedMode);
        formData.set('aiDailyLimit', String(aiMode === 'custom' ? Math.max(0, parseInt(aiCustom) || 0) : aiLimit));

        startTransition(async () => {
            const result = await createTenantBySuperAdmin(formData);
            if (result?.error) {
                setError(result.error);
            } else if (result?.success) {
                setSuccess(true);
                setTimeout(() => router.push('/superadmin/tenants'), 1500);
            }
        });
    }

    const effectiveAiLimit = aiMode === 'custom' ? Math.max(0, parseInt(aiCustom) || 0) : aiLimit;

    return (
        <form onSubmit={handleSubmit} className="space-y-5">

            {/* ── Section 1: Restaurant Identity ─────────────────────────── */}
            <div className="rounded-2xl border bg-card overflow-hidden">
                <div className="h-1 bg-gradient-to-l from-primary/80 to-primary/30" />
                <div className="p-5">
                    <SectionHeader
                        step={1}
                        icon={Building2}
                        title="هوية المطعم"
                        desc="الاسم التجاري والمعرف الخاص بالمنصة"
                        iconBg="bg-primary"
                    />
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="name" className="text-sm font-medium">
                                اسم المطعم <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="name"
                                name="name"
                                required
                                placeholder="مطعم الأصيل"
                                value={nameValue}
                                onChange={handleNameChange}
                                className="h-10"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="slug" className="text-sm font-medium">
                                المعرف (slug) <span className="text-destructive">*</span>
                            </Label>
                            <div className="flex gap-2">
                                <Input
                                    id="slug"
                                    name="slug"
                                    required
                                    dir="ltr"
                                    placeholder="al-aseel"
                                    value={slugValue}
                                    onChange={handleSlugChange}
                                    className="h-10 font-mono text-sm flex-1"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-10 px-3 shrink-0 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                                    title="توليد تلقائي من الاسم"
                                    onClick={() => { setSlugTouched(false); setSlugValue(toSlug(nameValue)); }}
                                    disabled={!nameValue.trim()}
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    توليد
                                </Button>
                            </div>
                            {slugValue && (
                                <div className="flex items-center gap-1.5 mt-1">
                                    <Globe className="w-3 h-3 text-muted-foreground shrink-0" />
                                    <code className="text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded" dir="ltr">
                                        yourapp.com/<span className="text-primary font-semibold">{slugValue}</span>
                                    </code>
                                </div>
                            )}
                            {!slugValue && (
                                <p className="text-[11px] text-muted-foreground">أحرف إنجليزية صغيرة وأرقام وشرطات فقط</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Section 2: Plan ─────────────────────────────────────────── */}
            <div className="rounded-2xl border bg-card overflow-hidden">
                <div className="h-1 bg-gradient-to-l from-purple-400 to-purple-300/30" />
                <div className="p-5">
                    <SectionHeader
                        step={2}
                        icon={Sparkles}
                        title="الخطة الأولية"
                        desc="يمكن تغييرها لاحقاً من صفحة تفاصيل المطعم"
                        iconBg="bg-purple-500"
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {PLANS.map(plan => (
                            <button
                                key={plan.value}
                                type="button"
                                onClick={() => setSelectedPlan(plan.value)}
                                className={cn(
                                    'relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-3.5 text-center transition-all duration-150',
                                    selectedPlan === plan.value ? plan.activeColor : plan.color + ' hover:opacity-80',
                                )}
                            >
                                {selectedPlan === plan.value && (
                                    <span className="absolute top-2 left-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                        <CheckCircle2 className="w-3 h-3 text-white" />
                                    </span>
                                )}
                                <span className="text-2xl leading-none">{plan.icon}</span>
                                <div>
                                    <p className="font-bold text-sm">{plan.label}</p>
                                    <p className="text-[11px] text-muted-foreground leading-tight">{plan.sublabel}</p>
                                </div>
                                <ul className="space-y-0.5 text-right w-full mt-1">
                                    {plan.features.map(f => (
                                        <li key={f} className="text-[10px] text-muted-foreground flex items-center gap-1">
                                            <span className="w-1 h-1 rounded-full bg-muted-foreground/50 shrink-0" />
                                            {f}
                                        </li>
                                    ))}
                                </ul>
                            </button>
                        ))}
                    </div>
                    <input type="hidden" name="plan" value={selectedPlan} />
                </div>
            </div>

            {/* ── Section 3: Service mode ──────────────────────────────────── */}
            <div className="rounded-2xl border bg-card overflow-hidden">
                <div className="h-1 bg-gradient-to-l from-indigo-400 to-indigo-300/30" />
                <div className="p-5">
                    <SectionHeader
                        step={3}
                        icon={UtensilsCrossed}
                        title="نمط الخدمة"
                        desc="يحدد طريقة عمل نظام الطلبات في المطعم"
                        iconBg="bg-indigo-500"
                    />
                    <div className="grid sm:grid-cols-2 gap-3">
                        {SERVICE_MODES.map(mode => {
                            const Icon = mode.icon;
                            return (
                                <button
                                    key={mode.value}
                                    type="button"
                                    onClick={() => setSelectedMode(mode.value)}
                                    className={cn(
                                        'relative flex items-center gap-3 rounded-xl border-2 p-4 text-right transition-all duration-150',
                                        selectedMode === mode.value ? mode.activeColor : mode.color + ' hover:opacity-80',
                                    )}
                                >
                                    {selectedMode === mode.value && (
                                        <span className="absolute top-2.5 left-2.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                                            <CheckCircle2 className="w-3 h-3 text-white" />
                                        </span>
                                    )}
                                    <div className={cn('w-10 h-10 rounded-xl bg-background flex items-center justify-center shrink-0 border')}>
                                        <Icon className={cn('w-5 h-5', mode.iconColor)} />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm">{mode.label}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{mode.desc}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    <input type="hidden" name="serviceMode" value={selectedMode} />
                </div>
            </div>

            {/* ── Section 4: AI Limit ──────────────────────────────────────── */}
            <div className="rounded-2xl border bg-card overflow-hidden">
                <div className="h-1 bg-gradient-to-l from-amber-400 to-amber-300/30" />
                <div className="p-5">
                    <SectionHeader
                        step={4}
                        icon={Bot}
                        title="حد المساعد الذكي"
                        desc="عدد المحادثات اليومية المسموح بها — يتجدد منتصف الليل"
                        iconBg="bg-amber-500"
                    />
                    <div className="space-y-3">
                        <div className="flex gap-1.5 flex-wrap">
                            {AI_PRESETS.map(p => (
                                <button
                                    key={p.value}
                                    type="button"
                                    onClick={() => { setAiMode('preset'); setAiLimit(p.value); }}
                                    className={cn(
                                        'flex flex-col items-center px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all duration-150 min-w-[64px]',
                                        aiMode === 'preset' && aiLimit === p.value
                                            ? 'border-amber-500 bg-amber-100 dark:bg-amber-900/50 ring-2 ring-amber-400 text-amber-800 dark:text-amber-200'
                                            : 'border-border bg-muted/30 hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20',
                                    )}
                                >
                                    {p.label}
                                    <span className="text-[10px] font-normal text-muted-foreground">{p.sublabel}</span>
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => setAiMode('custom')}
                                className={cn(
                                    'flex flex-col items-center px-4 py-2.5 rounded-xl border-2 text-sm font-bold transition-all duration-150 min-w-[64px]',
                                    aiMode === 'custom'
                                        ? 'border-amber-500 bg-amber-100 dark:bg-amber-900/50 ring-2 ring-amber-400 text-amber-800 dark:text-amber-200'
                                        : 'border-border bg-muted/30 hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20',
                                )}
                            >
                                مخصص
                                <span className="text-[10px] font-normal text-muted-foreground">أدخل رقماً</span>
                            </button>
                        </div>
                        {aiMode === 'custom' && (
                            <Input
                                type="number"
                                min={1}
                                value={aiCustom}
                                onChange={e => setAiCustom(e.target.value)}
                                placeholder="مثال: 30"
                                className="h-10 w-40 text-sm"
                                autoFocus
                            />
                        )}
                        <div className={cn(
                            'inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium',
                            effectiveAiLimit === 0
                                ? 'bg-muted text-muted-foreground'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
                        )}>
                            <Bot className="w-3.5 h-3.5" />
                            {effectiveAiLimit === 0
                                ? 'المساعد الذكي: غير محدود'
                                : `المساعد الذكي: ${effectiveAiLimit} محادثة يومياً`}
                        </div>
                    </div>
                    <input type="hidden" name="aiDailyLimit" value={effectiveAiLimit} />
                </div>
            </div>

            {/* ── Section 5: Admin Account ─────────────────────────────────── */}
            <div className="rounded-2xl border bg-card overflow-hidden">
                <div className="h-1 bg-gradient-to-l from-emerald-400 to-emerald-300/30" />
                <div className="p-5">
                    <SectionHeader
                        step={5}
                        icon={User}
                        title="حساب المدير"
                        desc="بيانات دخول المدير الرئيسي للمطعم"
                        iconBg="bg-emerald-500"
                    />
                    <div className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="adminName" className="text-sm font-medium flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                                    اسم المدير <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="adminName"
                                    name="adminName"
                                    required
                                    placeholder="أحمد محمد"
                                    className="h-10"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="adminEmail" className="text-sm font-medium flex items-center gap-1.5">
                                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                                    البريد الإلكتروني <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="adminEmail"
                                    name="adminEmail"
                                    type="email"
                                    required
                                    dir="ltr"
                                    placeholder="admin@restaurant.com"
                                    className="h-10"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="adminPassword" className="text-sm font-medium flex items-center gap-1.5">
                                <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                                كلمة المرور <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="adminPassword"
                                name="adminPassword"
                                type="password"
                                required
                                minLength={6}
                                placeholder="••••••••"
                                className="h-10"
                            />
                            <p className="text-[11px] text-muted-foreground">6 أحرف على الأقل — سيتم إبلاغ المدير بها لاحقاً</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Error / Success ──────────────────────────────────────────── */}
            {error && (
                <div className="flex items-center gap-2.5 text-destructive bg-destructive/10 border border-destructive/20 px-4 py-3 rounded-xl text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {error}
                </div>
            )}

            {success && (
                <div className="flex items-center gap-2.5 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-4 py-3 rounded-xl text-sm">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    تم إنشاء الحساب بنجاح! جاري التحويل إلى قائمة المطاعم...
                </div>
            )}

            {/* ── Submit bar ───────────────────────────────────────────────── */}
            <div className="rounded-2xl border bg-card px-5 py-4 flex items-center justify-between gap-4">
                <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>
                        خطة: <span className="font-semibold text-foreground">{PLANS.find(p => p.value === selectedPlan)?.label}</span>
                        {' · '}
                        خدمة: <span className="font-semibold text-foreground">{SERVICE_MODES.find(m => m.value === selectedMode)?.label}</span>
                        {' · '}
                        ذكاء: <span className="font-semibold text-foreground">{effectiveAiLimit === 0 ? 'غير محدود' : `${effectiveAiLimit}/يوم`}</span>
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button
                        type="button"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => router.back()}
                        disabled={isPending || success}
                    >
                        <ChevronLeft className="w-4 h-4" />
                        إلغاء
                    </Button>
                    <Button
                        type="submit"
                        disabled={isPending || success}
                        className="gap-2 min-w-[130px]"
                    >
                        {isPending ? (
                            <><Loader2 className="w-4 h-4 animate-spin" />جاري الإنشاء...</>
                        ) : success ? (
                            <><CheckCircle2 className="w-4 h-4" />تم الإنشاء!</>
                        ) : (
                            <><Building2 className="w-4 h-4" />إنشاء الحساب</>
                        )}
                    </Button>
                </div>
            </div>
        </form>
    );
}
