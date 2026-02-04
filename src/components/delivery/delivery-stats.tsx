'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Delivery } from '@prisma/client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { CheckCircle, Clock, Truck } from 'lucide-react';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay } from 'date-fns';
import { ar } from 'date-fns/locale';

interface DeliveryStatsProps {
    deliveries: (Delivery & { order: { updatedAt: Date } })[];
    drivers: User[];
}

export function DeliveryStats({ deliveries, drivers }: DeliveryStatsProps) {
    const today = new Date();
    const start = startOfMonth(today);
    const end = endOfMonth(today);

    // Generate all days for the current month
    const days = eachDayOfInterval({ start, end });

    // Calculate daily stats
    const dailyStats = days.map(day => {
        const count = deliveries.filter(d =>
            d.status === 'DELIVERED' &&
            d.order?.updatedAt && // Use order timestamp
            isSameDay(new Date(d.order.updatedAt), day)
        ).length;

        return {
            name: format(day, 'd'), // Day number for X-Axis (e.g., "1", "2")
            fullDate: format(day, 'd MMMM', { locale: ar }), // For Tooltip
            count: count
        };
    });

    const totalDelivered = deliveries.filter(d => d.status === 'DELIVERED').length;
    const activeDeliveries = deliveries.filter(d => ['ASSIGNED', 'OUT_FOR_DELIVERY'].includes(d.status)).length;

    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">إجمالي التوصيلات المكتملة</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalDelivered}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">توصيلات جارية</CardTitle>
                        <Truck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{activeDeliveries}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">عدد السائقين النشطين</CardTitle>
                        <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{drivers.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>الأداء اليومي (توصيلات مكتملة)</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dailyStats} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `${value}`}
                                    allowDecimals={false} // Count should be integer
                                />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div className="bg-white p-2 border rounded shadow-sm">
                                                    <p className="font-bold mb-1 text-sm">{data.fullDate}</p>
                                                    <p className="text-sm text-green-600">
                                                        {data.count} توصيل
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#16a34a" // Green-600
                                    strokeWidth={3}
                                    activeDot={{ r: 6 }}
                                    dot={{ r: 3 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
