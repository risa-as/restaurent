'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { markStationItemsReady } from '@/lib/actions/kitchen-stations';
import { useRouter } from 'next/navigation';
import { CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface OrderItem {
    id: string;
    quantity: number;
    menuItem: { name: string; nameAr?: string | null };
    status: string;
    prepStartedAt: Date | null;
}

interface Order {
    id: string;
    orderNumber: number;
    table: { number: string } | null;
    items: OrderItem[];
    createdAt: Date;
}

interface Station {
    id: string;
    name: string;
    colour: string;
}

interface StationBoardProps {
    station: Station;
    orders: Order[];
}

function useElapsedMinutes(since: Date | null): number {
    const [minutes, setMinutes] = useState(
        since ? Math.floor((Date.now() - new Date(since).getTime()) / 60000) : 0
    );
    useEffect(() => {
        if (!since) return;
        const interval = setInterval(() => {
            setMinutes(Math.floor((Date.now() - new Date(since).getTime()) / 60000));
        }, 30_000);
        return () => clearInterval(interval);
    }, [since]);
    return minutes;
}

function OrderCard({ order, stationId: _stationId, onReady }: { order: Order; stationId: string; onReady: () => void }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const elapsed = useElapsedMinutes(order.createdAt);
    const isLate = elapsed > 15;

    const handleReady = () => {
        const itemIds = order.items.filter(i => i.status !== 'READY').map(i => i.id);
        if (itemIds.length === 0) return;

        startTransition(async () => {
            const result = await markStationItemsReady(itemIds);
            if (result.error) {
                toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
            } else {
                toast({ title: `✅ تم إنجاز طلب #${order.orderNumber}` });
                onReady();
            }
        });
    };

    return (
        <Card className={`border-2 ${isLate ? 'border-red-400 bg-red-50/30 dark:bg-red-950/10' : 'border-border'}`}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-lg">#{order.orderNumber}</span>
                    {order.table && (
                        <Badge variant="outline" className="text-sm">
                            طاولة {order.table.number}
                        </Badge>
                    )}
                </div>
                <div className={`flex items-center gap-1 text-sm ${isLate ? 'text-red-600 font-bold' : 'text-muted-foreground'}`}>
                    {isLate ? <AlertTriangle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    {elapsed} د
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                {order.items.map(item => (
                    <div key={item.id} className="flex items-center justify-between">
                        <span className="text-sm">
                            {item.quantity}× {item.menuItem.nameAr || item.menuItem.name}
                        </span>
                        {item.status === 'READY' && (
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        )}
                    </div>
                ))}

                <Button
                    onClick={handleReady}
                    disabled={isPending || order.items.every(i => i.status === 'READY')}
                    className="w-full mt-3 gap-2"
                    size="sm"
                >
                    <CheckCircle className="w-4 h-4" />
                    إنجاز
                </Button>
            </CardContent>
        </Card>
    );
}

export function StationBoard({ station, orders: initialOrders }: StationBoardProps) {
    const router = useRouter();
    const [orders, _setOrders] = useState(initialOrders);

    // Refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => router.refresh(), 30_000);
        return () => clearInterval(interval);
    }, [router]);

    return (
        <div className="min-h-screen bg-background" dir="rtl">
            {/* Station header */}
            <div
                className="p-4 text-white text-center font-bold text-xl sticky top-0 z-10"
                style={{ backgroundColor: station.colour }}
            >
                {station.name}
                <Badge className="mr-3 bg-white/20 text-white border-white/30">
                    {orders.length} طلب
                </Badge>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {orders.length === 0 ? (
                    <div className="col-span-full text-center py-16 text-muted-foreground">
                        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500 opacity-50" />
                        <p>لا توجد طلبات معلقة</p>
                    </div>
                ) : (
                    orders.map(order => (
                        <OrderCard
                            key={order.id}
                            order={order}
                            stationId={station.id}
                            onReady={() => router.refresh()}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
