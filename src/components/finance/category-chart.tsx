'use client';

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface CategoryChartProps {
    data: { name: string; value: number }[]
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function CategoryChart({ data }: CategoryChartProps) {
    return (
        <Card className="col-span-4 lg:col-span-2">
            <CardHeader>
                <CardTitle>المبيعات حسب القسم</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-[350px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => [`${value} د.ع`, 'المبيعات']} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
