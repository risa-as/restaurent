'use client';

import { Category, MenuItem, Offer } from '@prisma/client';
import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ModifierPickerModal, type SelectedModifier } from '@/components/menu/modifier-picker-modal';

type POSMenuItem = MenuItem & { offers: Offer[]; _count: { modifierGroups: number } };

interface QRMenuProps {
    categories: Category[];
    menuItems: POSMenuItem[];
    onAddToCart: (item: POSMenuItem, modifiers?: SelectedModifier[]) => void;
    quantities?: Record<string, number>;
}

export function QRMenu({ categories, menuItems, onAddToCart, quantities = {} }: QRMenuProps) {
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [pendingItem, setPendingItem] = useState<POSMenuItem | null>(null);

    const filtered = useMemo(() => {
        if (activeCategory === 'all') return menuItems;
        return menuItems.filter(i => i.categoryId === activeCategory);
    }, [menuItems, activeCategory]);

    const handleItemTap = (item: POSMenuItem) => {
        if (!item.isAvailable) return;
        if ((item._count?.modifierGroups ?? 0) === 0) {
            onAddToCart(item, []);
            return;
        }
        setPendingItem(item);
    };

    const handleModifierConfirm = (modifiers: SelectedModifier[]) => {
        if (pendingItem) {
            onAddToCart(pendingItem, modifiers);
            setPendingItem(null);
        }
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

            {/* Category tabs */}
            <div className="sticky top-14 z-20 bg-white/95 backdrop-blur border-b">
                <div className="max-w-6xl mx-auto px-3 sm:px-6 py-2 overflow-x-auto scrollbar-hide">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveCategory('all')}
                            className={cn(
                                'shrink-0 px-4 py-1.5 rounded-full text-sm font-bold border transition-all',
                                activeCategory === 'all'
                                    ? 'bg-primary text-primary-foreground border-primary'
                                    : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
                            )}
                        >
                            الكل
                        </button>
                        {categories.map(c => (
                            <button
                                key={c.id}
                                onClick={() => setActiveCategory(c.id)}
                                className={cn(
                                    'shrink-0 px-4 py-1.5 rounded-full text-sm font-bold border transition-all',
                                    activeCategory === c.id
                                        ? 'bg-primary text-primary-foreground border-primary'
                                        : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
                                )}
                            >
                                {c.nameAr || c.name}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Items grid */}
            <div className="max-w-6xl mx-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 p-3 sm:p-4 md:p-6 pb-32">
                {filtered.map(item => {
                    const activeOffer = item.offers.length > 0
                        ? item.offers.reduce((p, c) => c.discountPct > p.discountPct ? c : p)
                        : null;
                    const finalPrice = activeOffer
                        ? item.price * (1 - activeOffer.discountPct / 100)
                        : item.price;
                    const qty = quantities[item.id] ?? 0;
                    const inCart = qty > 0;

                    return (
                        <button
                            key={item.id}
                            onClick={() => handleItemTap(item)}
                            disabled={!item.isAvailable}
                            className={cn(
                                'group relative flex flex-col rounded-2xl border bg-white overflow-hidden text-right shadow-sm transition-all hover:shadow-md active:scale-[0.98]',
                                inCart && 'ring-2 ring-primary border-primary shadow-md',
                                !item.isAvailable && 'opacity-50 cursor-not-allowed'
                            )}
                        >
                            {/* Quantity badge — top-start corner (right in RTL) */}
                            {inCart && (
                                <span
                                    key={qty}
                                    className="absolute top-2 right-2 z-10 grid place-items-center min-w-[26px] h-[26px] px-1.5 rounded-full bg-primary text-primary-foreground text-xs font-black shadow-lg ring-2 ring-white animate-in zoom-in-50 duration-200"
                                >
                                    {qty}
                                </span>
                            )}

                            <div className="relative w-full h-28 sm:h-32 md:h-36 bg-muted">
                                {item.image ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-3xl sm:text-4xl">🍽️</div>
                                )}
                                {activeOffer && (
                                    <span className="absolute top-1.5 left-1.5 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shadow">
                                        -{activeOffer.discountPct}%
                                    </span>
                                )}
                                {!item.isAvailable && (
                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">غير متاح</span>
                                    </div>
                                )}
                            </div>
                            <div className="p-2.5 sm:p-3 flex flex-col gap-1.5 flex-1">
                                <span className="text-sm sm:text-[15px] font-bold line-clamp-2 leading-tight flex-1">
                                    {item.nameAr || item.name}
                                </span>
                                <div className="flex items-end justify-between gap-1.5 mt-auto">
                                    <div className="flex items-baseline gap-1.5 min-w-0">
                                        <span className="text-base sm:text-lg font-black text-primary">{finalPrice.toFixed(0)}</span>
                                        {activeOffer && (
                                            <span className="text-xs text-muted-foreground line-through">{item.price.toFixed(0)}</span>
                                        )}
                                        <span className="text-xs text-muted-foreground">د.ع</span>
                                    </div>
                                    {item.isAvailable && (
                                        <span className={cn(
                                            'grid place-items-center h-8 w-8 rounded-full bg-primary text-primary-foreground shrink-0 shadow-sm transition-transform group-hover:scale-105',
                                            inCart && 'ring-2 ring-primary/20'
                                        )}>
                                            <Plus className="h-4 w-4" />
                                        </span>
                                    )}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </>
    );
}
