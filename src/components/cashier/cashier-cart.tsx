'use client';

import { MenuItem, Offer } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Minus, Trash2, ShoppingCart } from 'lucide-react';
import { useTransition, useMemo } from 'react';

interface POSMenuItem extends MenuItem {
    offers: Offer[];
}

export interface CartItem {
    menuItem: POSMenuItem;
    quantity: number;
    notes?: string;
}

interface CashierCartProps {
    cart: CartItem[];
    onUpdateQuantity: (id: string, delta: number) => void;
    onRemove: (id: string) => void;
    onClear: () => void;
    onSubmit: () => Promise<void>;
}

export function CashierCart({ cart, onUpdateQuantity, onRemove, onClear, onSubmit }: CashierCartProps) {
    const [isPending, startTransition] = useTransition();

    const totalAmount = useMemo(() => {
        return cart.reduce((acc, item) => {
            let price = item.menuItem.price;
            if (item.menuItem.offers.length > 0) {
                const bestOffer = item.menuItem.offers.reduce((prev, curr) => {
                    return (curr.discountPct > prev.discountPct) ? curr : prev;
                }, item.menuItem.offers[0]);
                price = price - (price * bestOffer.discountPct / 100);
            }
            return acc + (price * item.quantity);
        }, 0);
    }, [cart]);

    const handleSubmit = () => {
        startTransition(async () => {
            await onSubmit();
        });
    };

    return (
        <div className="flex flex-col h-full bg-white">
            <div className="p-4 border-b bg-muted/30 font-semibold flex justify-between items-center">
                <span className="flex items-center gap-2"><ShoppingCart className="w-5 h-5" /> سلة الطلب</span>
                {cart.length > 0 && (
                    <Button variant="ghost" size="sm" onClick={onClear} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8">
                        حذف الكل
                    </Button>
                )}
            </div>

            <ScrollArea className="flex-1 p-3">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2 min-h-[200px]">
                        <ShoppingCart className="w-12 h-12 opacity-20" />
                        <p>السلة فارغة</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {cart.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm bg-gray-50 p-3 rounded-lg border">
                                <div className="flex items-center gap-3 flex-1">
                                    <div className="flex flex-col items-center border rounded bg-white shadow-sm">
                                        <Button variant="ghost" size="icon" className="h-6 w-8 rounded-none rounded-t" onClick={() => onUpdateQuantity(item.menuItem.id, 1)}>
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                        <span className="w-8 text-center text-xs font-bold py-0.5 bg-muted/20 border-y">{item.quantity}</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-8 rounded-none rounded-b" onClick={() => onUpdateQuantity(item.menuItem.id, -1)}>
                                            <Minus className="h-3 w-3" />
                                        </Button>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-medium line-clamp-1">{item.menuItem.name}</span>
                                        <span className="text-xs text-muted-foreground">{(item.menuItem.price).toFixed(0)} / للوحدة</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="font-bold text-base">{(item.menuItem.price * item.quantity).toFixed(0)}</span>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full" onClick={() => onRemove(item.menuItem.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </ScrollArea>

            <div className="p-4 border-t bg-gray-50/50">
                <div className="flex justify-between items-center mb-4 text-sm">
                    <span className="text-muted-foreground">الإجمالي الكلي</span>
                    <span className="text-2xl font-black">{totalAmount.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">د.ع</span></span>
                </div>
                <Button
                    className="w-full text-lg font-bold h-14 shadow-lg shadow-primary/20"
                    disabled={cart.length === 0 || isPending}
                    onClick={handleSubmit}
                >
                    {isPending ? 'جاري التنفيذ...' : `إتمام الطلب (${cart.length})`}
                </Button>
            </div>
        </div>
    );
}
