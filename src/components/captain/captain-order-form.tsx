'use client';

import { Category, MenuItem, Offer, Table } from '@prisma/client';
import { useState, useTransition, useEffect, useCallback, useRef } from 'react';
import { getPusherClient } from '@/lib/pusher';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createCaptainOrder, updateTableStatus } from '@/lib/actions/captain';
import { enqueueOrder } from '@/lib/offline-queue';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Minus, Plus, Trash2, UtensilsCrossed, Pizza, ShoppingCart, LayoutGrid, ClipboardList, ChevronsUpDown, Search } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { ConnectionDot } from '@/components/ui/connection-dot';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ModifierPickerModal, type SelectedModifier } from '@/components/menu/modifier-picker-modal';
import { cn } from '@/lib/utils';

type MenuItemWithOffers = MenuItem & { offers: Pick<Offer, 'id' | 'name' | 'discountPct'>[]; _count?: { modifierGroups: number } };

interface CaptainOrderFormProps {
    categories: (Category & { items: MenuItemWithOffers[] })[];
    tables: Table[];
    readyOrdersCount?: number;
    serviceMode: string;
    tenantId?: string;
    onRefresh?: () => void | Promise<void>;
}

interface CartItem {
    menuItem: MenuItemWithOffers;
    quantity: number;
    notes?: string;
    modifiers?: SelectedModifier[];
    cartKey: string;
}

function getEffectivePrice(item: MenuItemWithOffers): { price: number; originalPrice: number; discountPct: number | null; offerName: string | null } {
    const offer = item.offers?.[0] ?? null;
    if (!offer) return { price: item.price, originalPrice: item.price, discountPct: null, offerName: null };
    return {
        price: item.price * (1 - offer.discountPct / 100),
        originalPrice: item.price,
        discountPct: offer.discountPct,
        offerName: offer.name,
    };
}

export function CaptainOrderForm({ categories, tables: initialTables, readyOrdersCount = 0, serviceMode, tenantId, onRefresh }: CaptainOrderFormProps) {
    const router = useRouter();
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isPending, startTransition] = useTransition();
    const [view, setView] = useState<'order' | 'tables'>('order');
    const [tableStatuses, setTableStatuses] = useState<Record<string, string>>(
        () => Object.fromEntries(initialTables.map(t => [t.id, t.status]))
    );
    const [pendingItem, setPendingItem] = useState<MenuItemWithOffers | null>(null);
    const [tableComboOpen, setTableComboOpen] = useState(false);
    const [tableSearch, setTableSearch] = useState('');
    const tables = initialTables.map(t => ({ ...t, status: tableStatuses[t.id] ?? t.status }));
    const { toast } = useToast();
    const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Prefer the CSR background refetch; fall back to router.refresh() (SSR).
    // Held in a ref so the Pusher effect never re-subscribes on re-render.
    const refresh = onRefresh ?? (() => router.refresh());
    const refreshRef = useRef(refresh);
    refreshRef.current = refresh;

    // ── مزامنة tableStatuses مع بيانات الخادم الجديدة بعد router.refresh() ─────
    useEffect(() => {
        setTableStatuses(Object.fromEntries(initialTables.map(t => [t.id, t.status])));
    }, [initialTables]);

    // ── Pusher: استمع لتغييرات حالة الطاولات من أي جهاز ─────────────────────
    const handleTableStatusChange = useCallback((data: { tableId: string; status: string }) => {
        // 1. تحديث فوري optimistic
        setTableStatuses(prev => ({ ...prev, [data.tableId]: data.status }));
        // 2. إعادة جلب بيانات الخادم بعد 300ms لمزامنة الحالة
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = setTimeout(() => {
            refreshRef.current();
        }, 300);
    }, []);

    useEffect(() => {
        if (!tenantId) return;
        const pusher = getPusherClient();
        if (!pusher) return;
        const channel = pusher.subscribe(`tenant-${tenantId}-orders`);
        channel.bind('table-status-changed', handleTableStatusChange);
        channel.bind('table-dirty', (data: { tableId: string }) => {
            handleTableStatusChange({ tableId: data.tableId, status: 'DIRTY' });
        });
        return () => {
            channel.unbind('table-status-changed', handleTableStatusChange);
            channel.unbind('table-dirty');
            // لا نستدعي pusher.unsubscribe — CaptainPusherListener يستخدم نفس الـ channel
            if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
        };
    }, [tenantId, handleTableStatusChange]);

    const addToCartDirect = (item: MenuItemWithOffers) => {
        // Add directly without modifiers
        const cartKey = item.id;
        setCart(prev => {
            const existing = prev.find(i => i.cartKey === cartKey);
            if (existing) {
                return prev.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { menuItem: item, quantity: 1, modifiers: [], cartKey }];
        });
    };

    const addToCartWithModifiers = (item: MenuItemWithOffers) => {
        // Open modifier picker
        setPendingItem(item);
    };

    const addToCart = (item: MenuItemWithOffers) => {
        const hasModifiers = (item._count?.modifierGroups ?? 0) > 0;
        if (hasModifiers) {
            addToCartWithModifiers(item);
        } else {
            addToCartDirect(item);
        }
    };

    const handleModifierConfirm = (modifiers: SelectedModifier[]) => {
        if (!pendingItem) return;
        const cartKey = pendingItem.id + (modifiers.length > 0 ? ':' + modifiers.map(m => m.modifierOptionId).sort().join(',') : '');
        setCart(prev => {
            const existing = prev.find(i => i.cartKey === cartKey);
            if (existing) {
                return prev.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { menuItem: pendingItem, quantity: 1, modifiers, cartKey }];
        });
        setPendingItem(null);
    };

    const removeFromCart = (cartKey: string) => {
        setCart(prev => prev.filter(i => i.cartKey !== cartKey));
    };

    const updateQuantity = (cartKey: string, delta: number) => {
        setCart(prev => {
            return prev.map(i => {
                if (i.cartKey === cartKey) {
                    const newQty = Math.max(0, i.quantity + delta);
                    return { ...i, quantity: newQty };
                }
                return i;
            }).filter(i => i.quantity > 0);
        });
    };

    const handleTableToggle = (tableId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'OCCUPIED' ? 'AVAILABLE' : 'OCCUPIED';
        setTableStatuses(prev => ({ ...prev, [tableId]: newStatus }));
        startTransition(async () => {
            const result = await updateTableStatus(tableId, newStatus as any);
            if (result?.error) {
                setTableStatuses(prev => ({ ...prev, [tableId]: currentStatus }));
                toast({ title: 'فشل تحديث الطاولة', variant: 'destructive' });
            } else {
                toast({
                    title: newStatus === 'OCCUPIED' ? 'تم فتح الطاولة' : 'تم إغلاق الطاولة',
                    description: newStatus === 'OCCUPIED' ? 'يمكن للزبون الآن الطلب عبر QR' : undefined,
                });
            }
        });
    };

    const handleSubmit = () => {
        if (!selectedTable) {
            toast({ title: 'يرجى اختيار طاولة', variant: 'destructive' });
            return;
        }
        if (cart.length === 0) {
            toast({ title: 'يرجى إضافة عناصر للطلب', variant: 'destructive' });
            return;
        }

        const orderPayload = {
            tableId: selectedTable,
            serviceMode,
            items: cart.map(i => ({
                menuItemId: i.menuItem.id,
                quantity: i.quantity,
                notes: i.notes,
                modifiers: i.modifiers?.map(m => ({ modifierOptionId: m.modifierOptionId })),
            })),
        };

        startTransition(async () => {
            try {
                const result = await createCaptainOrder(orderPayload);
                if (result.success) {
                    // تحديث حالة الطاولة فورياً (optimistic) قبل وصول Pusher event
                    setTableStatuses(prev => ({ ...prev, [selectedTable]: 'OCCUPIED' }));
                    toast({ title: 'تم إرسال الطلب للمطبخ بنجاح' });
                    setCart([]);
                    setSelectedTable('');
                } else {
                    toast({ title: 'حدث خطأ أثناء إرسال الطلب', variant: 'destructive' });
                }
            } catch {
                await enqueueOrder(orderPayload);
                setCart([]);
                setSelectedTable('');
                toast({ title: 'تم حفظ الطلب محلياً', description: 'سيرسل تلقائياً عند عودة الإنترنت' });
            }
        });
    };

    const totalAmount = cart.reduce((sum, item) => {
        const basePrice = getEffectivePrice(item.menuItem).price;
        const modifierTotal = (item.modifiers ?? []).reduce((s, m) => s + m.priceAdjustment, 0);
        return sum + ((basePrice + modifierTotal) * item.quantity);
    }, 0);

    const tableStatusColor: Record<string, string> = {
        AVAILABLE: 'bg-green-500',
        OCCUPIED: 'bg-red-500',
        RESERVED: 'bg-yellow-500',
        DIRTY: 'bg-orange-500',
    };

    const tableStatusLabel: Record<string, string> = {
        AVAILABLE: 'متاح',
        OCCUPIED: 'مشغول',
        RESERVED: 'محجوز',
        DIRTY: 'تنظيف',
    };

    return (
        <>
            {pendingItem && (
                <ModifierPickerModal
                    open={!!pendingItem}
                    menuItemId={pendingItem.id}
                    menuItemName={pendingItem.name}
                    onConfirm={handleModifierConfirm}
                    onCancel={() => setPendingItem(null)}
                />
            )}

            <div className="flex h-full gap-4">
                <div className="flex-1 flex flex-col gap-4 min-h-0">
                    <div className="bg-card p-4 rounded-lg shadow-sm border flex items-center gap-4 shrink-0">
                        <ConnectionDot connected={true} className="mr-auto order-last" />

                        <div className="flex items-center gap-1 bg-muted rounded-lg p-1 shrink-0">
                            <button
                                onClick={() => setView('order')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'order' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <ClipboardList className="w-4 h-4" /> طلب
                            </button>
                            <button
                                onClick={() => setView('tables')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'tables' ? 'bg-primary text-primary-foreground shadow' : 'text-muted-foreground hover:text-foreground'}`}
                            >
                                <LayoutGrid className="w-4 h-4" /> الطاولات
                            </button>
                        </div>

                        <span className="font-bold text-lg">اختر الطاولة:</span>

                        {readyOrdersCount > 0 && (
                            <div className="flex items-center gap-1.5 rounded-full bg-green-500/15 border border-green-400/50 px-3 py-1 text-xs font-bold text-green-700 dark:text-green-400 animate-pulse mr-auto ml-0">
                                <span>🔔</span>
                                <span>{readyOrdersCount} طلب جاهز للتسليم</span>
                            </div>
                        )}

                        <Popover open={tableComboOpen} onOpenChange={setTableComboOpen}>
                            <PopoverTrigger asChild>
                                <button
                                    role="combobox"
                                    aria-expanded={tableComboOpen}
                                    className="flex items-center justify-between gap-2 h-9 w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm hover:bg-accent/50 transition-colors"
                                    dir="rtl"
                                >
                                    {selectedTable ? (() => {
                                        const t = tables.find(table => table.id === selectedTable);
                                        return t ? (
                                            <span className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full shrink-0 ${tableStatusColor[t.status] ?? 'bg-gray-500'}`} />
                                                <span className="truncate">طاولة {t.number}</span>
                                            </span>
                                        ) : <span className="text-muted-foreground">رقم الطاولة</span>;
                                    })() : <span className="text-muted-foreground">رقم الطاولة</span>}
                                    <ChevronsUpDown className="w-4 h-4 shrink-0 text-muted-foreground" />
                                </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[220px] p-0" align="end" dir="rtl">
                                <div className="flex items-center gap-2 px-3 py-2 border-b">
                                    <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <input
                                        autoFocus
                                        placeholder="ابحث باسم الطاولة..."
                                        value={tableSearch}
                                        onChange={e => setTableSearch(e.target.value)}
                                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                                        dir="rtl"
                                    />
                                </div>
                                <div className="max-h-52 overflow-y-auto py-1">
                                    {tables.filter(table =>
                                        table.number.toLowerCase().includes(tableSearch.toLowerCase())
                                    ).length === 0 ? (
                                        <p className="text-center text-sm text-muted-foreground py-4">لا توجد نتائج</p>
                                    ) : (
                                        tables
                                            .filter(table => table.number.toLowerCase().includes(tableSearch.toLowerCase()))
                                            .map(table => (
                                                <button
                                                    key={table.id}
                                                    className={cn(
                                                        'flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted/60 transition-colors text-right',
                                                        selectedTable === table.id && 'bg-primary/10 text-primary font-medium'
                                                    )}
                                                    onClick={() => {
                                                        setSelectedTable(table.id);
                                                        setTableComboOpen(false);
                                                        setTableSearch('');
                                                    }}
                                                >
                                                    <span className={`w-2 h-2 rounded-full shrink-0 ${tableStatusColor[table.status] ?? 'bg-gray-500'}`} />
                                                    <span>طاولة {table.number}</span>
                                                    <span className="text-xs text-muted-foreground mr-auto">({tableStatusLabel[table.status] ?? table.status})</span>
                                                </button>
                                            ))
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>

                    {view === 'tables' && (
                        <div className="flex-1 bg-card rounded-lg shadow-sm border p-4 overflow-y-auto">
                            <p className="text-sm text-muted-foreground mb-4">افتح الطاولة لتمكين الزبون من الطلب عبر QR</p>
                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                {tables.map(table => {
                                    const isOccupied = table.status === 'OCCUPIED';
                                    return (
                                        <button
                                            key={table.id}
                                            onClick={() => (table.status === 'AVAILABLE' || table.status === 'OCCUPIED') && handleTableToggle(table.id, table.status)}
                                            disabled={isPending || (table.status !== 'AVAILABLE' && table.status !== 'OCCUPIED')}
                                            className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all font-bold gap-2 ${
                                                isOccupied
                                                    ? 'border-red-400 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
                                                    : table.status === 'AVAILABLE'
                                                        ? 'border-green-400 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 hover:border-green-600'
                                                        : 'border-muted bg-muted/30 text-muted-foreground cursor-not-allowed'
                                            }`}
                                        >
                                            <span className={`w-3 h-3 rounded-full ${tableStatusColor[table.status] ?? 'bg-gray-400'}`} />
                                            <span className="text-lg">#{table.number}</span>
                                            <span className="text-xs font-normal">{tableStatusLabel[table.status] ?? table.status}</span>
                                            {(table.status === 'AVAILABLE' || table.status === 'OCCUPIED') && (
                                                <span className={`text-[10px] mt-1 px-2 py-0.5 rounded-full font-bold ${isOccupied ? 'bg-red-100 text-red-600 dark:bg-red-900/40' : 'bg-green-100 text-green-600 dark:bg-green-900/40'}`}>
                                                    {isOccupied ? 'إغلاق' : 'فتح'}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <Tabs defaultValue="all_food" className={`flex-1 flex flex-col bg-card rounded-lg shadow-sm border items-start min-h-0 ${view === 'tables' ? 'hidden' : ''}`} dir="rtl">
                        <TabsList className="w-full justify-start h-16 p-2 bg-muted/50 border-b rounded-t-lg rounded-b-none shrink-0">
                            <TabsTrigger value="all_food" className="h-full px-8 text-lg gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                <UtensilsCrossed className="w-5 h-5" /> الكل
                            </TabsTrigger>
                            {categories.map(category => (
                                <TabsTrigger
                                    key={category.id}
                                    value={category.id}
                                    className="h-full px-8 text-lg gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                                >
                                    <Pizza className="w-5 h-5" /> {category.name}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        <div className="flex-1 w-full bg-muted/20 p-4 overflow-hidden flex flex-col min-h-0">
                            <CategoryView value="all_food" categories={categories} onAdd={addToCart} onAddWithModifiers={addToCartWithModifiers} />
                            {categories.map(category => (
                                <CategoryView key={category.id} value={category.id} categories={[category]} onAdd={addToCart} onAddWithModifiers={addToCartWithModifiers} />
                            ))}
                        </div>
                    </Tabs>
                </div>

                <Card className="w-96 flex flex-col h-full border-2 border-primary/20 shadow-lg">
                    <CardContent className="p-4 flex flex-col h-full">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b pb-4">
                            <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">{cart.length}</span>
                            الطلب الحالي
                        </h2>

                        <ScrollArea className="flex-1 -mx-4 px-4">
                            <div className="space-y-4">
                                {cart.length === 0 ? (
                                    <EmptyState
                                        icon={ShoppingCart}
                                        title="السلة فارغة"
                                        description="اضغط على العناصر لإضافتها للطلب"
                                    />
                                ) : (
                                    cart.map(item => (
                                        <div key={item.cartKey} className="flex gap-3 bg-muted/50 p-3 rounded-lg border">
                                            <div className="w-16 h-16 bg-muted rounded-md overflow-hidden shrink-0 relative">
                                                {item.menuItem.image ? (
                                                    <img src={item.menuItem.image} alt={item.menuItem.name} className="absolute inset-0 w-full h-full object-cover" />
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground"><UtensilsCrossed className="w-6 h-6 opacity-20" /></div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <div className="font-semibold text-sm">{item.menuItem.name}</div>
                                                {item.modifiers && item.modifiers.length > 0 && (
                                                    <div className="text-xs text-muted-foreground mt-0.5">
                                                        {item.modifiers.map(m => m.name).join(' • ')}
                                                    </div>
                                                )}
                                                {(() => {
                                                    const ep = getEffectivePrice(item.menuItem);
                                                    const modTotal = (item.modifiers ?? []).reduce((s, m) => s + m.priceAdjustment, 0);
                                                    const effectivePrice = ep.price + modTotal;
                                                    return ep.discountPct ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="text-primary font-bold">{effectivePrice.toFixed(0)} د.ع</span>
                                                            <span className="text-xs text-muted-foreground line-through">{ep.originalPrice.toFixed(0)}</span>
                                                            <span className="text-xs bg-green-100 text-green-700 font-bold px-1 rounded">-{ep.discountPct}%</span>
                                                        </div>
                                                    ) : (
                                                        <div className="text-primary font-bold">{effectivePrice.toFixed(0)} د.ع</div>
                                                    );
                                                })()}
                                                <div className="flex items-center gap-3 mt-2">
                                                    <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQuantity(item.cartKey, -1)}>
                                                        <Minus className="h-3 w-3" />
                                                    </Button>
                                                    <span className="font-mono font-bold w-4 text-center">{item.quantity}</span>
                                                    <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQuantity(item.cartKey, 1)}>
                                                        <Plus className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" className="text-destructive h-8 w-8 -mr-2" onClick={() => removeFromCart(item.cartKey)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </ScrollArea>

                        <div className="border-t pt-4 mt-4 space-y-4">
                            <div className="flex justify-between items-center text-lg font-black">
                                <span>المجموع الكلي:</span>
                                <span className="text-2xl text-primary">{totalAmount.toFixed(0)} د.ع</span>
                            </div>
                            <Button
                                className="w-full h-14 text-xl font-bold shadow-lg shadow-primary/20"
                                onClick={handleSubmit}
                                disabled={isPending || cart.length === 0}
                            >
                                {isPending ? (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="animate-spin" /> جاري الإرسال...
                                    </div>
                                ) : (
                                    'تأكيد الطلب وإرسال للمطبخ'
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}

function CategoryView({ value, categories, onAdd, onAddWithModifiers }: { value: string; categories: (Category & { items: MenuItemWithOffers[] })[]; onAdd: (item: MenuItemWithOffers) => void; onAddWithModifiers: (item: MenuItemWithOffers) => void }) {
    return (
        <TabsContent value={value} className="flex-1 m-0 data-[state=active]:flex flex-col gap-6 overflow-y-auto pr-2 pb-20 min-h-0">
            {categories.map(category => (
                <div key={category.id}>
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-foreground">
                        <span className="w-1 h-6 bg-primary rounded-full"></span>
                        {category.name}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {category.items.map(item => {
                            const ep = getEffectivePrice(item);
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => onAdd(item)}
                                    className="bg-card hover:border-primary border-2 border-transparent transition-all duration-200 p-0 rounded-xl shadow-sm hover:shadow-md text-right overflow-hidden group flex flex-col relative"
                                >
                                    {ep.discountPct && (
                                        <div className="absolute top-2 right-2 z-10 bg-green-500 text-white text-xs font-black px-1.5 py-0.5 rounded-full">
                                            -{ep.discountPct}%
                                        </div>
                                    )}
                                    {(item._count?.modifierGroups ?? 0) > 0 && (
                                        <button
                                            className="absolute top-2 left-2 z-20 bg-background/80 hover:bg-primary hover:text-primary-foreground text-muted-foreground w-7 h-7 rounded-full flex items-center justify-center transition-colors shadow-sm border"
                                            title="اختر إضافات وخيارات"
                                            onClick={(e) => { e.stopPropagation(); onAddWithModifiers(item); }}
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>
                                        </button>
                                    )}
                                    <div className="aspect-video w-full bg-muted relative">
                                        {item.image ? (
                                            <img src={item.image} alt={item.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground"><UtensilsCrossed className="w-8 h-8 opacity-20" /></div>
                                        )}
                                    </div>
                                    <div className="p-3 flex flex-col flex-1 w-full">
                                        <div className="font-bold text-gray-900 mb-1 group-hover:text-primary transition-colors">{item.name}</div>
                                        {ep.offerName && (
                                            <div className="text-xs text-green-600 font-medium truncate">{ep.offerName}</div>
                                        )}
                                        <div className="mt-auto flex justify-between items-center w-full">
                                            <div>
                                                <span className="font-black text-lg">{ep.price.toFixed(0)}</span>
                                                {ep.discountPct && (
                                                    <span className="text-xs text-muted-foreground line-through mr-1">{ep.originalPrice.toFixed(0)}</span>
                                                )}
                                            </div>
                                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                                                <Plus className="w-5 h-5" />
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}
        </TabsContent>
    );
}
