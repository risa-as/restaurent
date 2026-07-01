'use client';

import { Order, OrderItem, MenuItem, Table, Category } from '@prisma/client';
import { KitchenTicket } from './kitchen-ticket';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { getPusherClient } from '@/lib/pusher';
import { ChefHat } from 'lucide-react';

type KitchenOrder = Order & {
    items: (OrderItem & { menuItem: MenuItem & { category: Category } })[];
    table: Table | null;
};

interface KitchenBoardProps {
    orders: KitchenOrder[];
    categories: Category[];
    filteredCategoryIds?: string[] | null;
    tenantId: string;
    onRefresh?: () => void | Promise<void>;
}

const CATEGORY_STYLES = [
    { border: 'border-orange-500/40',  header: 'bg-orange-500/15 text-orange-300 border-b border-orange-500/20',  dot: 'bg-orange-500' },
    { border: 'border-blue-500/40',    header: 'bg-blue-500/15 text-blue-300 border-b border-blue-500/20',        dot: 'bg-blue-500' },
    { border: 'border-purple-500/40',  header: 'bg-purple-500/15 text-purple-300 border-b border-purple-500/20',  dot: 'bg-purple-500' },
    { border: 'border-emerald-500/40', header: 'bg-emerald-500/15 text-emerald-300 border-b border-emerald-500/20', dot: 'bg-emerald-500' },
    { border: 'border-amber-500/40',   header: 'bg-amber-500/15 text-amber-300 border-b border-amber-500/20',    dot: 'bg-amber-500' },
    { border: 'border-pink-500/40',    header: 'bg-pink-500/15 text-pink-300 border-b border-pink-500/20',        dot: 'bg-pink-500' },
] as const;

function EmptyColumn() {
    return (
        <div className="col-span-full flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground/50">
            <ChefHat className="w-10 h-10" />
            <p className="text-sm font-medium">لا توجد طلبات حالياً</p>
        </div>
    );
}

export function KitchenBoard({ orders, categories, filteredCategoryIds, tenantId, onRefresh }: KitchenBoardProps) {
    const router = useRouter();
    const [, setConnected] = useState(false);
    const [, setIsOnline] = useState(true);

    // Prefer the CSR background refetch; fall back to router.refresh() if absent.
    // Held in a ref so the Pusher/polling effect never re-subscribes on re-render.
    const refresh = onRefresh ?? (() => router.refresh());
    const refreshRef = useRef(refresh);
    refreshRef.current = refresh;

    useEffect(() => {
        // Do not seed from navigator.onLine — it gives false negatives on some
        // setups. Start optimistic (online) and only flip on real network events.
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        const pusher = getPusherClient();
        let channel: ReturnType<typeof pusher.subscribe> | null = null;

        if (pusher) {
            pusher.connection.bind('connected', () => setConnected(true));
            pusher.connection.bind('disconnected', () => setConnected(false));
            pusher.connection.bind('error', () => setConnected(false));
            if (pusher.connection.state === 'connected') setConnected(true);

            channel = pusher.subscribe(`tenant-${tenantId}-kitchen`);
            channel.bind('new-order', () => { if (navigator.onLine) refreshRef.current(); });
            channel.bind('order-updated', () => { if (navigator.onLine) refreshRef.current(); });
        }

        // Only poll when online — stop when offline to avoid failed requests
        const interval = setInterval(() => {
            if (navigator.onLine) refreshRef.current();
        }, 10000);

        return () => {
            clearInterval(interval);
            if (channel) {
                channel.unbind_all();
                pusher.unsubscribe(`tenant-${tenantId}-kitchen`);
            }
        };
    }, [router, tenantId]);

    const visibleCategories = filteredCategoryIds
        ? categories.filter(c => filteredCategoryIds.includes(c.id))
        : categories;

    if (visibleCategories.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
                <ChefHat className="w-16 h-16 opacity-20" />
                <p className="text-lg font-semibold">لا توجد أقسام</p>
                <p className="text-sm opacity-60">أضف أقساماً من صفحة إدارة القائمة لتظهر هنا</p>
            </div>
        );
    }

    const categoryMap = new Map(categories.map(c => [c.id, c]));
    const columns = new Map<string, React.ReactNode[]>(
        visibleCategories.map(c => [c.id, []])
    );

    orders.forEach(order => {
        const groups = new Map<string, typeof order.items>();

        order.items.forEach(item => {
            const categoryId = item.menuItem.category.id;
            if (!columns.has(categoryId)) return;
            const items = groups.get(categoryId) ?? [];
            items.push(item);
            groups.set(categoryId, items);
        });

        groups.forEach((items, categoryId) => {
            const column = columns.get(categoryId);
            const category = categoryMap.get(categoryId);
            if (!column || !category || items.length === 0) return;

            column.push(
                <KitchenTicket
                    key={`${order.id}-${categoryId}`}
                    order={order}
                    items={items}
                    categoryName={category.name}
                    onRefresh={onRefresh}
                    tenantId={tenantId}
                />
            );
        });
    });

    const colCount = visibleCategories.length;
    const isFiltered = !!filteredCategoryIds;

    // Outer grid: 1 category → full width, 2 → half each, 3+ → normal grid
    const outerGrid = colCount === 1
        ? 'grid-cols-1'
        : colCount === 2
        ? 'grid-cols-1 md:grid-cols-2'
        : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4';

    // Inner tickets grid: full-width column gets more ticket columns
    const innerGrid = (isFiltered && colCount === 1)
        ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-2.5'
        : (isFiltered && colCount === 2)
        ? 'grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-2.5'
        : 'grid grid-cols-1 xl:grid-cols-2 gap-2.5';

    return (
        <div className={cn('grid gap-3 h-full overflow-hidden pb-2', outerGrid)}>
            {visibleCategories.map((category, index) => {
                const style = CATEGORY_STYLES[index % CATEGORY_STYLES.length];
                const tickets = columns.get(category.id) ?? [];
                const ticketCount = tickets.length;

                return (
                    <div key={category.id} className={cn(
                        'flex flex-col h-full rounded-xl border overflow-hidden bg-card/20',
                        style.border
                    )}>
                        {/* Column header */}
                        <div className={cn('flex items-center justify-between px-3 py-2 shrink-0', style.header)}>
                            <div className="flex items-center gap-1.5">
                                <span className={cn('w-2 h-2 rounded-full shrink-0', style.dot)} />
                                <h2 className="text-sm font-black tracking-tight">{category.name}</h2>
                            </div>
                            {ticketCount > 0 && (
                                <span className={cn(
                                    'text-xs font-black tabular-nums px-1.5 py-0.5 rounded-full',
                                    style.dot.replace('bg-', 'bg-') + '/20'
                                )}>
                                    {ticketCount}
                                </span>
                            )}
                        </div>

                        {/* Tickets */}
                        <div className={cn('flex-1 overflow-y-auto p-2 content-start', innerGrid)}>
                            {ticketCount === 0 ? <EmptyColumn /> : tickets}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
