'use client';

import Link from 'next/link';
import { Lock, Zap, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PLAN_LABELS: Record<string, string> = {
    TRIAL: 'التجريبية',
    BASIC: 'الأساسية',
    PRO: 'الاحترافية',
    ENTERPRISE: 'المؤسسات',
};

const PLAN_COLORS: Record<string, { bg: string; text: string; badge: string }> = {
    TRIAL: { bg: 'from-slate-400 to-slate-600', text: 'text-slate-600', badge: 'bg-slate-100 text-slate-700' },
    BASIC: { bg: 'from-blue-400 to-blue-600', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700' },
    PRO: { bg: 'from-purple-500 to-purple-700', text: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' },
    ENTERPRISE: { bg: 'from-amber-400 to-orange-500', text: 'text-amber-600', badge: 'bg-amber-100 text-amber-700' },
};

interface PlanUpgradePromptProps {
    feature: string;
    requiredPlan: string;
    description?: string;
    className?: string;
}

export function PlanUpgradePrompt({
    feature,
    requiredPlan,
    description,
    className = '',
}: PlanUpgradePromptProps) {
    const planLabel = PLAN_LABELS[requiredPlan] || requiredPlan;
    const colors = PLAN_COLORS[requiredPlan] || PLAN_COLORS.PRO;

    return (
        <div className={`flex items-center justify-center min-h-[320px] p-6 ${className}`} dir="rtl">
            <div className="max-w-md w-full text-center space-y-6">
                {/* Icon */}
                <div className="flex justify-center">
                    <div className={`relative w-20 h-20 rounded-3xl bg-gradient-to-br ${colors.bg} shadow-lg flex items-center justify-center`}>
                        <Lock className="w-9 h-9 text-white" />
                        <div className="absolute -top-2 -left-2">
                            <span className={`text-[10px] font-black px-2 py-1 rounded-full ${colors.badge}`}>
                                {requiredPlan}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Text */}
                <div className="space-y-2">
                    <h3 className="font-bold text-xl">{feature} غير متاح</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {description ||
                            `هذه الميزة متاحة فقط في خطة ${planLabel} أو أعلى. قم بترقية اشتراكك للاستفادة من ${feature}.`}
                    </p>
                </div>

                {/* Plan badge */}
                <div className="flex items-center justify-center gap-2">
                    <Zap className={`w-4 h-4 ${colors.text}`} />
                    <span className="text-sm font-medium">
                        يتطلب خطة <span className={`font-bold ${colors.text}`}>{planLabel}</span>
                    </span>
                </div>

                {/* CTA */}
                <Button asChild size="lg" className={`w-full gap-2 bg-gradient-to-r ${colors.bg} text-white border-0 hover:opacity-90`}>
                    <Link href="/dashboard/billing">
                        <ArrowLeft className="w-4 h-4" />
                        ترقية إلى {planLabel}
                    </Link>
                </Button>

                <p className="text-xs text-muted-foreground">
                    يمكنك مراجعة خطط الاشتراك المتاحة في صفحة الفوترة
                </p>
            </div>
        </div>
    );
}
