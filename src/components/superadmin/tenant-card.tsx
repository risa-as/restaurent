'use client';

import { useState, useTransition } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
    ShieldAlert, ShieldCheck, Mail, Globe, Calendar,
    ShoppingBag, Users, UtensilsCrossed, ChevronLeft,
    Loader2, Bot, Clock, CheckCircle2, RefreshCw, CalendarCheck,
} from 'lucide-react';
import { toggleTenantStatus, sendEmailToTenantAdmin, manuallyExtendTenant } from '@/lib/actions/superadmin';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { TenantData } from '@/app/superadmin/tenants/tenants-client';

const PLAN_CONFIG: Record<string, { label: string; className: string }> = {
    TRIAL: { label: 'تجريبي', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
    BASIC: { label: 'أساسي', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    PRO: { label: 'متقدم', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' },
    ENTERPRISE: { label: 'مؤسسي', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
};

const STATUS_CONFIG: Record<string, { label: string; bar: string; dot: string }> = {
    TRIAL:    { label: 'تجريبي', bar: 'bg-blue-400',   dot: 'bg-blue-400' },
    ACTIVE:   { label: 'نشط',    bar: 'bg-emerald-500', dot: 'bg-emerald-500' },
    PAST_DUE: { label: 'متأخر',  bar: 'bg-red-500',    dot: 'bg-red-500' },
    CANCELED: { label: 'ملغي',   bar: 'bg-slate-400',  dot: 'bg-slate-400' },
    PAUSED:   { label: 'موقوف',  bar: 'bg-yellow-400', dot: 'bg-yellow-400' },
};

type ExpiryInfo = {
    dateStr: string;      // "١٥/٦/٢٠٢٦"
    days: number;         // negative = expired
    badge: string;        // short label shown in pill
    level: 'expired' | 'critical' | 'warning' | 'ok';
    typeLabel: string;    // "نهاية التجربة" | "انتهاء الاشتراك"
};

function getExpiryInfo(tenant: TenantData): ExpiryInfo | null {
    const raw = tenant.subscriptionStatus === 'TRIAL'
        ? tenant.trialEndsAt
        : tenant.currentPeriodEnd;
    if (!raw) return null;

    const days = Math.ceil((new Date(raw).getTime() - Date.now()) / 86400000);
    const dateStr = new Date(raw).toLocaleDateString('ar-SA');
    const typeLabel = tenant.subscriptionStatus === 'TRIAL' ? 'نهاية التجربة' : 'انتهاء الاشتراك';

    let badge: string;
    let level: ExpiryInfo['level'];

    if (days < 0)       { badge = 'منتهي';            level = 'expired'; }
    else if (days === 0){ badge = 'اليوم';             level = 'critical'; }
    else if (days <= 3) { badge = `${days} أيام`;      level = 'critical'; }
    else if (days <= 14){ badge = `${days} يوم`;       level = 'warning'; }
    else                { badge = `${days} يوم`;       level = 'ok'; }

    return { dateStr, days, badge, level, typeLabel };
}

export default function TenantCard({
    tenant,
    viewMode = 'grid',
}: {
    tenant: TenantData;
    viewMode?: 'grid' | 'list';
}) {
    const [isPending, startTransition] = useTransition();
    const [isActive, setIsActive] = useState(tenant.isActive);
    const [emailDialog, setEmailDialog] = useState(false);
    const [emailSubject, setEmailSubject] = useState('');
    const [emailMessage, setEmailMessage] = useState('');
    const [emailSent, setEmailSent] = useState(false);
    const [renewDialog, setRenewDialog] = useState(false);
    const [renewMonths, setRenewMonths] = useState<number | null>(null);
    const [renewAmount, setRenewAmount] = useState('');
    const [renewDone, setRenewDone] = useState(false);

    const plan = PLAN_CONFIG[tenant.plan] ?? PLAN_CONFIG.BASIC;
    const status = STATUS_CONFIG[tenant.subscriptionStatus] ?? STATUS_CONFIG.PAUSED;
    const expiry = getExpiryInfo(tenant);

    function handleToggleStatus() {
        startTransition(async () => {
            await toggleTenantStatus(tenant.id, !isActive);
            setIsActive(v => !v);
        });
    }

    function previewRenewalDate(months: number): string {
        const base = tenant.currentPeriodEnd && new Date(tenant.currentPeriodEnd) > new Date()
            ? new Date(tenant.currentPeriodEnd)
            : new Date();
        const result = new Date(base.getTime() + months * 30 * 24 * 60 * 60 * 1000);
        return result.toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
    }

    function handleRenew() {
        if (!renewMonths) return;
        const amount = Math.max(0, parseInt(renewAmount) || 0);
        startTransition(async () => {
            await manuallyExtendTenant(tenant.id, renewMonths, amount);
            setRenewDone(true);
            setTimeout(() => {
                setRenewDialog(false);
                setRenewMonths(null);
                setRenewAmount('');
                setRenewDone(false);
            }, 1500);
        });
    }

    function handleSendEmail() {
        if (!emailSubject.trim() || !emailMessage.trim()) return;
        startTransition(async () => {
            await sendEmailToTenantAdmin(tenant.id, emailSubject, emailMessage);
            setEmailSent(true);
            setTimeout(() => {
                setEmailDialog(false);
                setEmailSent(false);
                setEmailSubject('');
                setEmailMessage('');
            }, 1500);
        });
    }

    if (viewMode === 'list') {
        return (
            <>
                <div className={cn(
                    'relative flex items-center gap-4 bg-card border rounded-xl px-4 py-3 transition-all hover:shadow-md',
                    !isActive && 'opacity-60',
                )}>
                    {/* Status bar */}
                    <div className={cn('absolute right-0 top-3 bottom-3 w-1 rounded-full', isActive ? status.bar : 'bg-red-400')} />

                    {/* Name + badges */}
                    <div className="flex-1 min-w-0 pr-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <Link href={`/superadmin/tenants/${tenant.id}`} className="font-semibold hover:text-primary truncate">
                                {tenant.name}
                            </Link>
                            <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-semibold', plan.className)}>
                                {plan.label}
                            </span>
                            {!isActive && (
                                <span className="text-[11px] px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                                    موقوف
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Globe className="w-3 h-3" />{tenant.slug}
                            </span>
                            <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />{tenant.adminEmail}
                            </span>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <ShoppingBag className="w-3.5 h-3.5 text-orange-400" />{tenant.ordersCount}
                        </span>
                        <span className="flex items-center gap-1">
                            <UtensilsCrossed className="w-3.5 h-3.5 text-blue-400" />{tenant.menuItemsCount}
                        </span>
                        <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-purple-400" />{tenant.usersCount}
                        </span>
                    </div>

                    {/* Expiry */}
                    {expiry && (
                        <div className={cn(
                            'hidden lg:flex flex-col items-center px-3 py-1.5 rounded-xl text-center shrink-0 min-w-[80px]',
                            expiry.level === 'expired'  ? 'bg-red-50 dark:bg-red-950/30' :
                            expiry.level === 'critical' ? 'bg-red-50 dark:bg-red-950/30' :
                            expiry.level === 'warning'  ? 'bg-amber-50 dark:bg-amber-950/30' :
                                                          'bg-muted/40',
                        )}>
                            <p className={cn('text-xs font-bold',
                                expiry.level === 'expired' || expiry.level === 'critical' ? 'text-red-600 dark:text-red-400' :
                                expiry.level === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-foreground',
                            )}>
                                {expiry.days < 0 ? 'منتهي' : expiry.badge}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{expiry.dateStr}</p>
                        </div>
                    )}

                    {/* AI limit */}
                    <div className="hidden sm:block">
                        {tenant.aiDailyLimit > 0 ? (
                            <span className="text-[11px] px-2 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 font-medium flex items-center gap-1">
                                <Bot className="w-3 h-3" />{tenant.aiDailyLimit}/يوم
                            </span>
                        ) : (
                            <span className="text-[11px] px-2 py-1 rounded-full bg-muted text-muted-foreground font-medium flex items-center gap-1">
                                <Bot className="w-3 h-3" />غير محدود
                            </span>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 w-8 p-0 text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-950/30"
                            onClick={() => setRenewDialog(true)}
                            disabled={isPending}
                            title="تجديد الاشتراك"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                            variant={isActive ? 'destructive' : 'default'}
                            size="sm"
                            className="h-8 px-3 text-xs"
                            onClick={handleToggleStatus}
                            disabled={isPending}
                        >
                            {isPending
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : isActive ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => setEmailDialog(true)} disabled={isPending}>
                            <Mail className="w-3.5 h-3.5" />
                        </Button>
                        <Link href={`/superadmin/tenants/${tenant.id}`}>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </Button>
                        </Link>
                    </div>
                </div>

                <RenewalDialog
                    open={renewDialog}
                    onOpenChange={v => { setRenewDialog(v); if (!v) { setRenewMonths(null); setRenewAmount(''); setRenewDone(false); } }}
                    tenantName={tenant.name}
                    renewMonths={renewMonths}
                    setRenewMonths={setRenewMonths}
                    renewAmount={renewAmount}
                    setRenewAmount={setRenewAmount}
                    renewDone={renewDone}
                    onRenew={handleRenew}
                    previewRenewalDate={previewRenewalDate}
                    isPending={isPending}
                />

                <EmailDialog
                    open={emailDialog}
                    onOpenChange={setEmailDialog}
                    adminEmail={tenant.adminEmail}
                    emailSubject={emailSubject}
                    setEmailSubject={setEmailSubject}
                    emailMessage={emailMessage}
                    setEmailMessage={setEmailMessage}
                    emailSent={emailSent}
                    onSend={handleSendEmail}
                    isPending={isPending}
                />
            </>
        );
    }

    // ─── Grid card ─────────────────────────────────────────────────────────────
    return (
        <>
            <div className={cn(
                'relative flex flex-col bg-card border rounded-2xl overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5',
                !isActive && 'opacity-70',
            )}>
                {/* Top accent bar */}
                <div className={cn('h-1.5 w-full', isActive ? status.bar : 'bg-red-400')} />

                {/* Header */}
                <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <Link href={`/superadmin/tenants/${tenant.id}`} className="group flex items-center gap-1">
                            <span className="font-bold text-base truncate group-hover:text-primary transition-colors">
                                {tenant.name}
                            </span>
                            <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        </Link>
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                            <Globe className="w-3 h-3 shrink-0" />
                            <span className="truncate">{tenant.slug}</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-bold', plan.className)}>
                            {plan.label}
                        </span>
                        <div className="flex items-center gap-1">
                            <span className={cn('w-1.5 h-1.5 rounded-full', isActive ? status.dot : 'bg-red-400')} />
                            <span className="text-[11px] text-muted-foreground">
                                {isActive ? status.label : 'موقوف'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Admin + join date */}
                <div className="px-4 pb-3 space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5 truncate">
                        <Mail className="w-3 h-3 shrink-0" />
                        <span className="truncate">{tenant.adminName} — {tenant.adminEmail}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 shrink-0" />
                        انضم {new Date(tenant.createdAt).toLocaleDateString('ar-SA')}
                    </div>
                </div>

                {/* Expiry banner */}
                {expiry ? (
                    <div className={cn(
                        'mx-4 mb-3 flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl',
                        expiry.level === 'expired'  ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800' :
                        expiry.level === 'critical' ? 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800' :
                        expiry.level === 'warning'  ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800' :
                                                      'bg-muted/40 border border-border',
                    )}>
                        <div className="flex items-center gap-2">
                            <Clock className={cn('w-3.5 h-3.5 shrink-0',
                                expiry.level === 'expired' || expiry.level === 'critical' ? 'text-red-500' :
                                expiry.level === 'warning' ? 'text-amber-500' : 'text-muted-foreground',
                            )} />
                            <div>
                                <p className={cn('text-xs font-semibold leading-none',
                                    expiry.level === 'expired' || expiry.level === 'critical' ? 'text-red-700 dark:text-red-400' :
                                    expiry.level === 'warning' ? 'text-amber-700 dark:text-amber-400' : 'text-foreground',
                                )}>
                                    {expiry.typeLabel}
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{expiry.dateStr}</p>
                            </div>
                        </div>
                        <span className={cn(
                            'text-xs font-bold px-2 py-0.5 rounded-full shrink-0',
                            expiry.level === 'expired'  ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                            expiry.level === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                            expiry.level === 'warning'  ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' :
                                                          'bg-muted text-muted-foreground',
                        )}>
                            {expiry.days < 0 ? 'منتهي' : expiry.days === 0 ? 'اليوم' : `${expiry.badge} متبقي`}
                        </span>
                    </div>
                ) : (
                    <div className="mx-4 mb-3 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/30 border border-dashed text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        لا يوجد تاريخ انتهاء محدد
                    </div>
                )}

                {/* Stats */}
                <div className="mx-4 mb-3 grid grid-cols-3 divide-x divide-x-reverse divide-border border rounded-xl overflow-hidden text-center">
                    {[
                        { icon: ShoppingBag, value: tenant.ordersCount, label: 'طلب', color: 'text-orange-500' },
                        { icon: UtensilsCrossed, value: tenant.menuItemsCount, label: 'صنف', color: 'text-blue-500' },
                        { icon: Users, value: tenant.usersCount, label: 'موظف', color: 'text-purple-500' },
                    ].map(({ icon: Icon, value, label, color }) => (
                        <div key={label} className="py-2.5 bg-muted/30">
                            <Icon className={cn('w-4 h-4 mx-auto mb-0.5', color)} />
                            <p className="text-sm font-bold leading-none">{value}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                        </div>
                    ))}
                </div>

                {/* AI daily limit */}
                <div className="mx-4 mb-4">
                    {tenant.aiDailyLimit > 0 ? (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                                <Bot className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">المساعد الذكي</p>
                                <p className="text-[11px] text-amber-600 dark:text-amber-400">
                                    حد {tenant.aiDailyLimit} محادثة يومياً
                                </p>
                            </div>
                            <span className="text-lg font-bold text-amber-700 dark:text-amber-300 shrink-0">
                                {tenant.aiDailyLimit}
                            </span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 border border-dashed">
                            <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                <Bot className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-medium text-muted-foreground">المساعد الذكي</p>
                                <p className="text-[11px] text-muted-foreground/70">غير محدود</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Service mode badge */}
                <div className="px-4 pb-3">
                    <span className={cn(
                        'inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-medium',
                        tenant.serviceMode === 'TABLE_SERVICE'
                            ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-300'
                            : 'bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300',
                    )}>
                        {tenant.serviceMode === 'TABLE_SERVICE' ? '🪑 خدمة طاولات' : '⚡ خدمة سريعة'}
                    </span>
                </div>

                {/* Footer actions */}
                <div className="border-t bg-muted/20 px-3 py-2.5 flex gap-2 mt-auto">
                    <Link href={`/superadmin/tenants/${tenant.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full h-8 text-xs gap-1.5">
                            <ChevronLeft className="w-3.5 h-3.5" />
                            التفاصيل
                        </Button>
                    </Link>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 shrink-0 gap-1.5 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:text-emerald-400 dark:border-emerald-700 dark:hover:bg-emerald-950/30"
                        onClick={() => setRenewDialog(true)}
                        disabled={isPending}
                        title="تجديد الاشتراك"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        تجديد
                    </Button>
                    <Button
                        variant={isActive ? 'destructive' : 'default'}
                        size="sm"
                        className="h-8 w-8 p-0 shrink-0"
                        onClick={handleToggleStatus}
                        disabled={isPending}
                        title={isActive ? 'إيقاف المطعم' : 'تفعيل المطعم'}
                    >
                        {isPending
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : isActive
                                ? <ShieldAlert className="w-3.5 h-3.5" />
                                : <ShieldCheck className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 w-8 p-0 shrink-0"
                        onClick={() => setEmailDialog(true)}
                        disabled={isPending}
                        title="إرسال بريد للمدير"
                    >
                        <Mail className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            <RenewalDialog
                open={renewDialog}
                onOpenChange={v => { setRenewDialog(v); if (!v) { setRenewMonths(null); setRenewAmount(''); setRenewDone(false); } }}
                tenantName={tenant.name}
                renewMonths={renewMonths}
                setRenewMonths={setRenewMonths}
                renewAmount={renewAmount}
                setRenewAmount={setRenewAmount}
                renewDone={renewDone}
                onRenew={handleRenew}
                previewRenewalDate={previewRenewalDate}
                isPending={isPending}
            />

            <EmailDialog
                open={emailDialog}
                onOpenChange={setEmailDialog}
                adminEmail={tenant.adminEmail}
                emailSubject={emailSubject}
                setEmailSubject={setEmailSubject}
                emailMessage={emailMessage}
                setEmailMessage={setEmailMessage}
                emailSent={emailSent}
                onSend={handleSendEmail}
                isPending={isPending}
            />
        </>
    );
}

const RENEWAL_OPTIONS = [
    { months: 1,  label: 'شهر واحد' },
    { months: 3,  label: '3 أشهر' },
    { months: 6,  label: '6 أشهر' },
    { months: 12, label: 'سنة كاملة' },
] as const;

function RenewalDialog({
    open, onOpenChange, tenantName,
    renewMonths, setRenewMonths,
    renewAmount, setRenewAmount,
    renewDone, onRenew, previewRenewalDate, isPending,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    tenantName: string;
    renewMonths: number | null;
    setRenewMonths: (v: number | null) => void;
    renewAmount: string;
    setRenewAmount: (v: string) => void;
    renewDone: boolean;
    onRenew: () => void;
    previewRenewalDate: (months: number) => string;
    isPending: boolean;
}) {
    const [customMonths, setCustomMonths] = useState('');
    const amountNum = Math.max(0, parseInt(renewAmount) || 0);
    const customVal = Math.max(1, parseInt(customMonths) || 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent dir="rtl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-emerald-500" />
                        تجديد الاشتراك
                    </DialogTitle>
                    <DialogDescription>{tenantName}</DialogDescription>
                </DialogHeader>
                {renewDone ? (
                    <div className="py-6 flex flex-col items-center gap-2 text-emerald-600">
                        <CheckCircle2 className="w-10 h-10" />
                        <p className="font-semibold">تم تجديد الاشتراك بنجاح</p>
                    </div>
                ) : renewMonths ? (
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
                ) : (
                    <div className="space-y-3 py-1">
                        <div className="grid grid-cols-2 gap-2">
                            {RENEWAL_OPTIONS.map(({ months, label }) => (
                                <button
                                    key={months}
                                    onClick={() => setRenewMonths(months)}
                                    className={cn(
                                        'flex flex-col items-center justify-center gap-0.5 rounded-xl border py-3 text-sm font-semibold',
                                        'transition-colors hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30',
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
                            <span className="text-xs text-muted-foreground">أو أدخل عدداً مخصصاً</span>
                            <div className="flex-1 h-px bg-border" />
                        </div>
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                min={1}
                                value={customMonths}
                                onChange={e => setCustomMonths(e.target.value)}
                                placeholder="عدد الأشهر"
                                className="h-9 text-sm"
                                onKeyDown={e => { if (e.key === 'Enter' && customVal >= 1) setRenewMonths(customVal); }}
                            />
                            <Button
                                size="sm"
                                className="h-9 px-4 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
                                disabled={!customMonths || customVal < 1}
                                onClick={() => setRenewMonths(customVal)}
                            >
                                اختر
                            </Button>
                        </div>
                        {customMonths && customVal >= 1 && (
                            <p className="text-[11px] text-muted-foreground text-center">
                                {customVal} {customVal === 1 ? 'شهر' : 'أشهر'} — حتى {previewRenewalDate(customVal)}
                            </p>
                        )}
                    </div>
                )}
                {!renewDone && renewMonths && (
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRenewMonths(null)} disabled={isPending}>
                            رجوع
                        </Button>
                        <Button
                            onClick={onRenew}
                            disabled={isPending}
                            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {isPending
                                ? <Loader2 className="w-4 h-4 animate-spin" />
                                : <RefreshCw className="w-4 h-4" />}
                            تأكيد التجديد
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}

// ─── Shared email dialog ──────────────────────────────────────────────────────

function EmailDialog({
    open, onOpenChange, adminEmail,
    emailSubject, setEmailSubject,
    emailMessage, setEmailMessage,
    emailSent, onSend, isPending,
}: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    adminEmail: string;
    emailSubject: string;
    setEmailSubject: (v: string) => void;
    emailMessage: string;
    setEmailMessage: (v: string) => void;
    emailSent: boolean;
    onSend: () => void;
    isPending: boolean;
}) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent dir="rtl">
                <DialogHeader>
                    <DialogTitle>إرسال بريد إلكتروني</DialogTitle>
                    <DialogDescription>إلى: {adminEmail}</DialogDescription>
                </DialogHeader>
                {emailSent ? (
                    <div className="py-6 flex flex-col items-center gap-2 text-green-600">
                        <CheckCircle2 className="w-10 h-10" />
                        <p className="font-semibold">تم إرسال البريد بنجاح</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="space-y-1.5">
                            <Label>الموضوع</Label>
                            <Input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="موضوع الرسالة" />
                        </div>
                        <div className="space-y-1.5">
                            <Label>الرسالة</Label>
                            <Textarea value={emailMessage} onChange={e => setEmailMessage(e.target.value)} placeholder="محتوى الرسالة..." rows={4} />
                        </div>
                    </div>
                )}
                {!emailSent && (
                    <DialogFooter>
                        <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
                        <Button
                            onClick={onSend}
                            disabled={!emailSubject.trim() || !emailMessage.trim() || isPending}
                        >
                            {isPending ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : null}
                            إرسال
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
