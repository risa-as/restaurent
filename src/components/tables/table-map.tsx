'use client';

import {
    DndContext,
    DragEndEvent,
    useSensor,
    useSensors,
    PointerSensor,
} from '@dnd-kit/core';
import { getTables, updateTablePosition, updateTableStatus, deleteTable, createTable, updateTableCapacity, bulkCreateTables } from '@/lib/actions/tables';
import { Table, TableStatus } from '@prisma/client';
import { DraggableTable } from './draggable-table';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Users, Pencil, Save, Plus, LayoutGrid, CircleDot, QrCode, Layers } from 'lucide-react';
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
} from "@/components/ui/context-menu";
import { cn } from '@/lib/utils';
import { ExtendedTable } from '@/types';

interface TableMapProps {
    initialTables: ExtendedTable[];
    tenantSlug?: string;
}

const STATUS_CONFIG = {
    AVAILABLE: { label: 'متاح', dot: 'bg-green-500', glow: 'shadow-green-500/30', text: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10 border-green-500/30' },
    OCCUPIED: { label: 'مشغول', dot: 'bg-red-500', glow: 'shadow-red-500/30', text: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10 border-red-500/30' },
    RESERVED: { label: 'محجوز', dot: 'bg-yellow-500', glow: 'shadow-yellow-500/30', text: 'text-yellow-600 dark:text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30' },
    DIRTY: { label: 'تنظيف', dot: 'bg-muted-foreground/60', glow: '', text: 'text-muted-foreground', bg: 'bg-muted/50 border-muted-foreground/20' },
} as const;

export function TableMap({ initialTables, tenantSlug = '' }: TableMapProps) {
    const [tables, setTables] = useState(initialTables);
    const [isEditing, setIsEditing] = useState(false);
    const [newTableNum, setNewTableNum] = useState('');
    const [newTableCap, setNewTableCap] = useState(4);
    const [capacityDialogOpen, setCapacityDialogOpen] = useState(false);
    const [selectedTableForCapacity, setSelectedTableForCapacity] = useState<Table | null>(null);
    const [capacityToEdit, setCapacityToEdit] = useState(0);
    const [qrDialogTable, setQrDialogTable] = useState<ExtendedTable | null>(null);
    const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
    const [bulkCount, setBulkCount] = useState(10);
    const [bulkCapacity, setBulkCapacity] = useState(4);
    const [bulkPrefix, setBulkPrefix] = useState('طاولة');
    const [bulkStartFrom, setBulkStartFrom] = useState(1);
    const [bulkLoading, setBulkLoading] = useState(false);
    const { toast } = useToast();
    const rootDomain = typeof window !== 'undefined' ? window.location.origin : '';

    // Real-time polling
    useEffect(() => {
        const interval = setInterval(async () => {
            if (!isEditing) {
                const freshTables = await getTables();
                setTables(freshTables);
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [isEditing]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
    );

    function handleDragEnd(event: DragEndEvent) {
        const { active, delta } = event;
        const id = active.id as string;
        const currentTable = tables.find(t => t.id === id);
        if (currentTable) {
            const newX = currentTable.x + delta.x;
            const newY = currentTable.y + delta.y;
            setTables(prev => prev.map(t => t.id === id ? { ...t, x: newX, y: newY } : t));
            updateTablePosition(id, newX, newY);
        }
    }

    async function handleAddTable() {
        if (!newTableNum) return;
        const res = await createTable({ number: newTableNum, capacity: newTableCap, x: 50, y: 50 });
        if (res.success) {
            toast({ title: "تم إضافة الطاولة بنجاح" });
            window.location.reload();
        } else {
            toast({ variant: "destructive", title: "فشل إضافة الطاولة", description: "تحقق من عدم تكرار رقم الطاولة" });
        }
        setNewTableNum('');
    }

    function openBulkDialog() {
        const prefixTrimmed = bulkPrefix.trim();
        const nums = tables
            .map(t => { const m = t.number.match(new RegExp(`^${prefixTrimmed}\\s+(\\d+)$`)); return m ? parseInt(m[1], 10) : 0; })
            .filter(n => n > 0);
        setBulkStartFrom(nums.length > 0 ? Math.max(...nums) + 1 : 1);
        setBulkDialogOpen(true);
    }

    async function handleBulkCreate() {
        setBulkLoading(true);
        try {
            const res = await bulkCreateTables({ count: bulkCount, capacity: bulkCapacity, prefix: bulkPrefix, startFrom: bulkStartFrom });
            if ('error' in res) {
                toast({ variant: 'destructive', title: res.error });
            } else {
                const msg = res.skipped > 0
                    ? `تم إنشاء ${res.created} طاولة (${res.skipped} موجودة مسبقاً تم تخطيها)`
                    : `تم إنشاء ${res.created} طاولة بنجاح`;
                toast({ title: msg });
                setBulkDialogOpen(false);
                window.location.reload();
            }
        } finally {
            setBulkLoading(false);
        }
    }

    // Stats
    const stats = {
        available: tables.filter(t => t.status === 'AVAILABLE').length,
        occupied: tables.filter(t => t.status === 'OCCUPIED').length,
        reserved: tables.filter(t => t.status === 'RESERVED').length,
        dirty: tables.filter(t => t.status === 'DIRTY').length,
        total: tables.length,
    };

    return (
        <div className="space-y-5">

            {/* ── Stats Bar ── */}
            <div className="grid grid-cols-5 gap-3">
                {[
                    { label: 'إجمالي الطاولات', value: stats.total, color: 'text-foreground', icon: LayoutGrid, bg: 'bg-card' },
                    { label: 'متاحة', value: stats.available, color: 'text-green-500', icon: CircleDot, bg: 'bg-green-500/8' },
                    { label: 'مشغولة', value: stats.occupied, color: 'text-red-500', icon: CircleDot, bg: 'bg-red-500/8' },
                    { label: 'محجوزة', value: stats.reserved, color: 'text-yellow-500', icon: CircleDot, bg: 'bg-yellow-500/8' },
                    { label: 'بحاجة تنظيف', value: stats.dirty, color: 'text-muted-foreground', icon: CircleDot, bg: 'bg-muted/40' },
                ].map((s, i) => {
                    const Icon = s.icon;
                    return (
                        <div key={i} className={cn('flex items-center gap-3 rounded-xl border p-4', s.bg)}>
                            <Icon className={cn('w-5 h-5 shrink-0', s.color)} />
                            <div>
                                <p className={cn('text-2xl font-black leading-none', s.color)}>{s.value}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* ── Main Canvas Panel ── */}
            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">

                {/* Toolbar */}
                <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/30">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <LayoutGrid className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <h2 className="font-bold text-sm leading-none">خريطة الصالة</h2>
                            <p className="text-xs text-muted-foreground mt-0.5">{stats.total} طاولة · انقر على الطاولة لتغيير حالتها</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isEditing && (
                            <div className="flex items-center gap-2 bg-background border rounded-lg px-3 py-1.5">
                                <Input
                                    placeholder="رقم الطاولة"
                                    className="h-7 w-24 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
                                    value={newTableNum}
                                    onChange={e => setNewTableNum(e.target.value)}
                                />
                                <span className="text-muted-foreground/40">|</span>
                                <Input
                                    type="number"
                                    placeholder="السعة"
                                    className="h-7 w-16 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
                                    value={newTableCap}
                                    onChange={e => setNewTableCap(Number(e.target.value))}
                                />
                                <Button size="sm" className="h-7 px-3 text-xs gap-1" onClick={handleAddTable}>
                                    <Plus className="w-3 h-3" />
                                    إضافة
                                </Button>
                            </div>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-2 h-8"
                            onClick={openBulkDialog}
                        >
                            <Layers className="w-3.5 h-3.5" />
                            إنشاء بالجملة
                        </Button>
                        <Button
                            variant={isEditing ? "default" : "outline"}
                            size="sm"
                            className={cn('gap-2 h-8', isEditing && 'bg-primary')}
                            onClick={() => setIsEditing(!isEditing)}
                        >
                            {isEditing
                                ? <><Save className="w-3.5 h-3.5" /> حفظ</>
                                : <><Pencil className="w-3.5 h-3.5" /> تعديل المخطط</>
                            }
                        </Button>
                    </div>
                </div>

                {/* Canvas */}
                <div
                    className={cn(
                        'relative w-full h-[580px] overflow-hidden transition-colors',
                        isEditing
                            ? 'bg-[radial-gradient(hsl(var(--primary)/0.08)_1px,transparent_1px)] bg-[size:24px_24px] [background-position:center]'
                            : 'bg-muted/10'
                    )}
                >
                    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                        {tables.map(table => (
                            <ContextMenu key={table.id}>
                                <ContextMenuTrigger>
                                    <DraggableTable
                                        table={table}
                                        isEditing={isEditing}
                                        onStatusClick={async (id, current) => {
                                            const next = current === 'AVAILABLE' ? 'OCCUPIED' : 'AVAILABLE';
                                            setTables(prev => prev.map(t => t.id === id
                                                ? { ...t, status: next, orders: next === 'AVAILABLE' ? [] : t.orders }
                                                : t
                                            ));
                                            try {
                                                const result = await updateTableStatus(id, next);
                                                if (!result?.success) throw new Error('Failed');
                                            } catch {
                                                toast({ title: "فشل تحديث الحالة", variant: "destructive" });
                                                setTables(prev => prev.map(t => t.id === id ? { ...t, status: current } : t));
                                            }
                                        }}
                                    />
                                </ContextMenuTrigger>
                                <ContextMenuContent className="w-44">
                                    <ContextMenuLabel>طاولة {table.number}</ContextMenuLabel>
                                    <ContextMenuSeparator />
                                    <ContextMenuLabel className="text-xs text-muted-foreground">تغيير الحالة</ContextMenuLabel>
                                    <ContextMenuRadioGroup
                                        value={table.status}
                                        onValueChange={async (val) => {
                                            await updateTableStatus(table.id, val as TableStatus);
                                            setTables(prev => prev.map(t => t.id === table.id
                                                ? { ...t, status: val as TableStatus, orders: ((val as string) === 'AVAILABLE' || (val as string) === 'DIRTY') ? [] : t.orders }
                                                : t
                                            ));
                                        }}
                                    >
                                        {(Object.entries(STATUS_CONFIG) as [keyof typeof STATUS_CONFIG, typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG]][]).map(([key, cfg]) => (
                                            <ContextMenuRadioItem key={key} value={key} className="gap-2">
                                                <span className={cn('w-2 h-2 rounded-full', cfg.dot)} />
                                                {cfg.label}
                                            </ContextMenuRadioItem>
                                        ))}
                                    </ContextMenuRadioGroup>
                                    <ContextMenuSeparator />
                                    <ContextMenuItem
                                        className="gap-2"
                                        onClick={() => {
                                            setSelectedTableForCapacity(table);
                                            setCapacityToEdit(table.capacity);
                                            setCapacityDialogOpen(true);
                                        }}
                                    >
                                        <Users className="w-3.5 h-3.5" /> تعديل السعة
                                    </ContextMenuItem>
                                    {tenantSlug && (
                                        <ContextMenuItem
                                            className="gap-2"
                                            onClick={() => setQrDialogTable(table)}
                                        >
                                            <QrCode className="w-3.5 h-3.5" /> عرض QR Code
                                        </ContextMenuItem>
                                    )}
                                    <ContextMenuItem
                                        className="gap-2 text-destructive focus:text-destructive"
                                        onClick={async () => {
                                            await deleteTable(table.id);
                                            setTables(prev => prev.filter(t => t.id !== table.id));
                                        }}
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> حذف الطاولة
                                    </ContextMenuItem>
                                </ContextMenuContent>
                            </ContextMenu>
                        ))}
                    </DndContext>

                    {/* Empty state */}
                    {tables.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground pointer-events-none">
                            <LayoutGrid className="w-10 h-10 opacity-20" />
                            <p className="text-sm">لا توجد طاولات. اضغط <strong>تعديل المخطط</strong> لإضافة واحدة.</p>
                        </div>
                    )}

                    {/* Edit mode indicator */}
                    {isEditing && (
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-full font-medium shadow-lg flex items-center gap-1.5 animate-pulse">
                            <Pencil className="w-3 h-3" />
                            وضع التعديل — اسحب الطاولات لتغيير مواضعها
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-end gap-4 px-5 py-3 border-t bg-muted/20">
                    {(Object.entries(STATUS_CONFIG) as [keyof typeof STATUS_CONFIG, typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG]][]).map(([, cfg]) => (
                        <div key={cfg.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className={cn('w-2.5 h-2.5 rounded-full', cfg.dot)} />
                            {cfg.label}
                        </div>
                    ))}
                    <span className="text-muted-foreground/30 text-xs">|</span>
                    <p className="text-xs text-muted-foreground">انقر بزر الماوس الأيمن للخيارات</p>
                </div>
            </div>

            {/* QR Code Dialog */}
            <Dialog open={!!qrDialogTable} onOpenChange={open => !open && setQrDialogTable(null)}>
                <DialogContent className="sm:max-w-xs">
                    <DialogHeader>
                        <DialogTitle>QR Code — طاولة {qrDialogTable?.number}</DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col items-center gap-4 py-4">
                        {qrDialogTable && tenantSlug && (
                            <>
                                <p className="text-xs text-muted-foreground break-all text-center">
                                    {rootDomain}/{tenantSlug}/order?t={qrDialogTable.id}
                                </p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        const url = `${rootDomain}/${tenantSlug}/order?t=${qrDialogTable.id}`;
                                        navigator.clipboard.writeText(url);
                                        toast({ title: 'تم نسخ الرابط' });
                                    }}
                                >
                                    <QrCode className="w-4 h-4 mr-2" /> نسخ رابط الطلب
                                </Button>
                            </>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setQrDialogTable(null)}>إغلاق</Button>
                        <Button onClick={() => {
                            if (qrDialogTable && tenantSlug) {
                                window.print();
                            }
                        }}>
                            طباعة QR
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Create Dialog */}
            <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
                <DialogContent className="sm:max-w-sm" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Layers className="w-4 h-4 text-primary" />
                            إنشاء طاولات بالجملة
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>عدد الطاولات</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={200}
                                    value={bulkCount}
                                    onChange={e => setBulkCount(Math.max(1, Math.min(200, Number(e.target.value))))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>السعة (أشخاص)</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={50}
                                    value={bulkCapacity}
                                    onChange={e => setBulkCapacity(Math.max(1, Number(e.target.value)))}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>بادئة الاسم</Label>
                                <Input
                                    value={bulkPrefix}
                                    onChange={e => setBulkPrefix(e.target.value)}
                                    placeholder="طاولة"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>ابدأ من الرقم</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={bulkStartFrom}
                                    onChange={e => setBulkStartFrom(Math.max(1, Number(e.target.value)))}
                                />
                            </div>
                        </div>
                        <div className="rounded-lg bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">معاينة: </span>
                            {bulkPrefix.trim()} {bulkStartFrom}،{' '}
                            {bulkPrefix.trim()} {bulkStartFrom + 1}،{' '}
                            {bulkCount > 2 && <> ... {bulkPrefix.trim()} {bulkStartFrom + bulkCount - 1}</>}
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setBulkDialogOpen(false)}>إلغاء</Button>
                        <Button onClick={handleBulkCreate} disabled={bulkLoading || !bulkPrefix.trim()} className="gap-2">
                            {bulkLoading
                                ? <><Layers className="w-4 h-4 animate-pulse" /> جاري الإنشاء...</>
                                : <><Layers className="w-4 h-4" /> إنشاء {bulkCount} طاولة</>
                            }
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Capacity Dialog */}
            <Dialog open={capacityDialogOpen} onOpenChange={setCapacityDialogOpen}>
                <DialogContent className="sm:max-w-xs">
                    <DialogHeader>
                        <DialogTitle>تعديل سعة الطاولة {selectedTableForCapacity?.number}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="flex items-center gap-4">
                            <Label htmlFor="capacity" className="shrink-0">السعة</Label>
                            <Input
                                id="capacity"
                                type="number"
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
                        }}>
                            حفظ التغييرات
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
