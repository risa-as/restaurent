'use client';

import { Order, Table, User, OrderItem, MenuItem } from '@prisma/client';
import { OrderCard } from './order-card';

interface OrderBoardProps {
    orders: (Order & { table: Table | null, items: (OrderItem & { menuItem: MenuItem })[], waiter: User | null })[];
}

export function OrderBoard({ orders }: OrderBoardProps) {
    const columns = [
        { id: 'PENDING', label: 'قيد الانتظار' },
        { id: 'PREPARING', label: 'جاري التحضير' },
        { id: 'READY', label: 'جاهز' },
        { id: 'SERVED', label: 'تم التقديم' },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-[calc(100vh-140px)] min-h-[500px]">
            {columns.map(col => {
                const colOrders = orders.filter(o => o.status === col.id);
                return (
                    <div key={col.id} className="flex flex-col bg-muted/40 rounded-lg p-2 border h-full">
                        <div className="font-bold text-center mb-4 text-sm tracking-wide text-muted-foreground bg-white/50 py-2 rounded">
                            {col.label} ({colOrders.length})
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 px-1 scrollbar-hide">
                            {colOrders.map(order => (
                                <OrderCard key={order.id} order={order} />
                            ))}
                            {colOrders.length === 0 && (
                                <div className="text-center text-xs text-secondary-foreground/50 py-10">
                                    لا توجد طلبات
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    );
}
