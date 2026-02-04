'use client';

import { useState } from 'react';
import { Delivery, Order, OrderItem, MenuItem, User } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { CheckCircle, Search, TrendingUp, Wallet } from 'lucide-react';

type DeliveryWithRelations = Delivery & {
    order: Order & { items: (OrderItem & { menuItem: MenuItem })[] };
    driver: User | null;
};

interface DriverHistoryProps {
    deliveries: DeliveryWithRelations[]; // All delivered orders
    drivers: User[];
}

export function DriverHistory({ deliveries, drivers }: DriverHistoryProps) {
    const [selectedDriverId, setSelectedDriverId] = useState<string>('all');

    // Filter deliveries based on selection
    const filteredDeliveries = deliveries.filter(d =>
        selectedDriverId === 'all' ? true : d.driverId === selectedDriverId
    ).sort((a, b) => new Date(b.order.updatedAt).getTime() - new Date(a.order.updatedAt).getTime());

    // Calculate aggregated stats
    const totalDeliveries = filteredDeliveries.length;
    const totalEarnings = filteredDeliveries.reduce((sum, d) => sum + d.order.totalAmount, 0);
    const totalFees = filteredDeliveries.reduce((sum, d) => sum + d.deliveryFee, 0);

    return (
        <div className="space-y-6">
            {/* Filter */}
            <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center gap-4">
                <Search className="text-gray-400 w-5 h-5" />
                <span className="text-sm font-medium">اختر السائق:</span>
                <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                    <SelectTrigger className="w-[200px]" dir="rtl">
                        <SelectValue placeholder="الكل" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                        <SelectItem value="all">جميع السائقين</SelectItem>
                        {drivers.map(driver => (
                            <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">إجمالي التوصيلات المنجزة</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalDeliveries}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">إجمالي قيمة الطلبات</CardTitle>
                        <Wallet className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalEarnings.toFixed(0)} <span className="text-xs text-muted-foreground">د.ع</span></div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">إجمالي رسوم التوصيل</CardTitle>
                        <TrendingUp className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{totalFees.toFixed(0)} <span className="text-xs text-muted-foreground">د.ع</span></div>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card>
                <CardHeader>
                    <CardTitle>سجل التوصيلات</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table dir="rtl">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right">رقم الطلب</TableHead>
                                    <TableHead className="text-right">السائق</TableHead>
                                    <TableHead className="text-right">التاريخ والوقت</TableHead>
                                    <TableHead className="text-right">العنوان</TableHead>
                                    <TableHead className="text-right">المبلغ</TableHead>
                                    <TableHead className="text-right">الحالة المالية</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredDeliveries.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                            لا توجد بيانات
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredDeliveries.map((delivery) => (
                                        <TableRow key={delivery.id}>
                                            <TableCell className="font-medium">#{delivery.order.orderNumber}</TableCell>
                                            <TableCell>{delivery.driver?.name || 'غ/م'}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">
                                                        {format(new Date(delivery.order.updatedAt), 'dd MMMM yyyy', { locale: ar })}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {format(new Date(delivery.order.updatedAt), 'hh:mm a', { locale: ar })}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={delivery.address}>
                                                {delivery.address}
                                            </TableCell>
                                            <TableCell>{delivery.order.totalAmount.toFixed(0)}</TableCell>
                                            <TableCell>
                                                {delivery.isCashHandedOver ? (
                                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">مدفوع</Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">غير مدفوع</Badge>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
