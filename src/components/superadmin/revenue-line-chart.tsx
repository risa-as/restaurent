'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useFmt } from '@/contexts/number-locale-context';

interface DataPoint {
    month: string;
    revenue: number;
}

export default function RevenueLineChart({ data }: { data: DataPoint[] }) {
    const fmt = useFmt();
    if (data.every(d => d.revenue === 0)) {
        return (
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                لا توجد إيرادات مسجلة بعد
            </div>
        );
    }

    return (
        <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.1} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={v => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)}
                    />
                    <Tooltip
                        contentStyle={{ fontSize: 12, direction: 'rtl' }}
                        formatter={(value: any) => [fmt(value ?? 0) + ' د.ع', 'الإيرادات']}
                    />
                    <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#f97316"
                        strokeWidth={2.5}
                        dot={{ fill: '#f97316', r: 4 }}
                        activeDot={{ r: 6 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
