'use client';

import { MenuItem, Offer } from '@prisma/client';
import type { SelectedModifier } from '@/components/menu/modifier-picker-modal';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Minus, Trash2, ShoppingCart, Search, Banknote, CreditCard, UserPlus } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { useTransition, useMemo, useState } from 'react';
import { useFmt } from '@/contexts/number-locale-context';
import { getCustomerByPhone } from '@/lib/actions/loyalty';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';

interface POSMenuItem extends MenuItem {
    offers: Offer[];
}

export interface CartItem {
    menuItem: POSMenuItem;
    quantity: number;
    notes?: string;
    modifiers?: SelectedModifier[];
    cartKey: string;
}

interface CashierCartProps {
    cart: CartItem[];
    customerPhone: string;
    setCustomerPhone: (phone: string) => void;
    onUpdateQuantity: (id: string, delta: number) => void;
    onRemove: (id: string) => void;
    onClear: () => void;
    onSubmit: (pointsToRedeemed?: number, paymentMethod?: 'CASH' | 'CARD') => Promise<void>;
    loyaltyEnabled?: boolean;
}

export function CashierCart({ cart, customerPhone, setCustomerPhone, onUpdateQuantity, onRemove, onClear, onSubmit, loyaltyEnabled = false }: CashierCartProps) {
    const [isPending, startTransition] = useTransition();
    const [customerState, setCustomerState] = useState<any | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [pointsToRedeem, setPointsToRedeem] = useState(0); // عدد النقاط
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD'>('CASH');
    const [showLoyalty, setShowLoyalty] = useState(false);
    const { toast } = useToast();
    const fmt = useFmt();

    // قيمة النقطة الواحدة بالدينار من إعدادات المطعم
    const pointValueIqd: number = customerState?.loyaltyPointValueIqd ?? 100;
    // قيمة الخصم بالدينار = عدد النقاط × قيمة النقطة
    const discountIqd = pointsToRedeem * pointValueIqd;

    const handleSearchCustomer = async () => {
        if (!customerPhone) return;
        setIsSearching(true);
        const cust = await getCustomerByPhone(customerPhone);
        if (cust) {
            setCustomerState(cust);
            toast({ title: "تم العثور على العميل", description: `رصيد النقاط: ${cust.totalPoints} نقطة` });
        } else {
            setCustomerState(null);
            setPointsToRedeem(0);
            toast({ title: "عميل جديد", description: "سيتم إنشاء حساب له تلقائياً بعد الطلب." });
        }
        setIsSearching(false);
    };

    const totalAmount = useMemo(() => {
        return cart.reduce((acc, item) => {
            let price = item.menuItem.price;
            if (item.menuItem.offers.length > 0) {
                const bestOffer = item.menuItem.offers.reduce((prev, curr) => {
                    return (curr.discountPct > prev.discountPct) ? curr : prev;
                }, item.menuItem.offers[0]);
                price = price - (price * bestOffer.discountPct / 100);
            }
            const modifierTotal = (item.modifiers ?? []).reduce((s, m) => s + m.priceAdjustment, 0);
            return acc + ((price + modifierTotal) * item.quantity);
        }, 0);
    }, [cart]);

    const handleSubmit = () => {
        startTransition(async () => {
            // نُرسل قيمة الخصم بالدينار (لا عدد النقاط)
            await onSubmit(discountIqd, paymentMethod);
            setCustomerState(null);
            setPointsToRedeem(0);
            setShowLoyalty(false);
            setCustomerPhone("");
        });
    };

    const finalAmount = Math.max(0, totalAmount - discountIqd);

    return (
        <div className="flex flex-col h-full bg-card">
            {/* Header */}
            <div className="px-4 py-3 border-b bg-muted/30 font-semibold flex justify-between items-center">
                <span className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    سلة الطلب
                </span>
                <div className="flex items-center gap-1">
                    {/* Loyalty toggle icon — only when loyalty is active */}
                    {loyaltyEnabled && (
                        <Button
                            variant={showLoyalty ? 'secondary' : 'ghost'}
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setShowLoyalty(v => !v)}
                            title="برنامج الولاء"
                        >
                            <UserPlus className="w-4 h-4" />
                        </Button>
                    )}
                    {cart.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={onClear} className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8">
                            حذف الكل
                        </Button>
                    )}
                </div>
            </div>

            {/* Loyalty panel — shown only when toggled */}
            {showLoyalty && (
                <div className="px-3 pt-2 pb-2 border-b bg-muted/10 space-y-2">
                    <div className="flex gap-2">
                        <Input
                            placeholder="رقم هاتف العميل"
                            value={customerPhone}
                            onChange={e => setCustomerPhone(e.target.value)}
                            className="h-9"
                            autoFocus
                        />
                        <Button size="sm" variant="secondary" onClick={handleSearchCustomer} disabled={!customerPhone || isSearching}>
                            {isSearching ? 'جاري...' : <Search className="w-4 h-4" />}
                        </Button>
                    </div>
                    {customerState && (
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-sm px-2 py-1.5 bg-primary/5 rounded-md border border-primary/20">
                                <span className="font-bold text-primary">{customerState.name || 'عميل'}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-muted-foreground">
                                        {customerState.totalPoints} نقطة
                                        <span className="text-primary font-bold mr-1">
                                            ({fmt(customerState.totalPoints * pointValueIqd)} د.ع)
                                        </span>
                                    </span>
                                    {customerState.totalPoints >= (customerState.loyaltyMinRedeemPoints ?? 100) && pointsToRedeem === 0 && (
                                        <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => {
                                            const maxPoints = Math.min(customerState.totalPoints, Math.floor(totalAmount / pointValueIqd));
                                            const maxIqd = maxPoints * pointValueIqd;
                                            // الخصم يجب أن يكون مضاعفاً لـ 250 دينار — يُقرَّب للأسفل
                                            const roundedIqd = Math.floor(maxIqd / 250) * 250;
                                            const actualPoints = roundedIqd / pointValueIqd;
                                            setPointsToRedeem(actualPoints);
                                        }}>استخدام</Button>
                                    )}
                                    {pointsToRedeem > 0 && (
                                        <Button size="sm" variant="ghost" className="h-6 text-xs text-destructive" onClick={() => setPointsToRedeem(0)}>إلغاء</Button>
                                    )}
                                </div>
                            </div>
                            {pointsToRedeem > 0 && (
                                <p className="text-xs text-emerald-600 font-medium px-1">
                                    ✓ سيتم استرداد {pointsToRedeem} نقطة = خصم {fmt(discountIqd)} د.ع
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Cart items */}
            <ScrollArea className="flex-1">
                {cart.length === 0 ? (
                    <EmptyState
                        icon={ShoppingCart}
                        title="السلة فارغة"
                        description="اختر عناصر من القائمة لإضافتها"
                    />
                ) : (
                    <div className="space-y-1.5 p-3 pb-4">
                        {cart.map((item) => {
                            const modifierTotal = (item.modifiers ?? []).reduce((s, m) => s + m.priceAdjustment, 0);
                            let basePrice = item.menuItem.price;
                            if (item.menuItem.offers.length > 0) {
                                const best = item.menuItem.offers.reduce((p, c) => c.discountPct > p.discountPct ? c : p);
                                basePrice = basePrice - (basePrice * best.discountPct / 100);
                            }
                            const unitPrice = basePrice + modifierTotal;
                            return (
                                <div key={item.cartKey} className="flex items-center gap-2 px-2 py-1.5 rounded-lg border bg-background hover:bg-muted/30 transition-colors">
                                    {/* Quantity controls — horizontal */}
                                    <div className="flex items-center border rounded-md overflow-hidden shrink-0">
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-none text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => onUpdateQuantity(item.cartKey, -1)}>
                                            <Minus className="h-3 w-3" />
                                        </Button>
                                        <span className="w-7 text-center text-xs font-black border-x bg-muted/30 h-7 flex items-center justify-center">{item.quantity}</span>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-none text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => onUpdateQuantity(item.cartKey, 1)}>
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                    </div>

                                    {/* Name + modifiers */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold truncate leading-tight">{item.menuItem.name}</p>
                                        {item.modifiers && item.modifiers.length > 0 && (
                                            <p className="text-[10px] text-muted-foreground truncate">
                                                {item.modifiers.map(m => m.name).join(' · ')}
                                            </p>
                                        )}
                                    </div>

                                    {/* Total price */}
                                    <span className="text-sm font-black text-primary shrink-0">
                                        {fmt(unitPrice * item.quantity)}
                                    </span>

                                    {/* Delete */}
                                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md" onClick={() => onRemove(item.cartKey)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </ScrollArea>

            {/* Footer */}
            <div className="p-3 border-t bg-muted/30 space-y-2">
                {/* Total — single line normally, expands with discount row */}
                {discountIqd > 0 ? (
                    <>
                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                            <span>الإجمالي</span>
                            <span className="font-mono">{fmt(totalAmount)} د.ع</span>
                        </div>
                        <div className="flex justify-between items-center text-sm text-emerald-600 font-bold">
                            <span>خصم النقاط ({pointsToRedeem} نقطة)</span>
                            <span dir="ltr">- {fmt(discountIqd)} د.ع</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t">
                            <span className="text-sm font-bold text-muted-foreground">الإجمالي النهائي</span>
                            <span className="text-xl font-black">{fmt(finalAmount)} <span className="text-xs font-normal text-muted-foreground">د.ع</span></span>
                        </div>
                    </>
                ) : (
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-muted-foreground">الإجمالي</span>
                        <span className="text-2xl font-black">{totalAmount.toFixed(0)} <span className="text-sm font-normal text-muted-foreground">د.ع</span></span>
                    </div>
                )}

                {/* Split button: payment toggle + submit */}
                <div className={`flex h-12 rounded-md overflow-hidden shadow-md ${cart.length === 0 || isPending ? 'opacity-60 pointer-events-none' : ''}`}>
                    {/* Payment method toggle — left strip */}
                    <button
                        type="button"
                        onClick={() => setPaymentMethod(m => m === 'CASH' ? 'CARD' : 'CASH')}
                        className={`flex flex-col items-center justify-center px-3.5 gap-0.5 text-white transition-colors shrink-0 border-l border-white/20 ${
                            paymentMethod === 'CASH'
                                ? 'bg-emerald-700 hover:bg-emerald-800'
                                : 'bg-blue-700 hover:bg-blue-800'
                        }`}
                        title="تغيير طريقة الدفع"
                    >
                        {paymentMethod === 'CASH'
                            ? <Banknote className="w-4 h-4" />
                            : <CreditCard className="w-4 h-4" />}
                        <span className="text-[10px] font-bold leading-none">
                            {paymentMethod === 'CASH' ? 'نقد' : 'بطاقة'}
                        </span>
                    </button>

                    {/* Main submit — right area */}
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={cart.length === 0 || isPending}
                        className={`flex-1 flex items-center justify-center gap-2 text-white font-bold text-base transition-colors ${
                            paymentMethod === 'CASH'
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {isPending
                            ? 'جاري التنفيذ...'
                            : <><span>إتمام الطلب</span><span className="bg-white/20 rounded px-2 py-0.5 text-sm font-black">{cart.length}</span></>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
}
