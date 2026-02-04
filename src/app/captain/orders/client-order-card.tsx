'use client';

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCheck, Loader2, Clock, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { markOrderCompleted } from '@/lib/actions/captain';
import { useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ClientOrderCardProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    order: any; // ToDo: Fix type
    config: { label: string; color: string };
    status: string;
}

export function ClientOrderCard({ order, config, status }: ClientOrderCardProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    // Map status to icon
    const StatusIcon = {
        PENDING: Clock,
        PREPARING: Loader2,
        READY: CheckCircle
    }[status as string] || Clock;

    const handleComplete = () => {
        startTransition(async () => {
            const res = await markOrderCompleted(order.id);
            if (res.error) {
                toast({
                    title: "خطأ",
                    description: res.error,
                    variant: "destructive"
                });
            } else {
                toast({
                    title: "تم التسليم",
                    description: `تم تسليم الطلب رقم #${order.orderNumber} بنجاح`,
                    className: "bg-green-500 text-white border-none"
                });
            }
        });
    };

    return (
        <Card className="overflow-hidden border-2">
            <CardHeader className="bg-gray-50/50 pb-3 border-b">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">
                            #{order.orderNumber}
                        </CardTitle>
                        <span className="text-sm font-medium text-muted-foreground">
                            {order.tableId ? `طاولة ${order.table?.number}` : 'سفري'}
                        </span>
                    </div>
                    <Badge variant="outline" className={`gap-1 px-3 py-1 ${config.color}`}>
                        <StatusIcon className={`w-3 h-3 ${order.status === 'PREPARING' ? 'animate-spin' : ''}`} />
                        {config.label}
                    </Badge>
                </div>
                <div className="text-xs text-muted-foreground" dir="ltr">
                    {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: ar })}
                </div>
            </CardHeader>
            <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {order.items.map((item: any) => (
                        <div key={item.id} className={`flex items-center justify-between bg-white border p-2 rounded shadow-sm ${item.status === 'READY' ? 'border-green-200 bg-green-50' :
                            item.status === 'PREPARING' ? 'border-orange-200 bg-orange-50' : ''
                            }`}>
                            <div className="flex items-center gap-2">
                                <span className="font-bold bg-gray-100 w-6 h-6 flex items-center justify-center rounded text-sm">
                                    {item.quantity}
                                </span>
                                <div>
                                    <div className="text-sm font-medium">{item.menuItem.name}</div>
                                    <div className="flex gap-1 mt-1">
                                        {item.status === 'PENDING' && <Badge variant="secondary" className="text-[10px] h-4 bg-gray-200 hover:bg-gray-200 text-gray-700">انتظار</Badge>}
                                        {item.status === 'PREPARING' && <Badge variant="secondary" className="text-[10px] h-4 bg-orange-200 hover:bg-orange-200 text-orange-800 animate-pulse">تحضير</Badge>}
                                        {item.status === 'READY' && <Badge variant="secondary" className="text-[10px] h-4 bg-green-200 hover:bg-green-200 text-green-800">جاهز</Badge>}
                                        {item.status === 'SERVED' && <Badge variant="secondary" className="text-[10px] h-4 bg-blue-200 hover:bg-blue-200 text-blue-800">تم التقديم</Badge>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                {order.note && (
                    <div className="mt-3 text-sm bg-yellow-50 text-yellow-800 p-2 rounded border border-yellow-100">
                        ملاحظة: {order.note}
                    </div>
                )}
            </CardContent>
            {order.status === 'READY' && (
                <CardFooter className="bg-green-50/50 p-2 border-t">
                    <Button
                        className="w-full bg-green-600 hover:bg-green-700 gap-2"
                        onClick={handleComplete}
                        disabled={isPending}
                    >
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
                        {isPending ? 'جاري التسجيل...' : 'تم التسليم'}
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}
