'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    AlertTriangle, CheckCircle2, Star, Package, Clock,
    TrendingDown, ShoppingBag, MessageSquare, ChevronRight, ChevronLeft, Lock,
} from 'lucide-react';
import type { SmartAlerts } from '@/lib/actions/alerts';
import { useFmt, useDateFmt, useDateTimeFmt } from '@/contexts/number-locale-context';
import { cn } from '@/lib/utils';

interface Props { data: SmartAlerts }

type Severity = 'red' | 'amber' | 'blue' | 'green';

const SEV: Record<Severity, { chip: string; bar: string; badge: string }> = {
    red: {
        chip: 'bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400',
        bar: 'bg-red-500',
        badge: 'bg-red-600 text-white',
    },
    amber: {
        chip: 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
        bar: 'bg-amber-500',
        badge: 'bg-amber-500 text-white',
    },
    blue: {
        chip: 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
        bar: 'bg-blue-500',
        badge: 'bg-blue-600 text-white',
    },
    green: {
        chip: 'bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400',
        bar: 'bg-green-500',
        badge: 'bg-green-600 text-white',
    },
};

function AlertSection({
    title, icon: Icon, count, color, children, href,
}: {
    title: string; icon: React.ElementType; count: number;
    color: Severity; children?: React.ReactNode; href?: string;
}) {
    const [open, setOpen] = useState(count > 0);
    const active = count > 0;
    const c = SEV[color];
    const expandable = Boolean(children && active);

    return (
        <div className="relative rounded-2xl border bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md">
            {/* Severity accent bar — start side (right in RTL) */}
            {active && <span className={cn('absolute inset-y-0 right-0 w-1', c.bar)} />}

            <div className="flex items-center gap-3 px-4 py-3.5">
                <button
                    type="button"
                    className={cn(
                        'flex flex-1 items-center gap-3 text-right min-w-0',
                        expandable ? 'cursor-pointer' : 'cursor-default',
                    )}
                    onClick={() => expandable && setOpen(v => !v)}
                    aria-expanded={expandable ? open : undefined}
                >
                    <span className={cn(
                        'grid place-items-center h-10 w-10 rounded-xl shrink-0',
                        active ? c.chip : 'bg-muted text-muted-foreground',
                    )}>
                        <Icon className="h-5 w-5" />
                    </span>
                    <span className="flex-1 font-semibold text-sm truncate">{title}</span>

                    {active ? (
                        <span className={cn('text-xs font-black px-2.5 py-0.5 rounded-full shrink-0', c.badge)}>
                            {count}
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400 shrink-0">
                            <CheckCircle2 className="h-4 w-4" /> سليم
                        </span>
                    )}

                    {expandable && (
                        <ChevronLeft className={cn('h-4 w-4 text-muted-foreground shrink-0 transition-transform', open && '-rotate-90')} />
                    )}
                </button>

                {href && active && (
                    <Link
                        href={href}
                        className="text-xs font-medium text-primary hover:underline underline-offset-2 shrink-0"
                    >
                        عرض الكل
                    </Link>
                )}
            </div>

            {open && expandable && (
                <div className="border-t bg-muted/30 px-3 py-3 space-y-1.5">
                    {children}
                </div>
            )}
        </div>
    );
}

function Row({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between gap-3 rounded-xl border bg-card px-3 py-2.5 text-sm">
            {children}
        </div>
    );
}

export function SmartAlertsDashboard({ data }: Props) {
    const fmt = useFmt();
    const dateFmt = useDateFmt();
    const dtFmt = useDateTimeFmt();
    const totalAlerts = data.lowStock.length + data.lowRatingFeedback.length
        + data.openShifts.length + data.shiftsWithVariance.length;
    const allClear = totalAlerts === 0;

    return (
        <div className="space-y-5" dir="rtl">
            {/* Status hero */}
            <div className="rounded-2xl border bg-card shadow-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <span className={cn(
                    'grid place-items-center h-12 w-12 rounded-2xl shrink-0',
                    allClear
                        ? 'bg-green-100 text-green-600 dark:bg-green-950/40 dark:text-green-400'
                        : 'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
                )}>
                    {allClear ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
                </span>

                <div className="min-w-0">
                    <p className="font-black text-lg leading-tight">
                        {allClear ? 'كل شيء على ما يرام!' : `${fmt(totalAlerts)} تنبيه يحتاج اهتمام`}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        <span suppressHydrationWarning>آخر تحديث: {dtFmt(data.generatedAt)}</span>
                    </p>
                </div>

                <div className="sm:mr-auto flex flex-wrap gap-2">
                    {data.openOrdersCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300 border border-blue-200 dark:border-blue-900 px-3 py-1.5 rounded-full font-medium">
                            <ShoppingBag className="h-3.5 w-3.5" />
                            {fmt(data.openOrdersCount)} طلب مفتوح
                        </span>
                    )}
                    {data.unansweredLowRatings > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-xs bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300 border border-red-200 dark:border-red-900 px-3 py-1.5 rounded-full font-medium">
                            <MessageSquare className="h-3.5 w-3.5" />
                            {fmt(data.unansweredLowRatings)} تقييم بدون رد
                        </span>
                    )}
                </div>
            </div>

            {/* Upgrade hints for locked sections */}
            {(!data.hasInventory || !data.hasAdvancedReports) && (
                <div className="grid sm:grid-cols-2 gap-3">
                    {!data.hasInventory && (
                        <Link href="/dashboard/billing" className="flex items-center gap-2 rounded-2xl border border-dashed border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/20 px-4 py-3 text-sm text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-950/40 transition-colors">
                            <Lock className="h-4 w-4 shrink-0" />
                            <span>تنبيهات المخزون متاحة في خطة <strong>PRO</strong></span>
                        </Link>
                    )}
                    {!data.hasAdvancedReports && (
                        <Link href="/dashboard/billing" className="flex items-center gap-2 rounded-2xl border border-dashed border-purple-300 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/20 px-4 py-3 text-sm text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-950/40 transition-colors">
                            <Lock className="h-4 w-4 shrink-0" />
                            <span>تنبيهات التناقضات المالية متاحة في خطة <strong>PRO</strong></span>
                        </Link>
                    )}
                </div>
            )}

            {/* Alert sections */}
            <div className="space-y-3">
                {/* Low stock */}
                <AlertSection
                    title="مواد منخفضة المخزون"
                    icon={Package}
                    count={data.lowStock.length}
                    color="red"
                    href="/inventory/stock"
                >
                    {data.lowStock.slice(0, 8).map(m => (
                        <Row key={m.id}>
                            <span className="truncate">{m.name}</span>
                            <span className="font-mono text-red-500 font-bold shrink-0">
                                {fmt(m.currentStock)} / {fmt(m.minStockLevel)} {m.unit}
                            </span>
                        </Row>
                    ))}
                    {data.lowStock.length > 8 && (
                        <p className="text-xs text-muted-foreground px-1 pt-0.5">
                            و {fmt(data.lowStock.length - 8)} مادة أخرى...
                        </p>
                    )}
                </AlertSection>

                {/* Low rating feedback */}
                <AlertSection
                    title="تقييمات منخفضة (آخر 7 أيام)"
                    icon={Star}
                    count={data.lowRatingFeedback.length}
                    color="amber"
                    href="/dashboard/feedback"
                >
                    {data.lowRatingFeedback.map(f => (
                        <Row key={f.id}>
                            <div className="flex items-start gap-2.5 min-w-0">
                                <span className="shrink-0 font-black text-amber-500">{fmt(f.rating)}★</span>
                                <div className="min-w-0">
                                    <p className="font-medium truncate">
                                        {(f.order?.customer as any)?.name ?? 'عميل غير مسجل'} — طلب #{f.order?.orderNumber}
                                    </p>
                                    {f.comment && <p className="text-xs text-muted-foreground truncate">{f.comment}</p>}
                                </div>
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0">
                                <span suppressHydrationWarning>{dateFmt(f.createdAt)}</span>
                            </span>
                        </Row>
                    ))}
                </AlertSection>

                {/* Open shifts */}
                <AlertSection
                    title="ورديات مفتوحة"
                    icon={Clock}
                    count={data.openShifts.length}
                    color="blue"
                    href="/dashboard/accountant/cashier"
                >
                    {data.openShifts.map(s => (
                        <Row key={s.id}>
                            <span className="truncate">{(s.cashier as any).name ?? (s.cashier as any).email}</span>
                            <span className="text-xs text-muted-foreground shrink-0">
                                <span suppressHydrationWarning>مفتوحة منذ {dtFmt(s.openedAt)}</span>
                            </span>
                        </Row>
                    ))}
                </AlertSection>

                {/* Shifts with cash variance */}
                <AlertSection
                    title="ورديات بها فروقات نقدية (آخر 7 أيام)"
                    icon={TrendingDown}
                    count={data.shiftsWithVariance.length}
                    color="amber"
                    href="/dashboard/accountant/discrepancies"
                >
                    {data.shiftsWithVariance.map(s => (
                        <Row key={s.id}>
                            <span className="truncate">{(s.cashier as any).name ?? (s.cashier as any).email}</span>
                            <span className={cn(
                                'font-mono font-bold shrink-0',
                                (s.cashVariance ?? 0) < 0 ? 'text-red-500' : 'text-amber-600',
                            )}>
                                {(s.cashVariance ?? 0) >= 0 ? '+' : ''}{fmt(Math.round(s.cashVariance ?? 0))} د.ع
                            </span>
                        </Row>
                    ))}
                </AlertSection>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'التقييمات', href: '/dashboard/feedback', icon: Star },
                    { label: 'التناقضات', href: '/dashboard/accountant/discrepancies', icon: TrendingDown },
                    { label: 'المخزون', href: '/inventory/stock', icon: Package },
                    { label: 'الورديات', href: '/dashboard/accountant/cashier', icon: Clock },
                ].map(link => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className="flex items-center gap-2.5 rounded-2xl border bg-card shadow-sm px-3.5 py-3 text-sm font-medium hover:shadow-md hover:bg-muted/30 transition-all"
                    >
                        <span className="grid place-items-center h-8 w-8 rounded-lg bg-muted text-muted-foreground shrink-0">
                            <link.icon className="h-4 w-4" />
                        </span>
                        <span className="truncate">{link.label}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground mr-auto shrink-0" />
                    </Link>
                ))}
            </div>
        </div>
    );
}
