'use client';

import { Order, OrderItem, MenuItem, Table } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { markOrderIdsReady, updateOrderToPreparing } from '@/lib/actions/kitchen';
import { useTransition, useEffect, useState, useOptimistic } from 'react';
import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Check, Flame, Loader2 } from 'lucide-react';

interface KitchenTicketProps {
    order: Order & { table: Table | null };
    items: (OrderItem & { menuItem: MenuItem })[];
    categoryName?: string;
}

export function KitchenTicket({ order, items, categoryName }: KitchenTicketProps) {
    const [isPending, startTransition] = useTransition();
    const [elapsed, setElapsed] = useState(0);
    const [optimisticStatus, setOptimisticStatus] = useOptimistic(
        order.status,
        (state, newStatus: string) => newStatus as any
    );

    // Update timer every minute for color coding
    useEffect(() => {
        const interval = setInterval(() => {
            setElapsed(differenceInMinutes(new Date(), new Date(order.createdAt)));
        }, 60000);
        setElapsed(differenceInMinutes(new Date(), new Date(order.createdAt)));
        return () => clearInterval(interval);
    }, [order.createdAt]);


    const borderColor = elapsed > 20 ? 'border-red-500 bg-red-50' : elapsed > 10 ? 'border-orange-500 bg-orange-50' : 'border-blue-200 bg-white';

    const handleAction = () => {
        startTransition(async () => {
            const nextStatus = optimisticStatus === 'PENDING' ? 'PREPARING' : 'READY';
            setOptimisticStatus(nextStatus);

            if (order.status === 'PENDING') {
                await updateOrderToPreparing(order.id);
            } else {
                await markOrderIdsReady(order.id);
            }
        });
    };

    return (
        <Card className={`border-2 shadow-sm ${borderColor} flex flex-col h-full`}>
            <CardHeader className="pb-1 p-2 bg-white/50">
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg font-black">
                        #{order.orderNumber}
                    </CardTitle>
                    <span className="text-sm font-bold">
                        {order.tableId ? `طاولة ${order.table?.number}` : 'سفري'}
                    </span>
                </div>
                {categoryName && (
                    <div className="bg-primary/10 text-primary-foreground font-bold text-center text-xs py-0.5 mt-0.5 rounded bg-slate-800">
                        {categoryName}
                    </div>
                )}
                <div className="text-xs font-semibold text-muted-foreground mr-auto text-left" dir="ltr">
                    {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: ar })}
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto bg-white/30 p-2">
                <div className="space-y-2">
                    {items.map(item => (
                        <div key={item.id} className="flex justify-between items-start border-b border-black/10 pb-1 last:border-0">
                            <div className="flex gap-2">
                                <span className="text-base font-bold border-r border-black/20 pr-2 min-w-[20px] flex items-center">{item.quantity}</span>
                                <div>
                                    <div className="text-sm font-semibold leading-tight">{item.menuItem.name}</div>
                                    {item.notes && (
                                        <div className="text-[10px] font-bold text-red-600 bg-yellow-200 inline-block px-1 mt-0.5 rounded">
                                            ⚠️ {item.notes}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {order.note && (
                    <div className="mt-2 p-1 bg-yellow-100 border border-yellow-300 rounded text-red-800 font-bold text-xs">
                        ملاحظة: {order.note}
                    </div>
                )}
            </CardContent>
            <CardFooter className="pt-1 p-2 bg-white/80 border-t">
                {optimisticStatus === 'PENDING' && (
                    <Button
                        className="w-full h-8 text-sm font-bold bg-blue-600 hover:bg-blue-700"
                        onClick={handleAction}
                        disabled={isPending}
                    >
                        <div className="flex items-center gap-1">
                            <Flame className="w-4 h-4" /> بدء
                        </div>
                    </Button>
                )}
                {optimisticStatus === 'PREPARING' && (
                    <Button
                        className="w-full h-8 text-sm font-bold bg-orange-600 hover:bg-orange-700"
                        onClick={handleAction}
                        disabled={isPending}
                    >
                        <div className="flex items-center gap-1">
                            <Loader2 className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
                            {isPending ? '...' : 'إنهاء'}
                        </div>
                    </Button>
                )}
                {optimisticStatus === 'READY' && (
                    <Button
                        className="w-full h-8 text-sm font-bold bg-green-600 hover:bg-green-700"
                        disabled
                    >
                        <div className="flex items-center gap-1">
                            <Check className="w-4 h-4" /> جاهز
                        </div>
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
