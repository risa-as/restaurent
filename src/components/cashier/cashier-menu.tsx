'use client';

import { Category, MenuItem, Table, Offer } from '@prisma/client';
import { useState, useMemo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, ShoppingBag, Truck, Utensils, MapPin, Phone } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ModifierPickerModal, type SelectedModifier } from '@/components/menu/modifier-picker-modal';

interface POSMenuItem extends MenuItem {
    offers: Offer[];
    _count: { modifierGroups: number };
}

export type OrderType = 'dine_in' | 'takeaway' | 'delivery';

interface CashierMenuProps {
    categories: Category[];
    menuItems: POSMenuItem[];
    tables: Table[];
    orderType: OrderType;
    setOrderType: (type: OrderType) => void;
    customerPhone: string;
    setCustomerPhone: (phone: string) => void;
    customerAddress: string;
    setCustomerAddress: (address: string) => void;
    customerLat?: number;
    setCustomerLat: (lat: number) => void;
    customerLng?: number;
    setCustomerLng: (lng: number) => void;
    selectedTable: string;
    setSelectedTable: (tableId: string) => void;
    onAddToCart: (item: POSMenuItem, modifiers?: SelectedModifier[]) => void;
}

const ORDER_TYPES = [
    { value: 'takeaway', label: 'سفري', icon: ShoppingBag, color: 'text-orange-500' },
    { value: 'dine_in',  label: 'صالة',  icon: Utensils,   color: 'text-blue-500' },
    { value: 'delivery', label: 'توصيل', icon: Truck,       color: 'text-green-500' },
] as const;

const TABLE_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
    AVAILABLE: { color: 'bg-green-500',  label: 'متاح'    },
    OCCUPIED:  { color: 'bg-red-500',    label: 'مشغول'   },
    RESERVED:  { color: 'bg-yellow-500', label: 'محجوز'   },
    DIRTY:     { color: 'bg-orange-500', label: 'تنظيف'   },
};

export function CashierMenu({
    categories,
    menuItems,
    tables,
    orderType,
    setOrderType,
    customerPhone,
    setCustomerPhone,
    customerAddress,
    setCustomerAddress,
    selectedTable,
    setSelectedTable,
    onAddToCart,
}: CashierMenuProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [pendingItem, setPendingItem] = useState<POSMenuItem | null>(null);

    function handleItemTap(item: POSMenuItem) {
        if ((item._count?.modifierGroups ?? 0) === 0) {
            onAddToCart(item, []);
            return;
        }
        setPendingItem(item);
    }

    function handleModifierConfirm(modifiers: SelectedModifier[]) {
        if (pendingItem) {
            onAddToCart(pendingItem, modifiers);
            setPendingItem(null);
        }
    }

    const filteredItems = useMemo(() => {
        let items = menuItems;
        if (activeCategory !== 'all') items = items.filter(i => i.categoryId === activeCategory);
        if (searchQuery) items = items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
        return items;
    }, [menuItems, activeCategory, searchQuery]);

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
        <div className="flex flex-col h-full">
            {/* ── Order Type Selector ── */}
            <div className="shrink-0 p-3 border-b space-y-3 bg-card">
                <div className="grid grid-cols-3 gap-2">
                    {ORDER_TYPES.map(({ value, label, icon: Icon, color }) => (
                        <button
                            key={value}
                            onClick={() => setOrderType(value)}
                            className={cn(
                                'flex flex-col items-center gap-1.5 py-2.5 rounded-xl border-2 text-xs font-bold transition-all',
                                orderType === value
                                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                                    : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/40 hover:bg-muted/60'
                            )}
                        >
                            <Icon className={cn('w-4 h-4', orderType === value ? 'text-primary' : color)} />
                            {label}
                        </button>
                    ))}
                </div>

                {/* Dine-in: table selector */}
                {orderType === 'dine_in' && (
                    <Select value={selectedTable} onValueChange={setSelectedTable}>
                        <SelectTrigger className="bg-background">
                            <SelectValue placeholder="اختر الطاولة" />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                            {tables.map(t => {
                                const cfg = TABLE_STATUS_CONFIG[t.status] || { color: 'bg-gray-500', label: t.status };
                                return (
                                    <SelectItem key={t.id} value={t.id}>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.color}`} />
                                            <span>طاولة {t.number}</span>
                                            <span className="text-xs text-muted-foreground">({cfg.label})</span>
                                        </div>
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                )}

                {/* Delivery: phone + address (no map) */}
                {orderType === 'delivery' && (
                    <div className="space-y-2">
                        <div className="relative">
                            <Phone className="absolute right-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="رقم الهاتف"
                                value={customerPhone}
                                onChange={e => setCustomerPhone(e.target.value)}
                                className="pr-8"
                                dir="ltr"
                            />
                        </div>
                        <div className="relative">
                            <MapPin className="absolute right-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="العنوان التفصيلي"
                                value={customerAddress}
                                onChange={e => setCustomerAddress(e.target.value)}
                                className="pr-8"
                            />
                        </div>
                    </div>
                )}

                {/* Search */}
                <div className="relative">
                    <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="بحث في القائمة..."
                        className="pr-8"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* ── Category Tabs ── */}
            <div className="shrink-0 border-b bg-card px-3 py-2">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <button
                        onClick={() => setActiveCategory('all')}
                        className={cn(
                            'shrink-0 px-3 py-1 rounded-full text-xs font-bold border transition-all',
                            activeCategory === 'all'
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-muted/40 text-muted-foreground border-border hover:border-primary/40'
                        )}
                    >
                        الكل
                    </button>
                    {categories.map(c => (
                        <button
                            key={c.id}
                            onClick={() => setActiveCategory(c.id)}
                            className={cn(
                                'shrink-0 px-3 py-1 rounded-full text-xs font-bold border transition-all',
                                activeCategory === c.id
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-muted/40 text-muted-foreground border-border hover:border-primary/40'
                            )}
                        >
                            {c.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Menu Grid ── */}
            <ScrollArea className="flex-1">
                {filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                        <Search className="w-8 h-8 opacity-20" />
                        <p className="text-sm">لا توجد أصناف</p>
                    </div>
                ) : (
                    <div className="grid gap-2.5 p-3 pb-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
                        {filteredItems.map(item => {
                            const activeOffer = item.offers.length > 0
                                ? item.offers.reduce((prev, curr) => curr.discountPct > prev.discountPct ? curr : prev)
                                : null;
                            const finalPrice = activeOffer
                                ? item.price * (1 - activeOffer.discountPct / 100)
                                : item.price;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => item.isAvailable && handleItemTap(item)}
                                    disabled={!item.isAvailable}
                                    className={cn(
                                        'flex flex-col rounded-xl border-2 overflow-hidden text-right transition-all duration-150',
                                        'hover:border-primary hover:shadow-md active:scale-95',
                                        'border-border bg-card',
                                        !item.isAvailable && 'opacity-40 cursor-not-allowed'
                                    )}
                                >
                                    {/* Image */}
                                    <div className="relative w-full h-20 bg-muted overflow-hidden">
                                        {item.image ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Utensils className="w-6 h-6 text-muted-foreground/30" />
                                            </div>
                                        )}
                                        {activeOffer && (
                                            <Badge
                                                variant="destructive"
                                                className="absolute top-1 left-1 text-[10px] px-1.5 h-4 font-black"
                                            >
                                                -{activeOffer.discountPct}%
                                            </Badge>
                                        )}
                                        {!item.isAvailable && (
                                            <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                                                <span className="text-xs font-bold text-muted-foreground">غير متاح</span>
                                            </div>
                                        )}
                                    </div>
                                    {/* Info */}
                                    <div className="p-2 flex flex-col gap-0.5">
                                        <span className="text-xs font-semibold line-clamp-1 leading-tight">{item.name}</span>
                                        <div className="flex items-baseline gap-1.5">
                                            <span className="text-sm font-black text-primary">{finalPrice.toFixed(0)}</span>
                                            {activeOffer && (
                                                <span className="text-[10px] text-muted-foreground line-through">{item.price.toFixed(0)}</span>
                                            )}
                                            <span className="text-[10px] text-muted-foreground">د.ع</span>
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </ScrollArea>
        </div>
        </>
    );
}
