'use client';

import { Order, OrderStatus, Table, User, OrderItem, MenuItem } from '@prisma/client';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Clock } from 'lucide-react';
import Link from 'next/link';
import { updateOrderStatus } from '@/lib/actions/orders';
import { PaymentDialog } from './payment-dialog';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface OrderCardProps {
    order: Order & { table: Table | null, items: (OrderItem & { menuItem: MenuItem })[], waiter: User | null };
}

export function OrderCard({ order }: OrderCardProps) {

    const nextStatus: Record<string, OrderStatus | null> = {
        'PENDING': 'PREPARING',
        'PREPARING': 'READY',
        'READY': 'SERVED',
        'SERVED': 'COMPLETED'
    };

    const statusColor = {
        PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        PREPARING: 'bg-blue-100 text-blue-800 border-blue-200',
        READY: 'bg-green-100 text-green-800 border-green-200',
        SERVED: 'bg-purple-100 text-purple-800 border-purple-200',
        COMPLETED: 'bg-gray-100 text-gray-800',
        CANCELLED: 'bg-red-100 text-red-800'
    }[order.status] || 'bg-gray-100';

    const handleAdvance = async () => {
        const next = nextStatus[order.status];
        if (next) {
            await updateOrderStatus(order.id, next);
        }
    };

    const statusArabic = {
        PENDING: 'قيد الانتظار',
        PREPARING: 'جاري التحضير',
        READY: 'جاهز',
        SERVED: 'تم التقديم',
        COMPLETED: 'مكتمل',
        CANCELLED: 'ملغي'
    };

    return (
        <Card className={`border-l-4 shadow-sm ${statusColor} transition-all hover:shadow-md`}>
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                        <CardTitle className="text-lg font-bold">
                            <Link href={`/dashboard/orders/${order.id}`} className="hover:underline">
                                #{order.orderNumber}
                            </Link>
                        </CardTitle>
                        <div className="flex items-center text-xs text-muted-foreground">
                            <Clock className="w-3 h-3 mr-1" />
                            {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: ar })}
                        </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                        {order.tableId ? `طاولة ${order.table?.number}` : 'سفري'}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent className="pb-3 grid gap-2">
                <div className="flex justify-between items-center bg-muted/20 p-2 rounded text-sm">
                    <div className="font-medium">{order.items.length} أصناف</div>
                    <div className="font-bold">{order.totalAmount.toFixed(0)} د.ع</div>
                </div>

                {order.note && (
                    <div className="text-xs bg-yellow-50 text-yellow-800 p-2 rounded border border-yellow-200 italic">
                        &quot;{order.note}&quot;
                    </div>
                )}

                <div className="flex justify-between items-center text-xs mt-1">
                    <Link href={`/dashboard/orders/${order.id}`} className="text-muted-foreground hover:text-primary underline-offset-4 hover:underline">
                        عرض التفاصيل
                    </Link>
                </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 pt-0 w-full">
                <Dialog>
                    <DialogTrigger asChild>
                        <Button variant="secondary" size="sm" className="w-full text-xs h-9">عرض الأصناف</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>تفاصيل الطلب #{order.orderNumber}</DialogTitle>
                        </DialogHeader>
                        <ScrollArea className="h-[300px]">
                            <div className="space-y-4 p-4">
                                {order.items.map(item => (
                                    <div key={item.id} className="flex justify-between items-start border-b pb-2">
                                        <div>
                                            <div className="font-medium">{item.quantity}x {item.menuItem.name}</div>
                                            {item.notes && <div className="text-xs text-muted-foreground">{item.notes}</div>}
                                        </div>
                                        <div className="font-bold">{item.totalPrice.toFixed(0)} د.ع</div>
                                    </div>
                                ))}
                                <div className="flex justify-between pt-4 font-bold text-lg">
                                    <span>المجموع</span>
                                    <span>{order.totalAmount.toFixed(0)} د.ع</span>
                                </div>
                            </div>
                        </ScrollArea>
                    </DialogContent>
                </Dialog>

                {nextStatus[order.status] && (
                    <Button className="w-full text-xs gap-1 h-9" size="sm" onClick={handleAdvance}>
                        {/* <ActionIcon className="w-3 h-3" /> */}
                        تحويل إلى {statusArabic[nextStatus[order.status]!]}
                    </Button>
                )}

                {order.status === 'SERVED' && (
                    <div className="w-full">
                        <PaymentDialog order={order} />
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}
