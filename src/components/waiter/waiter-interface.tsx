'use client';

import { useState, useTransition } from 'react';
import { Category, MenuItem, Table } from '@prisma/client';
import { createOrder } from '@/lib/actions/pos';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
    ShoppingCart,
    X,
    Plus,
    Minus,
    ChevronRight,
    Send,
    UtensilsCrossed,
    CheckCircle2,
    Armchair,
} from 'lucide-react';
import { useFmt } from '@/contexts/number-locale-context';

type MenuItemWithCategory = MenuItem & { category: Category };

interface CartItem {
    menuItem: MenuItemWithCategory;
    quantity: number;
}

interface WaiterInterfaceProps {
    categories: Category[];
    menuItems: MenuItemWithCategory[];
    tables: Table[];
    waiterName: string;
}

export function WaiterInterface({
    categories,
    menuItems,
    tables,
    waiterName,
}: WaiterInterfaceProps) {
    const fmt = useFmt();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    // Step 1 = pick table, Step 2 = pick items, Step 3 = confirm
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [selectedTable, setSelectedTable] = useState<Table | null>(null);
    const [activeCategory, setActiveCategory] = useState<string | null>(
        categories[0]?.id ?? null
    );
    const [cart, setCart] = useState<CartItem[]>([]);
    const [_showCart, _setShowCart] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState(false);

    const availableTables = tables.filter(
        t => t.status === 'AVAILABLE' || t.status === 'OCCUPIED'
    );
    const filteredItems = activeCategory
        ? menuItems.filter(m => m.categoryId === activeCategory)
        : menuItems;

    const cartTotal = cart.reduce((s, i) => s + i.menuItem.price * i.quantity, 0);
    const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

    function addToCart(item: MenuItemWithCategory) {
        setCart(prev => {
            const existing = prev.find(c => c.menuItem.id === item.id);
            if (existing) {
                return prev.map(c =>
                    c.menuItem.id === item.id
                        ? { ...c, quantity: c.quantity + 1 }
                        : c
                );
            }
            return [...prev, { menuItem: item, quantity: 1 }];
        });
    }

    function removeFromCart(itemId: string) {
        setCart(prev => {
            const existing = prev.find(c => c.menuItem.id === itemId);
            if (existing && existing.quantity > 1) {
                return prev.map(c =>
                    c.menuItem.id === itemId
                        ? { ...c, quantity: c.quantity - 1 }
                        : c
                );
            }
            return prev.filter(c => c.menuItem.id !== itemId);
        });
    }

    function getItemQty(itemId: string) {
        return cart.find(c => c.menuItem.id === itemId)?.quantity ?? 0;
    }

    function handleSubmitOrder() {
        if (!selectedTable || cart.length === 0) return;
        startTransition(async () => {
            const res = await createOrder({
                tableId: selectedTable.id,
                items: cart.map(c => ({
                    menuItemId: c.menuItem.id,
                    quantity: c.quantity,
                    notes: '',
                })),
            });
            if (res.success) {
                setOrderSuccess(true);
                setCart([]);
                setStep(1);
                setSelectedTable(null);
                setTimeout(() => setOrderSuccess(false), 3000);
            } else {
                toast({
                    title: 'فشل إرسال الطلب',
                    description: 'حدث خطأ، يرجى المحاولة مرة أخرى',
                    variant: 'destructive',
                });
            }
        });
    }

    // ── SUCCESS SPLASH ──
    if (orderSuccess) {
        return (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-center bg-background">
                <div className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center">
                    <CheckCircle2 className="w-12 h-12 text-green-500" />
                </div>
                <h2 className="text-2xl font-black text-foreground">تم إرسال الطلب!</h2>
                <p className="text-muted-foreground">المطبخ تلقّى الطلب وبدأ التحضير</p>
            </div>
        );
    }

    return (
        <div dir="rtl" className="h-full flex flex-col bg-background overflow-hidden relative">

            {/* ── HEADER ── */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-card border-b">
                <div>
                    <p className="text-xs text-muted-foreground">مرحباً،</p>
                    <p className="font-black text-sm text-foreground">{waiterName}</p>
                </div>
                {step > 1 && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-primary">
                            طاولة {selectedTable?.number}
                        </span>
                        <ChevronRight className="w-3 h-3" />
                        <span>الطلب</span>
                    </div>
                )}
            </div>

            {/* ── STEP 1: TABLE PICKER ── */}
            {step === 1 && (
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <h2 className="text-lg font-black text-foreground">اختر الطاولة</h2>
                    <div className="grid grid-cols-3 gap-3">
                        {availableTables.map(table => (
                            <button
                                key={table.id}
                                onClick={() => { setSelectedTable(table); setStep(2); }}
                                className={cn(
                                    'flex flex-col items-center justify-center gap-1 rounded-2xl border-2 p-4 min-h-[90px] transition-all active:scale-95',
                                    table.status === 'OCCUPIED'
                                        ? 'border-orange-400/60 bg-orange-500/8 text-orange-600 dark:text-orange-400'
                                        : 'border-green-400/60 bg-green-500/8 text-green-600 dark:text-green-400'
                                )}
                            >
                                <Armchair className="w-6 h-6" />
                                <span className="font-black text-lg leading-none">{table.number}</span>
                                <span className="text-[10px]">
                                    {table.status === 'OCCUPIED' ? 'مشغول' : 'متاح'}
                                </span>
                            </button>
                        ))}
                    </div>
                    {availableTables.length === 0 && (
                        <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
                            <Armchair className="w-12 h-12 opacity-30" />
                            <p className="text-sm">لا توجد طاولات متاحة حالياً</p>
                        </div>
                    )}
                </div>
            )}

            {/* ── STEP 2: MENU BROWSER ── */}
            {step === 2 && (
                <>
                    {/* Category Tabs */}
                    <div className="shrink-0 flex gap-2 overflow-x-auto px-4 py-2.5 border-b scrollbar-none">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                onClick={() => setActiveCategory(cat.id)}
                                className={cn(
                                    'shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-all',
                                    activeCategory === cat.id
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                )}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>

                    {/* Menu Grid */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="grid grid-cols-2 gap-3 p-4">
                            {filteredItems.map(item => {
                                const qty = getItemQty(item.id);
                                return (
                                    <div
                                        key={item.id}
                                        className="rounded-2xl border bg-card overflow-hidden flex flex-col"
                                    >
                                        <div className="flex-1 p-3">
                                            <div className="w-full h-16 rounded-xl bg-muted/40 flex items-center justify-center mb-2">
                                                <UtensilsCrossed className="w-7 h-7 text-muted-foreground/40" />
                                            </div>
                                            <p className="font-bold text-sm leading-tight line-clamp-2">{item.name}</p>
                                            <p className="text-primary font-black text-sm mt-1">
                                                {fmt(item.price)} د.ع
                                            </p>
                                        </div>
                                        <div className="border-t px-3 py-2">
                                            {qty === 0 ? (
                                                <button
                                                    onClick={() => addToCart(item)}
                                                    className="w-full flex items-center justify-center gap-1 rounded-lg bg-primary text-primary-foreground py-1.5 text-sm font-bold active:scale-95 transition-transform"
                                                >
                                                    <Plus className="w-4 h-4" /> إضافة
                                                </button>
                                            ) : (
                                                <div className="flex items-center justify-between">
                                                    <button
                                                        onClick={() => removeFromCart(item.id)}
                                                        className="w-8 h-8 rounded-full bg-muted flex items-center justify-center active:scale-90"
                                                    >
                                                        <Minus className="w-4 h-4" />
                                                    </button>
                                                    <span className="font-black text-lg">{qty}</span>
                                                    <button
                                                        onClick={() => addToCart(item)}
                                                        className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center active:scale-90"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Floating Cart Button */}
                    {cartCount > 0 && (
                        <div className="shrink-0 p-4 border-t bg-card/80 backdrop-blur-sm">
                            <Button
                                className="w-full h-14 text-base font-black gap-3 rounded-2xl"
                                onClick={() => setStep(3)}
                            >
                                <ShoppingCart className="w-5 h-5" />
                                مراجعة الطلب
                                <Badge variant="secondary" className="bg-white/20 text-white font-black">
                                    {cartCount}
                                </Badge>
                                <span className="ms-auto font-bold text-sm opacity-80">
                                    {fmt(cartTotal)} د.ع
                                </span>
                            </Button>
                        </div>
                    )}
                </>
            )}

            {/* ── STEP 3: CART REVIEW & CONFIRM ── */}
            {step === 3 && (
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-black">مراجعة الطلب</h2>
                            <button onClick={() => setStep(2)} className="text-sm text-muted-foreground underline">
                                تعديل
                            </button>
                        </div>

                        <div className="rounded-2xl border bg-card divide-y overflow-hidden">
                            {cart.map(item => (
                                <div key={item.menuItem.id} className="flex items-center gap-3 p-3">
                                    <div className="flex-1">
                                        <p className="font-semibold text-sm">{item.menuItem.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {fmt(item.menuItem.price)} د.ع × {item.quantity}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => removeFromCart(item.menuItem.id)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <span className="font-black w-5 text-center">{item.quantity}</span>
                                        <button onClick={() => addToCart(item.menuItem)} className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                                            <Plus className="w-3 h-3" />
                                        </button>
                                        <button onClick={() => setCart(prev => prev.filter(c => c.menuItem.id !== item.menuItem.id))} className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                    <p className="font-black text-sm w-20 text-left">
                                        {fmt(item.menuItem.price * item.quantity)}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Total */}
                        <div className="rounded-2xl border bg-card p-4 flex items-center justify-between">
                            <span className="font-semibold text-muted-foreground">الإجمالي</span>
                            <span className="font-black text-xl text-primary">
                                {fmt(cartTotal)} د.ع
                            </span>
                        </div>
                    </div>

                    {/* CTA */}
                    <div className="shrink-0 p-4 border-t bg-card/80 backdrop-blur-sm space-y-2">
                        <Button
                            className="w-full h-14 text-base font-black gap-2 rounded-2xl"
                            onClick={handleSubmitOrder}
                            disabled={isPending || cart.length === 0}
                        >
                            {isPending ? (
                                'جاري الإرسال...'
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    إرسال للمطبخ — طاولة {selectedTable?.number}
                                </>
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full text-sm text-muted-foreground"
                            onClick={() => { setStep(1); setSelectedTable(null); setCart([]); }}
                        >
                            إلغاء الطلب
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
