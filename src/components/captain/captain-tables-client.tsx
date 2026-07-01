'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getPusherClient } from '@/lib/pusher';
import { TableCard } from '@/components/captain/table-card';
import type { Table } from '@prisma/client';

type ActiveOrder = { id: string; createdAt: Date; status: string; qrSessionToken: string | null };
export type TableWithOrder = Table & {
    orders: ActiveOrder[];
    _count: { orders: number };
};

interface CaptainTablesClientProps {
    initialTables: TableWithOrder[];
    tenantId: string;
}

export function CaptainTablesClient({ initialTables, tenantId }: CaptainTablesClientProps) {
    const router = useRouter();
    const [tables, setTables] = useState<TableWithOrder[]>(initialTables);
    const [now, setNow] = useState<number | null>(null);

    // sync when server refreshes
    useEffect(() => {
        setTables(initialTables);
    }, [initialTables]);

    // initialize after mount then tick every second — avoids SSR/client hydration mismatch
    useEffect(() => {
        setNow(Date.now());
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    const handleTableStatusChange = useCallback((data: { tableId: string; status: Table['status'] }) => {
        setTables(prev =>
            prev.map(t => {
                if (t.id !== data.tableId) return t;
                // Leaving OCCUPIED frees the table — drop the stale occupancy timer
                // so it stops counting until the next full refresh confirms.
                const cleared = data.status !== 'OCCUPIED' ? { occupiedSince: null } : {};
                return { ...t, status: data.status, ...cleared };
            })
        );
    }, []);

    useEffect(() => {
        const pusher = getPusherClient();
        if (!pusher || !tenantId) return;

        const channel = pusher.subscribe(`tenant-${tenantId}-orders`);
        channel.bind('table-status-changed', handleTableStatusChange);
        channel.bind('table-dirty', (data: { tableId: string }) => {
            handleTableStatusChange({ tableId: data.tableId, status: 'DIRTY' });
        });
        // refresh when order state changes so Phase 1→2 transition and QR bill status is picked up
        channel.bind('order-updated', () => { if (navigator.onLine) router.refresh(); });
        channel.bind('order-served', () => { if (navigator.onLine) router.refresh(); });
        channel.bind('bill-requested', () => { if (navigator.onLine) router.refresh(); });

        return () => {
            channel.unbind_all();
            pusher.unsubscribe(`tenant-${tenantId}-orders`);
        };
    }, [tenantId, handleTableStatusChange, router]);

    const occupied = tables.filter(t => t.status === 'OCCUPIED');
    const available = tables.filter(t => t.status === 'AVAILABLE');
    const reserved = tables.filter(t => t.status === 'RESERVED');
    const dirty = tables.filter(t => t.status === 'DIRTY');

    const grouped = [...occupied, ...dirty, ...reserved, ...available];

    return (
        <div className="space-y-6">
            {/* Summary bar */}
            <div className="flex flex-wrap gap-3">
                {[
                    { label: 'مشغول', count: occupied.length, dot: 'bg-red-500' },
                    { label: 'تنظيف', count: dirty.length, dot: 'bg-orange-500' },
                    { label: 'محجوز', count: reserved.length, dot: 'bg-blue-500' },
                    { label: 'متاح', count: available.length, dot: 'bg-emerald-500' },
                ].map(({ label, count, dot }) => (
                    <div key={label} className="flex items-center gap-1.5 bg-muted/60 rounded-lg px-3 py-1.5 text-sm">
                        <span className={`w-2 h-2 rounded-full ${dot}`} />
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-bold">{count}</span>
                    </div>
                ))}
                <div className="flex items-center gap-1.5 bg-muted/60 rounded-lg px-3 py-1.5 text-sm">
                    <span className="text-muted-foreground">الإجمالي</span>
                    <span className="font-bold">{tables.length}</span>
                </div>
            </div>

            {/* Table grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {grouped.map(table => (
                    <TableCard key={table.id} table={table} now={now} />
                ))}
            </div>
        </div>
    );
}
