'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Users, MoreHorizontal, CheckCircle, XCircle, Clock,
    Trash2, Timer, UtensilsCrossed, QrCode,
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { updateTableStatus } from '@/lib/actions/captain';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useTransition } from 'react';
import type { TableWithOrder } from './captain-tables-client';

function formatElapsed(ms: number): string {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

const STATUS_CONFIG = {
    AVAILABLE: {
        label: 'متاح',
        dot: 'bg-emerald-500',
        border: 'border-emerald-200',
        bg: 'bg-emerald-50/60 dark:bg-emerald-950/20',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        icon: CheckCircle,
    },
    OCCUPIED: {
        label: 'مشغول',
        dot: 'bg-red-500',
        border: 'border-red-200',
        bg: 'bg-red-50/60 dark:bg-red-950/20',
        badge: 'bg-red-100 text-red-800 border-red-200',
        icon: XCircle,
    },
    RESERVED: {
        label: 'محجوز',
        dot: 'bg-blue-500',
        border: 'border-blue-200',
        bg: 'bg-blue-50/60 dark:bg-blue-950/20',
        badge: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: Clock,
    },
    DIRTY: {
        label: 'تنظيف',
        dot: 'bg-orange-500',
        border: 'border-orange-200',
        bg: 'bg-orange-50/60 dark:bg-orange-950/20',
        badge: 'bg-orange-100 text-orange-800 border-orange-200',
        icon: Trash2,
    },
};

export function TableCard({ table, now }: { table: TableWithOrder; now: number | null }) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const handleStatusChange = (status: 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'DIRTY') => {
        startTransition(async () => {
            const res = await updateTableStatus(table.id, status);
            if (res.error) {
                toast({ variant: 'destructive', title: 'خطأ', description: res.error });
            } else {
                toast({ title: 'تم التحديث', description: `طاولة ${table.number}` });
            }
        });
    };

    const cfg = STATUS_CONFIG[table.status] ?? STATUS_CONFIG.AVAILABLE;
    const StatusIcon = cfg.icon;

    // Timers are only meaningful while the table is actually occupied. Guarding
    // on status prevents a stale `occupiedSince`/order (e.g. after a Pusher
    // status-only update on cleaning) from keeping the counter running on an
    // already-available table.
    const isOccupied = table.status === 'OCCUPIED';

    // Phase 1: food not yet delivered — timer from order creation
    const activeOrder = table.orders?.[0];
    const phase1Ms = isOccupied && activeOrder && now !== null ? now - new Date(activeOrder.createdAt).getTime() : null;

    // QR indicators
    const isQrActive = !!activeOrder?.qrSessionToken;
    const hasQrBillPending = (table._count?.orders ?? 0) > 0;

    // Phase 2: food delivered, customer eating — timer from occupiedSince
    const phase2Ms = isOccupied && !activeOrder && table.occupiedSince && now !== null
        ? now - new Date(table.occupiedSince).getTime()
        : null;

    const isOrderLate = phase1Ms !== null && phase1Ms > 15 * 60 * 1000;
    const isEatingLong = phase2Ms !== null && table.reviewAfter !== null
        ? phase2Ms > (table.reviewAfter! * 60 * 1000 * 0.75)
        : false;

    return (
        <div
            dir="rtl"
            className={cn(
                'rounded-2xl border-2 flex flex-col gap-2.5 transition-all overflow-hidden',
                cfg.bg,
                cfg.border,
                isPending && 'opacity-50',
                isOrderLate && 'ring-2 ring-amber-400 ring-offset-1',
            )}
        >
            {/* Top bar */}
            <div className="flex items-center justify-between px-3 pt-3">
                <div className="flex items-center gap-2">
                    <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', cfg.dot,
                        table.status === 'OCCUPIED' && 'animate-pulse'
                    )} />
                    <span className="font-black text-xl leading-none">{table.number}</span>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 -ml-1">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuLabel>تغيير الحالة</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleStatusChange('AVAILABLE')}>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 ml-2" />متاح
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange('OCCUPIED')}>
                            <span className="w-2 h-2 rounded-full bg-red-500 ml-2" />مشغول
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange('RESERVED')}>
                            <span className="w-2 h-2 rounded-full bg-blue-500 ml-2" />محجوز
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleStatusChange('DIRTY')}>
                            <span className="w-2 h-2 rounded-full bg-orange-500 ml-2" />تنظيف
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Status badge */}
            <div className="px-3">
                <Badge variant="outline" className={cn('text-xs px-2 py-0.5 gap-1 w-fit', cfg.badge)}>
                    <StatusIcon className="w-3 h-3" />
                    {cfg.label}
                </Badge>
            </div>

            {/* QR indicator */}
            {(isQrActive || hasQrBillPending) && (
                <div className={cn(
                    'mx-3 rounded-xl px-2.5 py-1.5 flex items-center gap-1.5 text-xs font-bold',
                    hasQrBillPending
                        ? 'bg-green-100 text-green-800 border border-green-300'
                        : 'bg-violet-100 text-violet-800 border border-violet-200',
                )}>
                    <QrCode className="w-3 h-3 shrink-0" />
                    {hasQrBillPending ? 'طلب فاتورة — QR' : 'طلب QR'}
                </div>
            )}

            {/* Phase 1 — waiting for food */}
            {phase1Ms !== null && (
                <div className={cn(
                    'mx-3 rounded-xl px-3 py-2 flex items-center gap-2',
                    isOrderLate
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-white/70 text-orange-800 border border-orange-200',
                )}>
                    <Timer className="w-4 h-4 shrink-0" />
                    <div className="flex flex-col leading-tight">
                        <span className="text-[10px] opacity-60 font-medium">وقت الطلب</span>
                        <span className="font-mono font-black text-lg">{formatElapsed(phase1Ms)}</span>
                    </div>
                    {isOrderLate && (
                        <span className="mr-auto text-[10px] font-bold bg-amber-500 text-white rounded px-1 py-0.5">متأخر</span>
                    )}
                </div>
            )}

            {/* Phase 2 — customer eating */}
            {phase2Ms !== null && (
                <div className={cn(
                    'mx-3 rounded-xl px-3 py-2 flex items-center gap-2',
                    isEatingLong
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-white/70 text-blue-800 border border-blue-200',
                )}>
                    <UtensilsCrossed className="w-4 h-4 shrink-0" />
                    <div className="flex flex-col leading-tight">
                        <span className="text-[10px] opacity-60 font-medium">على الطاولة</span>
                        <span className="font-mono font-black text-lg">{formatElapsed(phase2Ms)}</span>
                    </div>
                    {isEatingLong && (
                        <span className="mr-auto text-[10px] font-bold bg-amber-500 text-white rounded px-1 py-0.5">قريباً</span>
                    )}
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center gap-1 text-muted-foreground text-xs px-3 pb-3 mt-auto">
                <Users className="w-3.5 h-3.5" />
                <span>{table.capacity} مقاعد</span>
            </div>
        </div>
    );
}
