'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useChartColors } from "@/hooks/use-chart-colors"
import { useFmt } from "@/contexts/number-locale-context"

interface CategoryChartProps {
    data: { name: string; value: number }[]
}

export function CategoryChart({ data }: CategoryChartProps) {
    const fmt = useFmt();
    const colors = useChartColors();

    return (
        <Card className="col-span-4 lg:col-span-2">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">المبيعات حسب القسم</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="44%"
                                innerRadius={80}
                                outerRadius={110}
                                paddingAngle={3}
                                dataKey="value"
                                strokeWidth={0}
                            >
                                {data.map((_entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={colors.all[index % colors.all.length]}
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                formatter={(value) => [`${fmt(Number(value ?? 0))} د.ع`, "المبيعات"]}
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
                            />
                            <Legend
                                iconType="circle"
                                iconSize={8}
                                wrapperStyle={{
                                    fontSize: '12px',
                                    paddingTop: '10px',
                                    fontFamily: 'var(--font-arabic)',
                                    direction: 'rtl',
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
