'use client';

import {
    DndContext,
    DragEndEvent,
    useSensor,
    useSensors,
    PointerSensor,
    DragOverlay
} from '@dnd-kit/core';
import { getTables } from '@/lib/actions/tables';
import { Table, TableStatus, Order, OrderItem, MenuItem } from '@prisma/client';
import { updateTablePosition, updateTableStatus, deleteTable } from '@/lib/actions/tables';
import { DraggableTable } from './draggable-table';
import { useState, useOptimistic, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createTable, updateTableCapacity } from '@/lib/actions/tables';
import { Trash2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuSeparator,
    ContextMenuTrigger,
    ContextMenuRadioGroup,
    ContextMenuRadioItem,
} from "@/components/ui/context-menu"

import { ExtendedTable } from '@/types';

interface TableMapProps {
    initialTables: ExtendedTable[];
}

export function TableMap({ initialTables }: TableMapProps) {
    const [tables, setTables] = useState(initialTables);
    const [isEditing, setIsEditing] = useState(false);
    const [newTableNum, setNewTableNum] = useState('');
    const [newTableCap, setNewTableCap] = useState(4);
    const { toast } = useToast();

    // Polling for real-time updates
    useEffect(() => {
        const interval = setInterval(async () => {
            const freshTables = await getTables();
            // Only update if we are not currently dragging or editing to avoid interruptions
            if (!isEditing) {
                setTables(freshTables);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [isEditing]);

    // State for editing capacity
    const [capacityDialogOpen, setCapacityDialogOpen] = useState(false);
    const [selectedTableForCapacity, setSelectedTableForCapacity] = useState<Table | null>(null);
    const [capacityToEdit, setCapacityToEdit] = useState(0);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, delta } = event;
        const id = active.id as string;
        const currentTable = tables.find(t => t.id === id);

        if (currentTable) {
            // Calculate new position relative to the container
            // Note: dnd-kit delta is relative to start of drag
            // We need to commit exact coordinates to DB
            // Simple 2D approach: initial + delta
            const newX = currentTable.x + delta.x;
            const newY = currentTable.y + delta.y;

            // Optimistic update
            setTables(prev => prev.map(t => t.id === id ? { ...t, x: newX, y: newY } : t));

            // Server action
            updateTablePosition(id, newX, newY);
        }
    }

    async function handleAddTable() {
        if (!newTableNum) return;
        const res = await createTable({
            number: newTableNum,
            capacity: newTableCap,
            x: 50,
            y: 50
        });
        if (res.success) {
            setNewTableNum('');
            // Refresh happens via Server Action revalidate, but we can optimistically add if we wanted complex logic.
            // For now mainly relying on the page refresh or we can router.refresh() 
            // Actually, 'initialTables' prop won't update client-side state automatically unless we use router refresh in parent or refresh logic here.
            // Let's assume a hard refresh or we just updated optimistic state if we had the full object.
            // Since createTable returns simple success, we might need to reload. 
            // Simplest for this iteration: window.location.reload() or re-fetch.
            // Better: Return the created table from action.
            toast({
                title: "تم إضافة الطاولة بنجاح",
            });
            window.location.reload();
        } else {
            toast({
                variant: "destructive",
                title: "فشل إضافة الطاولة",
                description: "تحقق من عدم تكرار رقم الطاولة",
            });
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between bg-card p-4 rounded shadow border">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold">مخطط الصالة</h2>
                    <Button
                        variant={isEditing ? "destructive" : "secondary"}
                        onClick={() => setIsEditing(!isEditing)}
                    >
                        {isEditing ? "حفظ التعديلات" : "تعديل المخطط"}
                    </Button>
                </div>
                {isEditing && (
                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="رقم الطاولة"
                            className="w-24"
                            value={newTableNum}
                            onChange={e => setNewTableNum(e.target.value)}
                        />
                        <Input
                            type="number"
                            placeholder="السعة"
                            className="w-20"
                            value={newTableCap}
                            onChange={e => setNewTableCap(Number(e.target.value))}
                        />
                        <Button onClick={handleAddTable}>إضافة</Button>
                    </div>
                )}
            </div>

            <div className="relative w-full h-[600px] bg-slate-50 border-2 border-dashed border-slate-300 rounded overflow-hidden">
                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                    {tables.map(table => (
                        <ContextMenu key={table.id}>
                            <ContextMenuTrigger>
                                <DraggableTable
                                    table={table}
                                    isEditing={isEditing}
                                    onStatusClick={async (id, current) => {
                                        const next = current === 'AVAILABLE' ? 'OCCUPIED' : 'AVAILABLE';

                                        // Optimistic Update
                                        setTables(prev => prev.map(t => t.id === id ? {
                                            ...t,
                                            status: next,
                                            orders: next === 'AVAILABLE' ? [] : t.orders
                                        } : t));

                                        try {
                                            const result = await updateTableStatus(id, next);
                                            if (!result?.success) {
                                                throw new Error('Failed');
                                            }
                                        } catch (error) {
                                            // Revert on failure
                                            toast({ title: "فشل تحديث الحالة", variant: "destructive" });
                                            setTables(prev => prev.map(t => t.id === id ? {
                                                ...t,
                                                status: current
                                            } : t));
                                        }
                                    }}
                                />
                            </ContextMenuTrigger>
                            <ContextMenuContent>
                                <ContextMenuLabel>طاولة {table.number}</ContextMenuLabel>
                                <ContextMenuSeparator />
                                <ContextMenuLabel>الحالة</ContextMenuLabel>
                                <ContextMenuRadioGroup value={table.status} onValueChange={async (val) => {
                                    await updateTableStatus(table.id, val as TableStatus);
                                    setTables(prev => prev.map(t => t.id === table.id ? {
                                        ...t,
                                        status: val as TableStatus,
                                        orders: ((val as string) === 'AVAILABLE' || (val as string) === 'DIRTY') ? [] : t.orders
                                    } : t));
                                }}>
                                    <ContextMenuRadioItem value="AVAILABLE">متاح</ContextMenuRadioItem>
                                    <ContextMenuRadioItem value="OCCUPIED">مشغول</ContextMenuRadioItem>
                                    <ContextMenuRadioItem value="RESERVED">محجوز</ContextMenuRadioItem>
                                    <ContextMenuRadioItem value="DIRTY">تنظيف</ContextMenuRadioItem>
                                </ContextMenuRadioGroup>
                                <>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem onClick={() => {
                                        setSelectedTableForCapacity(table);
                                        setCapacityToEdit(table.capacity);
                                        setCapacityDialogOpen(true);
                                    }}>
                                        <Users className="ml-2 h-4 w-4" /> تعديل السعة
                                    </ContextMenuItem>
                                    <ContextMenuItem className="text-red-500" onClick={async () => {
                                        await deleteTable(table.id);
                                        setTables(prev => prev.filter(t => t.id !== table.id));
                                    }}>
                                        <Trash2 className="ml-2 h-4 w-4" /> حذف الطاولة
                                    </ContextMenuItem>
                                </>
                            </ContextMenuContent>
                        </ContextMenu>
                    ))}
                </DndContext>
                {tables.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground pointer-events-none">
                        لا توجد طاولات. اضغط على "تعديل المخطط" لإضافة واحدة.
                    </div>
                )}
                <div className="absolute bottom-4 right-4 text-xs text-muted-foreground bg-white/50 p-2 rounded">
                    {isEditing ? "اسحب الطاولات لتغيير مكانها." : "اضغط على الطاولة لتغيير حالتها (متاح/مشغول). انقر بزر الماوس الأيمن للمزيد من الخيارات."}
                </div>
            </div>


            <Dialog open={capacityDialogOpen} onOpenChange={setCapacityDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>تعديل سعة الطاولة {selectedTableForCapacity?.number}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="capacity" className="text-right">
                                السعة
                            </Label>
                            <Input
                                id="capacity"
                                type="number"
                                className="col-span-3"
                                value={capacityToEdit}
                                onChange={(e) => setCapacityToEdit(Number(e.target.value))}
                                min={1}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCapacityDialogOpen(false)}>إلغاء</Button>
                        <Button onClick={async () => {
                            if (selectedTableForCapacity && capacityToEdit > 0) {
                                await updateTableCapacity(selectedTableForCapacity.id, capacityToEdit);
                                setTables(prev => prev.map(t => t.id === selectedTableForCapacity.id ? { ...t, capacity: capacityToEdit } : t));
                                setCapacityDialogOpen(false);
                            }
                        }}>حفظ التغييرات</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
