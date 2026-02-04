'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, AlertTriangle, TrendingDown, DollarSign } from 'lucide-react';

interface InventoryDashboardProps {
    stats: {
        totalItems: number;
        lowStockItems: number;
        totalValue: number;
        outOfStockItems: number;
    }
}

export function InventoryDashboard({ stats }: InventoryDashboardProps) {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-black text-gray-800">اللوحة الرئيسية</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">إجمالي الأصناف</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalItems}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">منخفض المخزون</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-600">{stats.lowStockItems}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">نفذ من المخزون</CardTitle>
                        <TrendingDown className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-600">{stats.outOfStockItems}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">قيمة المخزون</CardTitle>
                        <DollarSign className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.totalValue.toLocaleString()} د.ع</div>
                    </CardContent>
                </Card>
            </div>

            {/* Placeholder for Recent Activity or Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>تنبيهات المخزون</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground text-center py-8">
                            لا توجد تنبيهات جديدة
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
