'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Plus, Minus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MenuItem {
    id: string;
    name: string;
    description: string | null;
    price: number;
    imageUrl: string | null;
}

interface Category {
    id: string;
    name: string;
    items: MenuItem[];
}

interface CartItem extends MenuItem {
    quantity: number;
}

export default function CustomerMenu({
    categories,
    tenantId,
    slug,
    initialTable,
}: {
    categories: Category[];
    tenantId: string;
    slug: string;
    initialTable?: string;
}) {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [tableNumber, setTableNumber] = useState(initialTable || '');
    const [customerPhone, setCustomerPhone] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    const searchParams = useSearchParams();

    useEffect(() => {
        // أولوية: initialTable من server (موثوق) ثم ?table من URL
        if (initialTable) {
            setTableNumber(initialTable);
            return;
        }
        const tableParam = searchParams.get('table') || searchParams.get('t');
        if (tableParam) setTableNumber(tableParam);
    }, [searchParams, initialTable]);

    const addToCart = (item: MenuItem) => {
        setCart(prev => {
            const existing = prev.find(i => i.id === item.id);
            if (existing) {
                return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { ...item, quantity: 1 }];
        });
        toast({ title: 'تمت الإضافة', description: `${item.name} أضيف إلى السلة`, duration: 2000 });
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart(prev => prev.map(item => {
            if (item.id === id) {
                const newQ = item.quantity + delta;
                return newQ > 0 ? { ...item, quantity: newQ } : item;
            }
            return item;
        }));
    };

    const removeItem = (id: string) => {
        setCart(prev => prev.filter(item => item.id !== id));
    };

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    const submitOrder = async () => {
        if (!tableNumber) {
            toast({ title: 'خطأ', description: 'يرجى إدخال رقم الطاولة', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/menu/${slug}/order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenantId,
                    tableNumber,
                    customerPhone: customerPhone ? customerPhone.trim() : null,
                    items: cart.map(c => ({ menuItemId: c.id, quantity: c.quantity, price: c.price }))
                })
            });

            const data = await res.json();

            if (!res.ok) {
                toast({ title: 'تعذّر إرسال الطلب', description: data.error || 'حدث خطأ غير متوقع', variant: 'destructive' });
                return;
            }

            toast({ title: 'تم إرسال الطلب!', description: 'المطبخ يقوم بتجهيز طلبك الآن', variant: 'default' });
            setCart([]);
            setIsCartOpen(false);
        } catch (e: any) {
            toast({ title: 'حدث خطأ', description: e.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="relative pb-24">
            {categories.map(category => (
                category.items?.length > 0 && (
                    <div key={category.id} className="mb-8">
                        <h2 className="text-2xl font-bold mb-4 border-b-2 border-[var(--primary)] pb-2 inline-block text-gray-900 dark:text-white">
                            {category.name}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {category.items.map(item => (
                                <div key={item.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-gray-100 flex items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <h3 className="font-bold text-lg mb-1">{item.name}</h3>
                                        <p className="text-sm text-gray-500 line-clamp-2 mb-2">{item.description}</p>
                                        <div className="font-extrabold text-[var(--primary)]">{item.price} د.ع</div>
                                    </div>
                                    <Button
                                        onClick={() => addToCart(item)}
                                        size="sm"
                                        className="rounded-full w-10 h-10 p-0 bg-[var(--primary)] hover:opacity-90 flex-shrink-0"
                                    >
                                        <Plus className="w-5 h-5 text-white" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            ))}

            {/* Sticky Cart Bar */}
            {totalItems > 0 && !isCartOpen && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-md border-t shadow-lg z-40 transform transition-transform translate-y-0">
                    <div className="max-w-xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold bg-[var(--primary)] text-white px-3 py-1 rounded-full">
                            <ShoppingCart className="w-5 h-5" />
                            <span>{totalItems}</span>
                        </div>
                        <div className="font-bold text-lg">{total} د.ع</div>
                        <Button onClick={() => setIsCartOpen(true)} className="bg-[var(--primary)] hover:opacity-90 font-bold px-8 text-white">
                            عرض السلة
                        </Button>
                    </div>
                </div>
            )}

            {/* Cart Modal / Sheet */}
            {isCartOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in slide-in-from-bottom">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50 dark:bg-slate-800">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5" />
                                سلة الطلبات
                            </h2>
                            <Button variant="ghost" size="icon" onClick={() => setIsCartOpen(false)} className="rounded-full">
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        <div className="p-4 overflow-y-auto flex-1 space-y-4">
                            {cart.map(item => (
                                <div key={item.id} className="flex justify-between items-center gap-2 border-b pb-2">
                                    <div className="flex-1">
                                        <div className="font-bold">{item.name}</div>
                                        <div className="text-sm text-gray-500">{item.price} د.ع</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center bg-gray-100 dark:bg-slate-800 rounded-full">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => updateQuantity(item.id, -1)}><Minus className="w-4 h-4" /></Button>
                                            <span className="w-4 text-center font-bold">{item.quantity}</span>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-[var(--primary)]" onClick={() => updateQuantity(item.id, 1)}><Plus className="w-4 h-4" /></Button>
                                        </div>
                                        <Button variant="ghost" size="icon" className="text-red-500 bg-red-50 rounded-full h-8 w-8" onClick={() => removeItem(item.id)}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            <div className="pt-4">
                                <label className="block font-bold mb-2">الطاولة</label>
                                {tableNumber ? (
                                    // طاولة محددة من QR — للعرض فقط
                                    <div className="w-full border-2 border-[var(--primary)]/30 rounded-lg p-3 text-center text-lg font-bold bg-[var(--primary)]/5 text-[var(--primary)] select-none flex items-center justify-center gap-2">
                                        <span>🪑</span>
                                        <span>طاولة رقم {tableNumber}</span>
                                    </div>
                                ) : (
                                    // إدخال يدوي إذا لم تكن محددة
                                    <input
                                        type="text"
                                        className="w-full border rounded-lg p-3 text-center text-lg outline-none focus:ring-2 focus:ring-[var(--primary)] dark:bg-slate-800"
                                        placeholder="أدخل رقم طاولتك"
                                        value={tableNumber}
                                        onChange={(e) => setTableNumber(e.target.value)}
                                    />
                                )}
                            </div>

                            <div className="pt-2">
                                <label className="block font-bold mb-2">رقم الهاتف <span className="text-gray-400 font-normal text-sm">(اختياري للولاء)</span></label>
                                <input
                                    type="tel"
                                    className="w-full border rounded-lg p-3 text-center text-lg outline-none focus:ring-2 focus:ring-[var(--primary)] dark:bg-slate-800"
                                    placeholder="مثال: 07xxxxxx"
                                    value={customerPhone}
                                    onChange={(e) => setCustomerPhone(e.target.value)}
                                    dir="ltr"
                                />
                                <p className="text-xs text-center text-gray-500 mt-2">أدخل رقمك لكسب النقاط والخصومات مع كل طلب! 🌟</p>
                            </div>
                        </div>

                        <div className="p-4 border-t bg-gray-50 dark:bg-slate-800">
                            <div className="flex justify-between items-center mb-4 text-xl font-bold">
                                <span>الإجمالي:</span>
                                <span>{total} د.ع</span>
                            </div>
                            <Button
                                onClick={submitOrder}
                                disabled={isSubmitting || cart.length === 0}
                                className="w-full text-lg py-6 bg-[var(--primary)] hover:opacity-90 text-white font-bold"
                            >
                                {isSubmitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
