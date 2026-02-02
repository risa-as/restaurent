'use client';

import { useDraggable } from '@dnd-kit/core';
import { TableStatus } from '@prisma/client';
import { cn } from '@/lib/utils';
import { GripVertical, Flame, Loader2, Check } from 'lucide-react';
import { ExtendedTable } from '@/types';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface DraggableTableProps {
    table: ExtendedTable;
    isEditing: boolean;
    onStatusClick?: (id: string, currentStatus: TableStatus) => void;
}

export function DraggableTable({ table, isEditing, onStatusClick }: DraggableTableProps) {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: table.id,
        data: { x: table.x, y: table.y },
        disabled: !isEditing,
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;

    // Visual status mapping
    const statusColor = {
        AVAILABLE: "bg-green-100 border-green-500 text-green-700",
        OCCUPIED: "bg-red-100 border-red-500 text-red-700",
        RESERVED: "bg-yellow-100 border-yellow-500 text-yellow-700",
        DIRTY: "bg-gray-100 border-gray-500 text-gray-700"
    }[table.status];

    const activeOrder = table.orders?.[0];

    // Overlay order status if occupied and has order
    let OrderIcon = null;
    let orderStatusColor = "";

    if (table.status === 'OCCUPIED' && activeOrder) {
        if (activeOrder.status === 'PENDING') {
            OrderIcon = Flame;
            orderStatusColor = "text-yellow-600 animate-pulse";
        } else if (activeOrder.status === 'PREPARING') {
            OrderIcon = Loader2;
            orderStatusColor = "text-orange-600 animate-spin";
        } else if (activeOrder.status === 'READY') {
            OrderIcon = Check;
            orderStatusColor = "text-green-600";
        }
    }

    const content = (
        <div
            ref={setNodeRef}
            style={{
                ...style,
                left: table.x,
                top: table.y,
                position: 'absolute'
            }}
            className={cn(
                "w-24 h-24 rounded-full border-2 flex flex-col items-center justify-center shadow-sm transition-colors z-10",
                statusColor,
                isEditing ? "cursor-move" : "cursor-pointer hover:shadow-md"
            )}
            onClick={() => !isEditing && onStatusClick?.(table.id, table.status)}
            {...listeners}
            {...attributes}
        >
            <div className="font-bold text-lg">{table.number}</div>
            {OrderIcon ? (
                <div className={`flex items-center gap-1 mt-1 ${orderStatusColor}`}>
                    <OrderIcon className="w-4 h-4" />
                </div>
            ) : (
                <div className="text-xs">{table.capacity} مقعد</div>
            )}
            {isEditing && <GripVertical className="h-4 w-4 absolute top-1 right-1 opacity-50" />}
        </div>
    );

    if (activeOrder && !isEditing) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    {content}
                </TooltipTrigger>
                <TooltipContent className="text-right" dir="rtl">
                    <div className="font-bold mb-1 border-b pb-1">
                        {activeOrder.status === 'PENDING' && "في الانتظار"}
                        {activeOrder.status === 'PREPARING' && "قيد التحضير"}
                        {activeOrder.status === 'READY' && "جاهز للتقديم"}
                    </div>
                    <ul className="text-sm space-y-1">
                        {activeOrder.items.map(item => (
                            <li key={item.id}>
                                {item.quantity}x {item.menuItem.name}
                            </li>
                        ))}
                    </ul>
                </TooltipContent>
            </Tooltip>
        )
    }

    return content;
}
