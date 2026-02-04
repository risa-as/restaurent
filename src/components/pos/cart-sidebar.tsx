'use client';

import { MenuItem, Table, Offer } from '@prisma/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { useState, useMemo } from 'react';
import { createOrder } from '@/lib/actions/pos';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

// Extending MenuItem to include related offers as returned by server action
interface POSMenuItem extends MenuItem {
    offers: Offer[];
}

export type CartItem = {
    menuItem: POSMenuItem;
    quantity: number;
    notes?: string;
}

interface CartSidebarProps {
    items: CartItem[];
    onUpdateQuantity: (id: string, delta: number) => void;
    onRemove: (id: string) => void;
    onClear: () => void;
    tables: Table[];
}

export function CartSidebar({ items, onUpdateQuantity, onRemove, onClear, tables }: CartSidebarProps) {
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [orderNote, setOrderNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    const total = useMemo(() => {
        return items.reduce((acc, item) => {
            let price = item.menuItem.price;
            // Best Offer Logic (Client side for display, server validates)
            if (item.menuItem.offers && item.menuItem.offers.length > 0) {
                const bestDiscount = Math.max(...item.menuItem.offers.map(o => o.discountPct));
                price = price * (1 - bestDiscount / 100);
            }
            return acc + (price * item.quantity);
        }, 0);
    }, [items]);

    async function handlePlaceOrder() {
        if (items.length === 0) return;

        setIsSubmitting(true);
        const result = await createOrder({
            tableId: (selectedTable && selectedTable !== "takeaway") ? selectedTable : undefined,
            deliveryType: selectedTable === "takeaway" ? deliveryType : undefined,
            customerPhone: (selectedTable === "takeaway" && deliveryType === 'delivery') ? customerPhone : undefined,
            customerAddress: (selectedTable === "takeaway" && deliveryType === 'delivery') ? customerAddress : undefined,
            items: items.map(i => ({
                menuItemId: i.menuItem.id,
                quantity: i.quantity,
                notes: i.notes
            })),
            note: orderNote
        });

        setIsSubmitting(false);

        if (result.success) {
            toast({
                title: "تم إرسال الطلب بنجاح",
                description: `رقم الطلب #${Date.now().toString().slice(-4)}`,
            });
            onClear();
            setSelectedTable('');
            setOrderNote('');
            setDeliveryType('pickup');
            setCustomerPhone('');
            setCustomerAddress('');
        } else {
            const errorMessage = result.error || "فشل إرسال الطلب";
            toast({
                variant: "destructive",
                title: errorMessage,
                description: "يرجى المحاولة مرة أخرى",
            });
        }
    }

    return (
        <Card className="h-full flex flex-col rounded-none shadow-none border-0 w-full overflow-hidden">
            <CardHeader className="border-b bg-muted/50 flex-none h-[60px] flex justify-center">
                <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" /> الطلب الحالي
                </CardTitle>
            </CardHeader>

            {/* Main Content Area - Split 30% Items, 50% Details, 20% Footer (approx relative to remaining space or full height) 
                The user requested: 30% Items, 50% Details, 20% Footer.
                To be safe, we will treat the area BELOW the header as the canvas for these percentages 
                or try to fit them into the 100% - header.
                Actually, simpler: Let's make the container flex-col h-full. 
            */}

            <div className="flex-1 flex flex-col min-h-0">
                {/* Section 1: Cart Items (Takes 30% of the available vertical space) */}
                <div className="basis-[30%] overflow-y-auto p-4 space-y-4 border-b min-h-0">
                    {items.length === 0 ? (
                        <div className="text-center text-muted-foreground py-10">
                            السلة فارغة
                        </div>
                    ) : (
                        items.map(item => {
                            let price = item.menuItem.price;
                            let discounted = false;
                            if (item.menuItem.offers && item.menuItem.offers.length > 0) {
                                const bestDiscount = Math.max(...item.menuItem.offers.map(o => o.discountPct));
                                price = price * (1 - bestDiscount / 100);
                                discounted = true;
                            }

                            return (
                                <div key={item.menuItem.id} className="flex flex-col gap-2 p-3 border rounded bg-card">
                                    <div className="flex justify-between items-start">
                                        <span className="font-medium text-sm">{item.menuItem.name}</span>
                                        <span className="font-bold text-sm">
                                            {(price * item.quantity).toFixed(0)} د.ع
                                        </span>
                                    </div>
                                    {discounted && <Badge variant="secondary" className="w-fit text-[10px] h-4">عرض خاص</Badge>}
                                    <div className="flex items-center justify-between mt-1">
                                        <div className="flex items-center gap-1">
                                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => onUpdateQuantity(item.menuItem.id, -1)}>
                                                <Minus className="h-3 w-3" />
                                            </Button>
                                            <span className="text-sm w-4 text-center">{item.quantity}</span>
                                            <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => onUpdateQuantity(item.menuItem.id, 1)}>
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500" onClick={() => onRemove(item.menuItem.id)}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>

                {/* Section 2: Order Details (Takes 50% of the available vertical space) */}
                <div className="basis-[50%] overflow-y-auto p-4 bg-muted/20 space-y-4 min-h-0 border-b">
                    <div className="space-y-2">
                        <label className="text-xs font-medium">الطاولة (اختياري للسفري)</label>
                        <Select value={selectedTable} onValueChange={setSelectedTable}>
                            <SelectTrigger className="text-right">
                                <SelectValue placeholder="اختر الطاولة" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="takeaway">سفري / بدون طاولة</SelectItem>
                                {tables.map(t => (
                                    <SelectItem key={t.id} value={t.id}>
                                        طاولة {t.number} ({t.status === 'AVAILABLE' ? 'متاح' : t.status === 'OCCUPIED' ? 'مشغول' : t.status === 'RESERVED' ? 'محجوز' : 'تنظيف'})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className={`grid transition-all duration-500 ease-in-out ${selectedTable === 'takeaway' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                        <div className="overflow-hidden px-1">
                            <div className="space-y-3 border-t pt-3 mt-3">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium">نوع الطلب</label>
                                    <Select value={deliveryType} onValueChange={(val: 'pickup' | 'delivery') => setDeliveryType(val)}>
                                        <SelectTrigger className="text-right h-8 text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pickup">استلام من المطعم</SelectItem>
                                            <SelectItem value="delivery">توصيل للزبون</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className={`grid transition-all duration-500 ease-in-out ${deliveryType === 'delivery' ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                    <div className="overflow-hidden space-y-3 px-1">
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium">رقم الهاتف</label>
                                            <Input
                                                placeholder="07xxxxxxxx"
                                                className="h-8 text-sm text-right"
                                                value={customerPhone}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerPhone(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-medium">العنوان</label>
                                            <Input
                                                placeholder="المنطقة، الشارع، أقرب نقطة دالة"
                                                className="h-8 text-sm text-right"
                                                value={customerAddress}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerAddress(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <Textarea
                        placeholder="ملاحظات الطلب..."
                        className="h-16 resize-none text-right"
                        value={orderNote}
                        onChange={e => setOrderNote(e.target.value)}
                    />
                </div>

                {/* Section 3: Footer (Takes 20% of the available vertical space) */}
                <div className="basis-[20%] p-4 bg-background shadow-up flex flex-col justify-center min-h-0">
                    <div className="flex justify-between items-center text-lg font-bold mb-2">
                        <span>المجموع</span>
                        <span>{total.toFixed(0)} د.ع</span>
                    </div>
                    <Button className="w-full h-12 text-lg" onClick={handlePlaceOrder} disabled={items.length === 0 || isSubmitting}>
                        {isSubmitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
                    </Button>
                </div>
            </div>
        </Card>
    );
}
