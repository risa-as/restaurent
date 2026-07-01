'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
    ShieldAlert, ShieldCheck, Mail, TrendingUp, Clock,
    Loader2, CheckCircle2, GitBranch, UtensilsCrossed, Bot,
    Settings2, Sparkles, RefreshCw, CalendarCheck,
} from 'lucide-react';
import {
    changeTenantPlan, extendTenantTrial, sendEmailToTenantAdmin,
    toggleTenantStatus, toggleMultiBranch, changeTenantServiceMode,
    updateTenantAiLimit, manuallyExtendTenant,
} from '@/lib/actions/superadmin';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface TenantInfo {
    id: string;
    name: string;
    isActive: boolean;
    plan: string;
    adminEmail: string;
    serviceMode?: string;
    multiBranchEnabled?: boolean;
    aiDailyLimit?: number;
    currentPeriodEnd?: Date | null;
    trialEndsAt?: Date | null;
    subscriptionStatus?: string;
}

const RENEWAL_OPTIONS = [
    { months: 1,  label: 'شهر واحد' },
    { months: 3,  label: '3 أشهر' },
    { months: 6,  label: '6 أشهر' },
    { months: 12, label: 'سنة كاملة' },
] as const;

// ── Small section wrapper ────────────────────────────────────────────────────
function Section({ icon: Icon, title, children, accent }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    children: React.ReactNode;
    accent?: string;
}) {
    return (
        <div className="rounded-2xl border bg-card overflow-hidden">
            <div className={cn('flex items-center gap-2 px-4 py-3 border-b', accent ?? 'bg-muted/30')}>
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-semibold">{title}</span>
            </div>
            <div className="p-4 space-y-3">{children}</div>
        </div>
    );
}

export default function TenantDetailActions({ tenant }: { tenant: TenantInfo }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const [isActive, setIsActive] = useState(tenant.isActive);
    const [currentPlan, setCurrentPlan] = useState(tenant.plan);
    const [multiBranch, setMultiBranch] = useState(tenant.multiBranchEnabled ?? false);
    const [serviceMode, setServiceModeState] = useState(tenant.serviceMode ?? 'TABLE_SERVICE');
    const [aiLimitInput, setAiLimitInput] = useState(String(tenant.aiDailyLimit ?? 0));
    const [feedback, setFeedback] = useState('');

    const [renewDialog, setRenewDialog] = useState(false);
    const [renewMonths, setRenewMonths] = useState<number | null>(null);
    const [renewAmount, setRenewAmount] = useState('');
    const [customRenewMonths, setCustomRenewMonths] = useState('');

    const [emailDialog, setEmailDialog] = useState(false);
    const [emailSubject, setEmailSubject] = useState('');
    const [emailMessage, setEmailMessage] = useState('');
    const [emailSent, setEmailSent] = useState(false);

    function showFeedback(msg: string) {
        setFeedback(msg);
        setTimeout(() => setFeedback(''), 3000);
    }

    function handlePlanChange(plan: string) {
        startTransition(async () => {
            await changeTenantPlan(tenant.id, plan as any);
            setCurrentPlan(plan);
            showFeedback('تم تغيير الخطة بنجاح');
            router.refresh();
        });
    }

    function handleExtendTrial(days: number) {
        startTransition(async () => {
            await extendTenantTrial(tenant.id, days);
            showFeedback(`تم تمديد التجربة بـ ${days} يوم`);
            router.refresh();
        });
    }

    function handleToggleStatus() {
        startTransition(async () => {
            await toggleTenantStatus(tenant.id, !isActive);
            setIsActive(v => !v);
            showFeedback(isActive ? 'تم إيقاف المطعم' : 'تم تفعيل المطعم');
            router.refresh();
        });
    }

    function handleServiceModeChange(mode: string) {
        startTransition(async () => {
            const res = await changeTenantServiceMode(tenant.id, mode as any);
            if (res.success) {
                setServiceModeState(mode);
                showFeedback(mode === 'QUICK_SERVICE' ? 'تم التحويل إلى الخدمة السريعة' : 'تم التحويل إلى خدمة الطاولات');
                router.refresh();
            }
        });
    }

    function handleToggleMultiBranch() {
        startTransition(async () => {
            const res = await toggleMultiBranch(tenant.id);
            if (res.success) {
                setMultiBranch(v => !v);
                showFeedback(multiBranch ? 'تم تعطيل الأفرع المتعددة' : 'تم تفعيل الأفرع المتعددة');
                router.refresh();
            }
        });
    }

    function handleRenew() {
        if (!renewMonths) return;
        const amount = Math.max(0, parseInt(renewAmount) || 0);
        startTransition(async () => {
            await manuallyExtendTenant(tenant.id, renewMonths, amount);
            showFeedback(`تم تجديد الاشتراك بـ ${renewMonths === 12 ? 'سنة كاملة' : `${renewMonths} ${renewMonths === 1 ? 'شهر' : 'أشهر'}`}`);
            setRenewDialog(false);
            setRenewMonths(null);
            setRenewAmount('');
            router.refresh();
        });
    }

    // Calculate preview date after renewal
    function previewRenewalDate(months: number): string {
        const base = tenant.currentPeriodEnd && new Date(tenant.currentPeriodEnd) > new Date()
            ? new Date(tenant.currentPeriodEnd)
            : new Date();
        const result = new Date(base.getTime() + months * 30 * 24 * 60 * 60 * 1000);
        return result.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function handleAiLimitSave() {
        const limit = Math.max(0, parseInt(aiLimitInput) || 0);
        startTransition(async () => {
            const res = await updateTenantAiLimit(tenant.id, limit);
            if (res.success) {
                setAiLimitInput(String(limit));
                showFeedback(limit === 0 ? 'الحد اليومي: غير محدود' : `الحد اليومي: ${limit} محادثة`);
                router.refresh();
            }
        });
    }

    function handleSendEmail() {
        if (!emailSubject.trim() || !emailMessage.trim()) return;
        startTransition(async () => {
            await sendEmailToTenantAdmin(tenant.id, emailSubject, emailMessage);
            setEmailSent(true);
        });
    }

    const aiLimit = parseInt(aiLimitInput) || 0;

    return (
        <div className="space-y-4">

            {/* Feedback toast */}
            <div className={cn(
                'overflow-hidden transition-all duration-300',
                feedback ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0',
            )}>
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-3 py-2.5 rounded-xl text-sm">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    {feedback}
                </div>
            </div>

            {/* Status */}
            <Section icon={ShieldCheck} title="حالة الحساب">
                <div className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium mb-1',
                    isActive
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400'
                        : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400',
                )}>
                    <span className={cn('w-2 h-2 rounded-full', isActive ? 'bg-emerald-500' : 'bg-red-500')} />
                    {isActive ? 'الحساب نشط ومفعّل' : 'الحساب موقوف'}
                </div>
                <Button
                    variant={isActive ? 'destructive' : 'default'}
                    className="w-full gap-2"
                    onClick={handleToggleStatus}
                    disabled={isPending}
                >
                    {isPending
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : isActive
                            ? <><ShieldAlert className="w-4 h-4" /> إيقاف المطعم</>
                            : <><ShieldCheck className="w-4 h-4" /> تفعيل المطعم</>}
                </Button>
            </Section>

            {/* Plan & trial */}
            <Section icon={TrendingUp} title="الخطة والاشتراك">
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">تغيير الخطة</Label>
                    <Select value={currentPlan} onValueChange={handlePlanChange} disabled={isPending}>
                        <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="TRIAL">🧪 تجريبي</SelectItem>
                            <SelectItem value="BASIC">📦 أساسي</SelectItem>
                            <SelectItem value="PRO">⚡ متقدم</SelectItem>
                            <SelectItem value="ENTERPRISE">🏢 مؤسسي</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> تمديد فترة التجربة
                    </Label>
                    <div className="grid grid-cols-3 gap-1.5">
                        {[7, 14, 30].map(days => (
                            <Button
                                key={days}
                                variant="outline"
                                size="sm"
                                className="text-xs h-8"
                                onClick={() => handleExtendTrial(days)}
                                disabled={isPending}
                            >
                                +{days} يوم
                            </Button>
                        ))}
                    </div>
                </div>
            </Section>

            {/* Subscription renewal */}
            <Section icon={RefreshCw} title="تجديد الاشتراك" accent="bg-emerald-50 dark:bg-emerald-950/20">
                <p className="text-xs text-muted-foreground">
                    اختر مدة التجديد — سيُضاف من تاريخ الانتهاء الحالي
                </p>
                <div className="grid grid-cols-2 gap-2">
                    {RENEWAL_OPTIONS.map(({ months, label }) => (
                        <button
                            key={months}
                            onClick={() => { setRenewMonths(months); setRenewDialog(true); }}
                            disabled={isPending}
                            className={cn(
                                'flex flex-col items-center justify-center gap-0.5 rounded-xl border py-3 text-sm font-semibold',
                                'transition-colors hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30',
                                'disabled:opacity-50 disabled:cursor-not-allowed',
                            )}
                        >
                            <CalendarCheck className="w-4 h-4 text-emerald-500 mb-0.5" />
                            {label}
                            <span className="text-[10px] font-normal text-muted-foreground">
                                حتى {previewRenewalDate(months)}
                            </span>
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">مخصص</span>
                    <div className="flex-1 h-px bg-border" />
                </div>
                <div className="flex gap-2">
                    <Input
                        type="number"
                        min={1}
                        value={customRenewMonths}
                        onChange={e => setCustomRenewMonths(e.target.value)}
                        placeholder="عدد الأشهر"
                        className="h-9 text-sm"
                        disabled={isPending}
                        onKeyDown={e => {
                            const v = Math.max(1, parseInt(customRenewMonths) || 0);
                            if (e.key === 'Enter' && v >= 1) { setRenewMonths(v); setRenewDialog(true); }
                        }}
                    />
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-9 px-3 shrink-0 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                        disabled={isPending || !customRenewMonths || Math.max(1, parseInt(customRenewMonths) || 0) < 1}
                        onClick={() => {
                            const v = Math.max(1, parseInt(customRenewMonths) || 0);
                            if (v >= 1) { setRenewMonths(v); setRenewDialog(true); }
                        }}
                    >
                        تجديد
                    </Button>
                </div>
                {customRenewMonths && Math.max(1, parseInt(customRenewMonths) || 0) >= 1 && (
                    <p className="text-[11px] text-muted-foreground">
                        {Math.max(1, parseInt(customRenewMonths) || 0)} أشهر — حتى {previewRenewalDate(Math.max(1, parseInt(customRenewMonths) || 0))}
                    </p>
                )}
            </Section>

            {/* Features */}
            <Section icon={Settings2} title="إعدادات الخدمة">
                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1">
                        <UtensilsCrossed className="w-3 h-3" /> نمط الخدمة
                    </Label>
                    <Select value={serviceMode} onValueChange={handleServiceModeChange} disabled={isPending}>
                        <SelectTrigger className="h-9 text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="TABLE_SERVICE">🪑 خدمة الطاولات</SelectItem>
                            <SelectItem value="QUICK_SERVICE">⚡ الخدمة السريعة</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {currentPlan === 'ENTERPRISE' && (
                    <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <GitBranch className="w-3 h-3" /> الأفرع المتعددة
                        </Label>
                        <Button
                            variant={multiBranch ? 'secondary' : 'outline'}
                            size="sm"
                            className="w-full text-xs h-9 gap-2"
                            onClick={handleToggleMultiBranch}
                            disabled={isPending}
                        >
                            <GitBranch className="w-3.5 h-3.5" />
                            {multiBranch ? 'تعطيل الأفرع المتعددة' : 'تفعيل الأفرع المتعددة'}
                        </Button>
                    </div>
                )}
            </Section>

            {/* AI daily limit */}
            <Section
                icon={Bot}
                title="المساعد الذكي"
                accent="bg-amber-50 dark:bg-amber-950/20"
            >
                <div className={cn(
                    'flex items-center gap-3 p-3 rounded-xl mb-1',
                    aiLimit > 0
                        ? 'bg-amber-50 dark:bg-amber-950/30'
                        : 'bg-muted/40',
                )}>
                    <Sparkles className={cn('w-5 h-5 shrink-0', aiLimit > 0 ? 'text-amber-500' : 'text-muted-foreground')} />
                    <div>
                        <p className="text-sm font-semibold">
                            {aiLimit === 0 ? 'غير محدود' : `${aiLimit} محادثة / يوم`}
                        </p>
                        <p className="text-xs text-muted-foreground">الحد اليومي الحالي</p>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">تعديل الحد اليومي</Label>
                    <div className="flex gap-2">
                        <Input
                            type="number"
                            min={0}
                            value={aiLimitInput}
                            onChange={e => setAiLimitInput(e.target.value)}
                            className="h-9 text-sm"
                            placeholder="0"
                            disabled={isPending}
                        />
                        <Button
                            size="sm"
                            className="h-9 px-4 shrink-0"
                            onClick={handleAiLimitSave}
                            disabled={isPending}
                        >
                            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'حفظ'}
                        </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">0 = غير محدود — يتجدد الحد كل يوم</p>
                </div>
            </Section>

            {/* Email */}
            <Section icon={Mail} title="التواصل">
                <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => setEmailDialog(true)}
                    disabled={isPending}
                >
                    <Mail className="w-4 h-4" />
                    إرسال بريد للمدير
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">{tenant.adminEmail}</p>
            </Section>

            {/* Renewal confirm dialog */}
            <Dialog open={renewDialog} onOpenChange={v => { setRenewDialog(v); if (!v) { setRenewMonths(null); setRenewAmount(''); setCustomRenewMonths(''); } }}>
                <DialogContent dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <RefreshCw className="w-5 h-5 text-emerald-500" />
                            تأكيد تجديد الاشتراك
                        </DialogTitle>
                        <DialogDescription>
                            {tenant.name}
                        </DialogDescription>
                    </DialogHeader>
                    {renewMonths && (() => {
                        const amountNum = Math.max(0, parseInt(renewAmount) || 0);
                        return (
                            <div className="space-y-3 py-1">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-muted/50 rounded-xl p-3 text-center">
                                        <p className="text-xs text-muted-foreground mb-1">مدة التجديد</p>
                                        <p className="font-bold text-base">
                                            {renewMonths === 12 ? 'سنة كاملة' : renewMonths === 24 ? 'سنتان' : `${renewMonths} ${renewMonths === 1 ? 'شهر' : 'أشهر'}`}
                                        </p>
                                    </div>
                                    <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-3 text-center">
                                        <p className="text-xs text-muted-foreground mb-1">الانتهاء الجديد</p>
                                        <p className="font-bold text-sm text-emerald-700 dark:text-emerald-400">
                                            {previewRenewalDate(renewMonths)}
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">مبلغ الدفعة (د.ع)</Label>
                                    <Input
                                        type="number"
                                        min={0}
                                        value={renewAmount}
                                        onChange={e => setRenewAmount(e.target.value)}
                                        placeholder="0"
                                        className="h-9 text-sm"
                                        disabled={isPending}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                                    سيتم تفعيل الحساب تلقائياً وتسجيل دفعة يدوية بمبلغ{' '}
                                    <span className="font-semibold text-foreground">
                                        {amountNum.toLocaleString('ar-IQ')} د.ع
                                    </span>{' '}
                                    في سجل المدفوعات.
                                </p>
                            </div>
                        );
                    })()}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRenewDialog(false)} disabled={isPending}>
                            إلغاء
                        </Button>
                        <Button
                            onClick={handleRenew}
                            disabled={isPending}
                            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {isPending
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <RefreshCw className="w-4 h-4" />}
                            تأكيد التجديد
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Email dialog */}
            <Dialog open={emailDialog} onOpenChange={v => { setEmailDialog(v); if (!v) setEmailSent(false); }}>
                <DialogContent dir="rtl">
                    <DialogHeader>
                        <DialogTitle>إرسال بريد إلكتروني</DialogTitle>
                        <DialogDescription>إلى: {tenant.adminEmail}</DialogDescription>
                    </DialogHeader>
                    {emailSent ? (
                        <div className="py-6 flex flex-col items-center gap-2 text-emerald-600">
                            <CheckCircle2 className="w-12 h-12" />
                            <p className="font-semibold text-base">تم إرسال البريد بنجاح</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <Label>الموضوع</Label>
                                <Input
                                    value={emailSubject}
                                    onChange={e => setEmailSubject(e.target.value)}
                                    placeholder="موضوع الرسالة"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>الرسالة</Label>
                                <Textarea
                                    value={emailMessage}
                                    onChange={e => setEmailMessage(e.target.value)}
                                    placeholder="محتوى الرسالة..."
                                    rows={4}
                                />
                            </div>
                        </div>
                    )}
                    {!emailSent && (
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEmailDialog(false)}>إلغاء</Button>
                            <Button
                                onClick={handleSendEmail}
                                disabled={!emailSubject.trim() || !emailMessage.trim() || isPending}
                            >
                                {isPending && <Loader2 className="w-4 h-4 animate-spin ml-1" />}
                                إرسال
                            </Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
