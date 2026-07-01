'use client';

import { useState, useEffect, useMemo } from 'react';
import { Category, MenuItem, Offer, Table } from '@prisma/client';
import { ShoppingCart } from 'lucide-react';
import { QRMenu } from '@/components/customer/qr-menu';
import { QRCart, CartItem } from '@/components/customer/qr-cart';
import { QROrderTracker } from '@/components/customer/qr-order-tracker';
import { useToast } from '@/hooks/use-toast';

type POSMenuItem = MenuItem & { offers: Offer[]; _count: { modifierGroups: number } };

interface OrderClientProps {
    tenant: { id: string; name: string; logoUrl: string | null; primaryColor: string };
    table: Pick<Table, 'id' | 'number' | 'status'> | null;
    categories: Category[];
    menuItems: POSMenuItem[];
    sessionToken: string;
    tenantSlug: string;
}

export function OrderClient({ tenant, table, categories, menuItems, sessionToken, tenantSlug }: OrderClientProps) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [cartOpen, setCartOpen] = useState(false);
    const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    // Total quantity in the cart per menu item (summed across modifier variants)
    const quantities = useMemo(() => {
        const map: Record<string, number> = {};
        for (const i of cart) map[i.menuItem.id] = (map[i.menuItem.id] ?? 0) + i.quantity;
        return map;
    }, [cart]);

    // Set the session cookie on mount
    useEffect(() => {
        document.cookie = `qr_session=${sessionToken}; path=/; max-age=${60 * 60 * 24}; SameSite=Lax`;
    }, [sessionToken]);

    const addToCart = (item: POSMenuItem, modifiers?: import('@/components/menu/modifier-picker-modal').SelectedModifier[]) => {
        const cartKey = item.id + (modifiers && modifiers.length > 0 ? ':' + modifiers.map(m => m.modifierOptionId).sort().join(',') : '');
        setCart(prev => {
            const existing = prev.find(i => i.cartKey === cartKey);
            if (existing) return prev.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i);
            return [...prev, { menuItem: item, quantity: 1, modifiers, cartKey, notes: '' }];
        });
    };

    const updateQuantity = (cartKey: string, delta: number) => {
        setCart(prev => prev.map(i => {
            if (i.cartKey !== cartKey) return i;
            const q = i.quantity + delta;
            return q > 0 ? { ...i, quantity: q } : i;
        }).filter(i => i.quantity > 0));
    };

    const removeFromCart = (cartKey: string) => setCart(prev => prev.filter(i => i.cartKey !== cartKey));

    const handleSubmit = async (orderNote?: string) => {
        if (cart.length === 0) return;
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/qr/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenantSlug,
                    tableId: table?.id,
                    items: cart.map(i => ({
                        menuItemId: i.menuItem.id,
                        quantity: i.quantity,
                        notes: i.notes,
                        modifiers: i.modifiers?.map(m => ({ modifierOptionId: m.modifierOptionId })),
                    })),
                    note: orderNote,
                }),
            });
            const data = await res.json();
            if (!res.ok) {
                toast({ variant: 'destructive', title: 'خطأ', description: data.error || 'فشل إرسال الطلب' });
            } else {
                setSubmittedOrderId(data.orderId);
                setCart([]);
                setCartOpen(false);
            }
        } catch {
            toast({ variant: 'destructive', title: 'خطأ', description: 'تعذر الاتصال بالخادم' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submittedOrderId) {
        return (
            <QROrderTracker
                orderId={submittedOrderId}
                tenantSlug={tenantSlug}
                tenantId={tenant.id}
                tableId={table?.id}
                onNewOrder={() => setSubmittedOrderId(null)}
            />
        );
    }

    return (
        <div className="customer-page min-h-screen bg-muted/30" dir="rtl">
            {/* Header */}
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b shadow-sm">
                <div className="max-w-6xl mx-auto h-14 px-4 sm:px-6 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                        {tenant.logoUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={tenant.logoUrl} alt={tenant.name} className="h-9 w-9 rounded-full object-cover ring-1 ring-black/5 shrink-0" />
                        )}
                        <div className="min-w-0">
                            <p className="font-bold text-sm sm:text-base truncate leading-tight">{tenant.name}</p>
                            {table && <p className="text-xs text-muted-foreground">طاولة {table.number}</p>}
                        </div>
                    </div>
                    {cart.length > 0 && (
                        <button
                            onClick={() => setCartOpen(true)}
                            className="relative flex items-center gap-2 bg-primary text-primary-foreground rounded-full h-10 px-4 font-bold shadow hover:opacity-95 active:scale-95 transition-all shrink-0"
                        >
                            <ShoppingCart className="h-5 w-5" />
                            <span className="hidden sm:inline text-sm">السلة</span>
                            <span className="absolute -top-1.5 -left-1.5 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center">
                                {cart.reduce((s, i) => s + i.quantity, 0)}
                            </span>
                        </button>
                    )}
                </div>
            </header>

            <QRMenu
                categories={categories}
                menuItems={menuItems}
                onAddToCart={addToCart}
                quantities={quantities}
            />

            <QRCart
                open={cartOpen}
                onClose={() => setCartOpen(false)}
                cart={cart}
                onUpdateQuantity={updateQuantity}
                onRemove={removeFromCart}
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
            />
        </div>
    );
}
