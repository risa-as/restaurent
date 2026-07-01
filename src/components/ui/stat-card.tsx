import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
    label: string;
    value: string | number;
    trend?: {
        value: number;
        direction: 'up' | 'down' | 'neutral';
    };
    icon?: LucideIcon;
    className?: string;
}

export function StatCard({ label, value, trend, icon: Icon, className }: StatCardProps) {
    const trendColor = trend?.direction === 'up'
        ? 'text-green-600'
        : trend?.direction === 'down'
            ? 'text-red-600'
            : 'text-muted-foreground';

    const TrendIcon = trend?.direction === 'up'
        ? TrendingUp
        : trend?.direction === 'down'
            ? TrendingDown
            : Minus;

    return (
        <div className={cn('bg-card border rounded-2xl p-5 shadow-sm space-y-3', className)}>
            <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{label}</p>
                {Icon && (
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="w-4 h-4 text-primary" />
                    </div>
                )}
            </div>
            <p className="text-2xl font-bold">{value}</p>
            {trend && (
                <div className={cn('flex items-center gap-1 text-xs font-medium', trendColor)}>
                    <TrendIcon className="w-3.5 h-3.5" />
                    <span>{Math.abs(trend.value)}%</span>
                    <span className="text-muted-foreground font-normal">مقارنة بالفترة السابقة</span>
                </div>
            )}
        </div>
    );
}
