'use client';

import { Order, OrderItem, MenuItem, Table, Category } from '@prisma/client';
import { KitchenTicket } from './kitchen-ticket';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface KitchenBoardProps {
    orders: (Order & { items: (OrderItem & { menuItem: MenuItem & { category: Category } })[], table: Table | null })[];
}

export function KitchenBoard({ orders }: KitchenBoardProps) {
    const router = useRouter();

    // Auto-refresh every 10 seconds to catch new orders from others
    useEffect(() => {
        const interval = setInterval(() => {
            router.refresh();
        }, 10000);
        return () => clearInterval(interval);
    }, [router]);

    const columns = {
        eastern: [] as React.ReactNode[],
        western: [] as React.ReactNode[],
        others: [] as React.ReactNode[]
    };

    orders.forEach(order => {
        const groups = {
            eastern: [] as typeof order.items,
            western: [] as typeof order.items,
            others: [] as typeof order.items
        };

        order.items.forEach(item => {
            const type = item.menuItem.category.type;

            if (type === 'EASTERN') {
                groups.eastern.push(item);
            } else if (type === 'WESTERN') {
                groups.western.push(item);
            } else {
                groups.others.push(item); // Includes BEVERAGE, DESSERT
            }
        });

        if (groups.eastern.length > 0) {
            columns.eastern.push(
                <div key={`${order.id}-eastern`} className="h-[250px]">
                    <KitchenTicket order={order} items={groups.eastern} categoryName="مأكولات شرقية" />
                </div>
            );
        }
        if (groups.western.length > 0) {
            columns.western.push(
                <div key={`${order.id}-western`} className="h-[250px]">
                    <KitchenTicket order={order} items={groups.western} categoryName="مأكولات غربية" />
                </div>
            );
        }
        if (groups.others.length > 0) {
            columns.others.push(
                <div key={`${order.id}-others`} className="h-[250px]">
                    <KitchenTicket order={order} items={groups.others} categoryName="مشروبات وحلويات" />
                </div>
            );
        }
    });

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full overflow-hidden pb-4">
            {/* Eastern Column */}
            <div className="flex flex-col gap-2 bg-orange-50/50 p-2 rounded-lg border border-orange-100 h-full overflow-hidden">
                <h2 className="text-lg font-black text-orange-800 text-center bg-orange-100 py-1 rounded">مأكولات شرقية</h2>
                <div className="flex-1 overflow-y-auto grid grid-cols-1 xl:grid-cols-2 gap-2 pr-1 content-start">
                    {columns.eastern.length === 0 ? <p className="col-span-full text-center text-muted-foreground mt-10">لا توجد طلبات</p> : columns.eastern}
                </div>
            </div>

            {/* Western Column */}
            <div className="flex flex-col gap-2 bg-blue-50/50 p-2 rounded-lg border border-blue-100 h-full overflow-hidden">
                <h2 className="text-lg font-black text-blue-800 text-center bg-blue-100 py-1 rounded">مأكولات غربية</h2>
                <div className="flex-1 overflow-y-auto grid grid-cols-1 xl:grid-cols-2 gap-2 pr-1 content-start">
                    {columns.western.length === 0 ? <p className="col-span-full text-center text-muted-foreground mt-10">لا توجد طلبات</p> : columns.western}
                </div>
            </div>

            {/* Others Column */}
            <div className="flex flex-col gap-2 bg-purple-50/50 p-2 rounded-lg border border-purple-100 h-full overflow-hidden">
                <h2 className="text-lg font-black text-purple-800 text-center bg-purple-100 py-1 rounded">مشروبات وحلويات</h2>
                <div className="flex-1 overflow-y-auto grid grid-cols-1 xl:grid-cols-2 gap-2 pr-1 content-start">
                    {columns.others.length === 0 ? <p className="col-span-full text-center text-muted-foreground mt-10">لا توجد طلبات</p> : columns.others}
                </div>
            </div>
        </div>
    );
}
