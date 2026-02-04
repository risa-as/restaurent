'use client';

import { useState, useTransition } from 'react';
import { Delivery, Order, OrderItem, MenuItem, User } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { CheckCircle, Wallet, User as UserIcon } from 'lucide-react';
import { markDeliveriesAsHandedOver } from '@/lib/actions/delivery';
import { useToast } from '@/hooks/use-toast';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

type DeliveryWithRelations = Delivery & {
    order: Order & { items: (OrderItem & { menuItem: MenuItem })[] };
    driver: User | null;
};

interface DriverFinanceProps {
    deliveries: DeliveryWithRelations[];
}

export function DriverFinance({ deliveries }: DriverFinanceProps) {
    const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    // Group by driver
    const driverGroups = deliveries.reduce((groups, delivery) => {
        const driverId = delivery.driverId || 'unassigned';
        if (!groups[driverId]) {
            groups[driverId] = {
                driver: delivery.driver,
                deliveries: [],
                totalAmount: 0
            };
        }
        groups[driverId].deliveries.push(delivery);
        groups[driverId].totalAmount += delivery.order.totalAmount;
        return groups;
    }, {} as Record<string, { driver: User | null, deliveries: DeliveryWithRelations[], totalAmount: number }>);

    const handleConfirmPayment = (driverId: string) => {
        const deliveryIds = driverGroups[driverId].deliveries.map(d => d.id);

        startTransition(async () => {
            const result = await markDeliveriesAsHandedOver(deliveryIds);
            if (result.success) {
                toast({ title: "تم تأكيد استلام المبلغ بنجاح" });
                setSelectedDriverId(null);
            } else {
                toast({ title: "حدث خطأ", variant: "destructive" });
            }
        });
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.values(driverGroups).map((group) => {
                    const driverName = group.driver?.name || "سائق غير محدد";
                    const count = group.deliveries.length;
                    const total = group.totalAmount;
                    const driverId = group.driver?.id || 'unassigned';

                    return (
                        <Card key={driverId} className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-orange-500" onClick={() => setSelectedDriverId(driverId)}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-orange-100 p-2 rounded-full">
                                            <UserIcon className="w-5 h-5 text-orange-600" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-lg font-bold">{driverName}</CardTitle>
                                            <CardDescription className="text-xs">
                                                {count} طلبات غير مدفوعة
                                            </CardDescription>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
                                        مستحق للدفع
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="mt-2 flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-gray-900">{total.toFixed(0)}</span>
                                    <span className="text-xs text-muted-foreground font-medium">د.ع</span>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}

                {Object.keys(driverGroups).length === 0 && (
                    <div className="col-span-full text-center py-12 bg-white rounded-xl border border-dashed">
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                        <h3 className="text-lg font-medium">لا توجد مبالغ معلقة</h3>
                        <p className="text-muted-foreground">جميع السائقين قاموا بتسليم المبالغ المستحقة.</p>
                    </div>
                )}
            </div>

            {/* Details Dialog */}
            <Dialog open={!!selectedDriverId} onOpenChange={(open) => !open && setSelectedDriverId(null)}>
                <DialogContent className="max-w-2xl" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Wallet className="w-5 h-5 text-primary" />
                            تسليم العهدة المالية
                        </DialogTitle>
                        <DialogDescription>
                            تفاصيل الطلبات التي لم يتم تسليم مبالغها للمطعم
                        </DialogDescription>
                    </DialogHeader>

                    {selectedDriverId && driverGroups[selectedDriverId] && (
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
                                <div>
                                    <p className="text-sm text-gray-500">اسم السائق</p>
                                    <p className="font-bold">{driverGroups[selectedDriverId].driver?.name}</p>
                                </div>
                                <div className="text-left">
                                    <p className="text-sm text-gray-500">المبلغ الإجمالي</p>
                                    <p className="text-xl font-bold text-primary">{driverGroups[selectedDriverId].totalAmount.toFixed(0)} د.ع</p>
                                </div>
                            </div>

                            <div className="max-h-[300px] overflow-auto border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-right">رقم الطلب</TableHead>
                                            <TableHead className="text-right">الوقت</TableHead>
                                            <TableHead className="text-right">العنوان</TableHead>
                                            <TableHead className="text-left">المبلغ</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {driverGroups[selectedDriverId].deliveries.map(delivery => (
                                            <TableRow key={delivery.id}>
                                                <TableCell className="font-medium">#{delivery.order.orderNumber}</TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {format(new Date(delivery.order.updatedAt), 'hh:mm a')}
                                                </TableCell>
                                                <TableCell className="text-xs truncate max-w-[150px]" title={delivery.address}>
                                                    {delivery.address}
                                                </TableCell>
                                                <TableCell className="text-left font-bold">
                                                    {delivery.order.totalAmount.toFixed(0)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <DialogFooter className="gap-2 sm:gap-0">
                                <Button variant="outline" onClick={() => setSelectedDriverId(null)}>إلغاء</Button>
                                <Button
                                    onClick={() => handleConfirmPayment(selectedDriverId)}
                                    className="bg-green-600 hover:bg-green-700 text-white gap-2"
                                    disabled={isPending}
                                >
                                    {isPending ? 'جاري التأكيد...' : (
                                        <>
                                            <CheckCircle className="w-4 h-4" />
                                            تأكيد استلام المبلغ
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
