'use client';

import { MenuItem, Offer } from '@prisma/client';
import type { SelectedModifier } from '@/components/menu/modifier-picker-modal';
import { useState } from 'react';
import { X, Plus, Minus, Trash2, Loader2, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

type POSMenuItem = MenuItem & { offers: Offer[] };

export interface CartItem {
    menuItem: POSMenuItem;
    quantity: number;
    notes?: string;
    modifiers?: SelectedModifier[];
    cartKey: string;
}

interface QRCartProps {
    open: boolean;
    onClose: () => void;
    cart: CartItem[];
    onUpdateQuantity: (cartKey: string, delta: number) => void;
    onRemove: (cartKey: string) => void;
    onSubmit: (note?: string) => Promise<void>;
    isSubmitting: boolean;
}

export function QRCart({ open, onClose, cart, onUpdateQuantity, onRemove, onSubmit, isSubmitting }: QRCartProps) {
    const [note, setNote] = useState('');

    const total = cart.reduce((acc, item) => {
        let price = item.menuItem.price;
        if (item.menuItem.offers.length > 0) {
            const best = item.menuItem.offers.reduce((p, c) => c.discountPct > p.discountPct ? c : p);
            price = price * (1 - best.discountPct / 100);
        }
        const modTotal = (item.modifiers ?? []).reduce((s, m) => s + m.priceAdjustment, 0);
        return acc + (price + modTotal) * item.quantity;
    }, 0);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center" dir="rtl">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

            {/* Drawer / Modal */}
            <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl sm:mb-0 max-h-[88vh] sm:max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Handle */}
                <div className="flex justify-center pt-3 pb-1 sm:hidden">
                    <div className="w-10 h-1 bg-muted rounded-full" />
                </div>

                <div className="px-4 sm:px-5 pt-2 sm:pt-4 pb-3 flex items-center justify-between border-b">
                    <h2 className="text-lg font-black flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-primary" /> سلة الطلب
                    </h2>
                    <button
                        onClick={onClose}
                        className="grid place-items-center h-9 w-9 rounded-full text-muted-foreground hover:bg-muted transition-colors"
                        aria-label="إغلاق"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 sm:px-5 space-y-3 py-3">
                    {cart.map(item => {
                        let price = item.menuItem.price;
                        if (item.menuItem.offers.length > 0) {
                            const best = item.menuItem.offers.reduce((p, c) => c.discountPct > p.discountPct ? c : p);
                            price = price * (1 - best.discountPct / 100);
                        }
                        const modTotal = (item.modifiers ?? []).reduce((s, m) => s + m.priceAdjustment, 0);
                        const unitPrice = price + modTotal;

                        return (
                            <div key={item.cartKey} className="flex items-start gap-3 bg-muted/30 rounded-2xl p-3">
                                <div className="flex-1">
                                    <p className="font-bold text-sm">{item.menuItem.nameAr || item.menuItem.name}</p>
                                    {item.modifiers && item.modifiers.length > 0 && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {item.modifiers.map(m => m.name).join(' · ')}
                                        </p>
                                    )}
                                    <p className="text-sm font-black text-primary mt-1">
                                        {(unitPrice * item.quantity).toFixed(0)} د.ع
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="flex items-center border rounded-xl overflow-hidden bg-white">
                                        <button
                                            className="w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors"
                                            onClick={() => onUpdateQuantity(item.cartKey, -1)}
                                            aria-label="إنقاص"
                                        ><Minus className="h-4 w-4" /></button>
                                        <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                                        <button
                                            className="w-8 h-8 flex items-center justify-center hover:bg-muted transition-colors"
                                            onClick={() => onUpdateQuantity(item.cartKey, 1)}
                                            aria-label="زيادة"
                                        ><Plus className="h-4 w-4" /></button>
                                    </div>
                                    <button
                                        onClick={() => onRemove(item.cartKey)}
                                        className="grid place-items-center w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 transition-colors"
                                        aria-label="حذف"
                                    ><Trash2 className="h-4 w-4" /></button>
                                </div>
                            </div>
                        );
                    })}

                    <div>
                        <textarea
                            placeholder="ملاحظات إضافية (اختياري)..."
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            className="w-full border rounded-xl p-3 text-sm resize-none h-20 bg-background"
                        />
                    </div>
                </div>

                <div className="p-4 sm:p-5 border-t bg-white">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-muted-foreground font-medium">الإجمالي</span>
                        <span className="text-2xl font-black">{total.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">د.ع</span></span>
                    </div>
                    <button
                        onClick={() => onSubmit(note || undefined)}
                        disabled={cart.length === 0 || isSubmitting}
                        className={cn(
                            'w-full h-14 rounded-2xl text-lg font-black text-white shadow-lg transition-all flex items-center justify-center gap-2',
                            'bg-primary hover:bg-primary/90 active:scale-95',
                            (cart.length === 0 || isSubmitting) && 'opacity-50 cursor-not-allowed'
                        )}
                    >
                        {isSubmitting
                            ? <><Loader2 className="h-5 w-5 animate-spin" /> جاري الإرسال...</>
                            : `إرسال الطلب (${total.toFixed(0)} د.ع)`}
                    </button>
                </div>
            </div>
        </div>
    );
}
