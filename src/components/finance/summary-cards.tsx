'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown, TrendingUp, ShoppingBag, Receipt, Minus } from 'lucide-react';
import { FinancialStats } from '@/lib/actions/finance';
import { cn } from '@/lib/utils';
import { useFmt } from '@/contexts/number-locale-context';

function Delta({ current, previous }: { current: number; previous: number }) {
    if (previous === 0) return null;
    const pct = Math.round(((current - previous) / previous) * 100);
    const positive = pct >= 0;
    const Icon = pct === 0 ? Minus : positive ? TrendingUp : TrendingDown;
    return (
        <span className={cn(
            'inline-flex items-center gap-0.5 text-xs font-bold px-1.5 py-0.5 rounded-full',
            pct === 0
                ? 'bg-muted text-muted-foreground'
                : positive
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        )}>
            <Icon className="h-3 w-3" />
            {pct === 0 ? 'ثابت' : `${positive ? '+' : ''}${pct}%`}
        </span>
    );
}

export function SummaryCards({
    data,
    prev,
}: {
    data: FinancialStats;
    prev?: FinancialStats;
}) {
    const fmtNum = useFmt();
    const fmt = (n: number) => fmtNum(Math.round(n));
    const cards = [
        {
            label: 'إجمالي الإيرادات',
            value: data.revenue,
            prevValue: prev?.revenue,
            unit: 'د.ع',
            sub: `${data.transactionCount} عملية بيع`,
            icon: Receipt,
            valueClass: 'text-green-600',
            iconClass: 'text-green-600',
            bgClass: 'bg-green-50 dark:bg-green-950/30',
        },
        {
            label: 'تكلفة البضائع (COGS)',
            value: data.cogs,
            prevValue: prev?.cogs,
            unit: 'د.ع',
            sub: 'التكلفة التشغيلية للوجبات',
            icon: ShoppingBag,
            valueClass: 'text-amber-600',
            iconClass: 'text-amber-600',
            bgClass: 'bg-amber-50 dark:bg-amber-950/30',
            invertDelta: true,
        },
        {
            label: 'المصاريف',
            value: data.expenses,
            prevValue: prev?.expenses,
            unit: 'د.ع',
            sub: 'فواتير، رواتب، صيانة',
            icon: TrendingDown,
            valueClass: 'text-red-600',
            iconClass: 'text-red-600',
            bgClass: 'bg-red-50 dark:bg-red-950/30',
            invertDelta: true,
        },
        {
            label: 'صافي الربح',
            value: data.netProfit,
            prevValue: prev?.netProfit,
            unit: 'د.ع',
            sub: 'الإيرادات − التكاليف والمصاريف',
            icon: TrendingUp,
            valueClass: data.netProfit >= 0 ? 'text-blue-600' : 'text-red-600',
            iconClass: data.netProfit >= 0 ? 'text-blue-600' : 'text-red-600',
            bgClass: data.netProfit >= 0 ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-red-50 dark:bg-red-950/30',
        },
    ];

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {cards.map(card => (
                <Card key={card.label} className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
                        <div className={cn('p-1.5 rounded-lg', card.bgClass)}>
                            <card.icon className={cn('h-4 w-4', card.iconClass)} />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className={cn('text-2xl font-black', card.valueClass)}>
                            {fmt(card.value)} <span className="text-sm font-normal text-muted-foreground">{card.unit}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                            <p className="text-xs text-muted-foreground">{card.sub}</p>
                            {prev && card.prevValue !== undefined && (
                                <Delta
                                    current={card.invertDelta ? -card.value : card.value}
                                    previous={card.invertDelta ? -card.prevValue : card.prevValue}
                                />
                            )}
                        </div>
                        {prev && card.prevValue !== undefined && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                الفترة السابقة: {fmt(card.prevValue)} {card.unit}
                            </p>
                        )}
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
