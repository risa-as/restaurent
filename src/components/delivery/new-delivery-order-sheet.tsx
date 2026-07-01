'use client';

import { useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Minus, Trash2, ShoppingBag, Bike, MapPin, Search, Loader2 } from 'lucide-react';
import { createDeliveryOrder } from '@/lib/actions/delivery';
import { useToast } from '@/hooks/use-toast';
import type { MenuItem, Category } from '@prisma/client';

const LeafletMap = dynamic(() => import('@/components/maps/leaflet-map'), {
    ssr: false,
    loading: () => <div className="h-48 bg-muted animate-pulse rounded-lg flex items-center justify-center text-sm text-muted-foreground">تحميل الخريطة...</div>,
});

type MenuItemWithCategory = MenuItem & { category: Category };
interface CartItem { menuItem: MenuItemWithCategory; quantity: number; }
interface NewDeliveryOrderSheetProps { menuItems: MenuItemWithCategory[]; onRefresh?: () => void | Promise<void>; }

export function NewDeliveryOrderSheet({ menuItems, onRefresh }: NewDeliveryOrderSheetProps) {
    const [open, setOpen] = useState(false);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [address, setAddress] = useState('');
    const [deliveryFee, setDeliveryFee] = useState(0);
    const [note, setNote] = useState('');
    const [search, setSearch] = useState('');
    const [lat, setLat] = useState<number | null>(null);
    const [lng, setLng] = useState<number | null>(null);
    // Geocoding state
    const [geoLat, setGeoLat] = useState<number | null>(null);
    const [geoLng, setGeoLng] = useState<number | null>(null);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    /** يحوّل العنوان النصي إلى إحداثيات عبر Nominatim (OpenStreetMap) */
    const geocodeAddress = async () => {
        const query = address.trim();
        if (!query) return;
        setIsGeocoding(true);
        try {
            // نضيف "العراق" تلقائياً إن لم يذكرها المستخدم لتحسين الدقة
            const searchQuery = query.toLowerCase().includes('عراق') || query.toLowerCase().includes('iraq')
                ? query
                : `${query}، العراق`;
            const res = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1&accept-language=ar`,
                { headers: { 'User-Agent': 'RestaurantDeliveryApp/1.0' } }
            );
            const results = await res.json();
            if (results.length > 0) {
                const { lat: foundLat, lon: foundLon, display_name } = results[0];
                const parsedLat = parseFloat(foundLat);
                const parsedLng = parseFloat(foundLon);
                setGeoLat(parsedLat);
                setGeoLng(parsedLng);
                setLat(parsedLat);
                setLng(parsedLng);
                toast({ title: '✅ تم تحديد الموقع', description: display_name.substring(0, 80) });
            } else {
                toast({ title: '⚠️ لم يتم العثور على الموقع', description: 'حاول كتابة العنوان بشكل أكثر تفصيلاً', variant: 'destructive' });
            }
        } catch {
            toast({ title: 'فشل البحث عن الموقع', variant: 'destructive' });
        } finally {
            setIsGeocoding(false);
        }
    };

    const filteredItems = menuItems.filter(item =>
        !item.isDeleted &&
        item.isAvailable &&
        (search === '' || item.name.toLowerCase().includes(search.toLowerCase()))
    );

    const addToCart = (item: MenuItemWithCategory) => {
        setCart(prev => {
            const existing = prev.find(c => c.menuItem.id === item.id);
            if (existing) {
                return prev.map(c => c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
            }
            return [...prev, { menuItem: item, quantity: 1 }];
        });
    };

    const changeQty = (itemId: string, delta: number) => {
        setCart(prev =>
            prev.map(c => c.menuItem.id === itemId ? { ...c, quantity: c.quantity + delta } : c)
                .filter(c => c.quantity > 0)
        );
    };

    const cartTotal = cart.reduce((sum, c) => sum + c.menuItem.price * c.quantity, 0);
    const grandTotal = cartTotal + deliveryFee;

    const handleReset = () => {
        setCart([]);
        setCustomerName('');
        setCustomerPhone('');
        setAddress('');
        setDeliveryFee(0);
        setNote('');
        setSearch('');
        setLat(null);
        setLng(null);
    };

    const handleSubmit = () => {
        if (cart.length === 0) {
            toast({ title: 'أضف عناصر للطلب', variant: 'destructive' });
            return;
        }
        if (!customerName.trim() || !customerPhone.trim() || !address.trim()) {
            toast({ title: 'يرجى تعبئة بيانات العميل كاملة', variant: 'destructive' });
            return;
        }

        startTransition(async () => {
            const res = await createDeliveryOrder(
                {
                    items: cart.map(c => ({ menuItemId: c.menuItem.id, quantity: c.quantity })),
                    note,
                },
                { customerName, customerPhone, address, deliveryFee, lat, lng }
            );

            if (res?.success) {
                toast({ title: 'تم إنشاء طلب التوصيل بنجاح' });
                handleReset();
                setOpen(false);
                await onRefresh?.();
            } else {
                toast({ title: res?.error ?? 'فشل إنشاء الطلب', variant: 'destructive' });
            }
        });
    };

    return (
        <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
                <Button className="gap-2">
                    <Bike className="w-4 h-4" />
                    طلب توصيل جديد
                </Button>
            </SheetTrigger>

            <SheetContent side="left" className="w-full sm:max-w-2xl p-0 flex flex-col" dir="rtl">
                <SheetHeader className="p-4 border-b">
                    <SheetTitle className="flex items-center gap-2">
                        <Bike className="w-5 h-5 text-primary" />
                        طلب توصيل جديد
                    </SheetTitle>
                </SheetHeader>

                <div className="flex flex-1 overflow-hidden">
                    {/* Menu Items Side */}
                    <div className="flex-1 flex flex-col border-l overflow-hidden">
                        <div className="p-3 border-b">
                            <Input
                                placeholder="ابحث عن صنف..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="h-9"
                            />
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="p-3 grid grid-cols-2 gap-2">
                                {filteredItems.map(item => {
                                    const inCart = cart.find(c => c.menuItem.id === item.id);
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => addToCart(item)}
                                            className="text-right p-3 rounded-lg border bg-card hover:border-primary hover:bg-primary/5 transition-all relative"
                                        >
                                            {inCart && (
                                                <Badge className="absolute top-2 left-2 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">
                                                    {inCart.quantity}
                                                </Badge>
                                            )}
                                            <p className="font-semibold text-sm leading-tight">{item.name}</p>
                                            <p className="text-xs text-muted-foreground mt-1">{item.category.name}</p>
                                            <p className="text-sm font-bold text-primary mt-1">{item.price.toLocaleString()} د.ع</p>
                                        </button>
                                    );
                                })}
                                {filteredItems.length === 0 && (
                                    <p className="col-span-2 text-center text-muted-foreground py-8 text-sm">لا توجد نتائج</p>
                                )}
                            </div>
                        </ScrollArea>
                    </div>

                    {/* Order Summary + Customer Info */}
                    <div className="w-72 flex flex-col overflow-hidden bg-muted/20">
                        {/* Cart Items */}
                        <ScrollArea className="flex-1">
                            <div className="p-3 space-y-3">
                                {/* Cart */}
                                <div className="space-y-2">
                                    {cart.length === 0 ? (
                                        <div className="text-center py-6 text-muted-foreground">
                                            <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                            <p className="text-xs">اختر أصنافاً من القائمة</p>
                                        </div>
                                    ) : (
                                        cart.map(c => (
                                            <div key={c.menuItem.id} className="flex items-center gap-2 bg-card rounded-lg p-2 border">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold truncate">{c.menuItem.name}</p>
                                                    <p className="text-xs text-muted-foreground">{(c.menuItem.price * c.quantity).toLocaleString()} د.ع</p>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => changeQty(c.menuItem.id, -1)}>
                                                        {c.quantity === 1 ? <Trash2 className="w-3 h-3 text-destructive" /> : <Minus className="w-3 h-3" />}
                                                    </Button>
                                                    <span className="text-xs font-bold w-4 text-center">{c.quantity}</span>
                                                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => changeQty(c.menuItem.id, 1)}>
                                                        <Plus className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="border-t" />

                                {/* Customer Info */}
                                <div className="space-y-2">
                                    <div>
                                        <Label className="text-xs">اسم العميل *</Label>
                                        <Input value={customerName} onChange={e => setCustomerName(e.target.value)} className="h-8 text-sm mt-1" placeholder="محمد أحمد" />
                                    </div>
                                    <div>
                                        <Label className="text-xs">رقم الهاتف *</Label>
                                        <Input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="h-8 text-sm mt-1 font-mono" placeholder="07XXXXXXXXX" dir="ltr" />
                                    </div>
                                    <div>
                                        <Label className="text-xs">العنوان النصي *</Label>
                                        <div className="flex gap-1 mt-1">
                                            <Input
                                                value={address}
                                                onChange={e => setAddress(e.target.value)}
                                                onKeyDown={e => e.key === 'Enter' && geocodeAddress()}
                                                className="h-8 text-sm flex-1"
                                                placeholder="الحي، الشارع، المنزل..."
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="h-8 px-2 shrink-0"
                                                onClick={geocodeAddress}
                                                disabled={isGeocoding || !address.trim()}
                                                title="ابحث عن الموقع على الخريطة"
                                            >
                                                {isGeocoding
                                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    : <Search className="w-3.5 h-3.5" />
                                                }
                                            </Button>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">اضغط 🔍 لتحديد الموقع تلقائياً من العنوان</p>
                                    </div>

                                    {/* Map picker */}
                                    <div>
                                        <Label className="text-xs flex items-center gap-1 mb-1">
                                            <MapPin className="w-3 h-3 text-primary" />
                                            موقع التوصيل
                                            {lat && lng
                                                ? <span className="text-green-600 text-[10px] mr-auto">✓ ({lat.toFixed(4)}, {lng.toFixed(4)})</span>
                                                : <span className="text-amber-500 text-[10px] mr-auto">لم يُحدَّد بعد</span>
                                            }
                                        </Label>
                                        <LeafletMap
                                            height="180px"
                                            externalLat={geoLat}
                                            externalLng={geoLng}
                                            onLocationSelect={(selLat, selLng) => {
                                                setLat(selLat);
                                                setLng(selLng);
                                            }}
                                        />
                                    </div>

                                    <div>
                                        <Label className="text-xs">رسوم التوصيل (د.ع)</Label>
                                        <Input type="number" value={deliveryFee || ''} onChange={e => setDeliveryFee(Number(e.target.value) || 0)} className="h-8 text-sm mt-1" placeholder="0" />
                                    </div>
                                    <div>
                                        <Label className="text-xs">ملاحظات</Label>
                                        <Input value={note} onChange={e => setNote(e.target.value)} className="h-8 text-sm mt-1" placeholder="اختياري..." />
                                    </div>
                                </div>

                                <div className="border-t" />

                                {/* Totals */}
                                <div className="space-y-1 text-xs">
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>المجموع</span>
                                        <span>{cartTotal.toLocaleString()} د.ع</span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>رسوم التوصيل</span>
                                        <span>{deliveryFee.toLocaleString()} د.ع</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-sm border-t pt-1">
                                        <span>الإجمالي</span>
                                        <span className="text-primary">{grandTotal.toLocaleString()} د.ع</span>
                                    </div>
                                </div>

                                <Button
                                    className="w-full gap-2"
                                    onClick={handleSubmit}
                                    disabled={isPending || cart.length === 0}
                                >
                                    <Bike className="w-4 h-4" />
                                    {isPending ? 'جاري الإرسال...' : 'إرسال للمطبخ'}
                                </Button>
                            </div>
                        </ScrollArea>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}
