'use client';

import {
    Area,
    AreaChart,
    ResponsiveContainer,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useChartColors } from "@/hooks/use-chart-colors"
import { useFmt } from "@/contexts/number-locale-context"

interface RevenueChartProps {
    data: { date: string; amount: number }[]
}

export function RevenueChart({ data }: RevenueChartProps) {
    const fmt = useFmt();
    const colors = useChartColors();

    return (
        <Card className="col-span-4">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">الإيرادات بمرور الوقت</CardTitle>
            </CardHeader>
            <CardContent className="ps-0">
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={colors.primary} stopOpacity={0.2} />
                                    <stop offset="95%" stopColor={colors.primary} stopOpacity={0.02} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                                stroke={colors.border}
                            />
                            <XAxis
                                dataKey="date"
                                stroke={colors.muted}
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                dy={4}
                            />
                            <YAxis
                                stroke={colors.muted}
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                            />
                            <Tooltip
                                formatter={(value) => [`${fmt(Number(value ?? 0))} د.ع`, "الإيراد"]}
                                contentStyle={{
                                    backgroundColor: colors.tooltip.bg,
                                    border: `1px solid ${colors.tooltip.border}`,
                                    borderRadius: '10px',
                                    color: colors.tooltip.text,
                                    fontSize: '13px',
                                    fontFamily: 'var(--font-arabic)',
                                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                                    direction: 'rtl',
                                }}
                                labelStyle={{ color: colors.muted, marginBottom: '4px', fontSize: '12px' }}
                            />
                            <Area
                                type="monotone"
                                dataKey="amount"
                                stroke={colors.primary}
                                strokeWidth={2.5}
                                fill="url(#revenueGradient)"
                                dot={false}
                                activeDot={{ r: 5, fill: colors.primary, strokeWidth: 2, stroke: '#fff' }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
