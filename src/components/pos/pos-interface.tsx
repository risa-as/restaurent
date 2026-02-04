'use client';

import { MenuItem, Category, Table, Offer, Order, OrderItem } from '@prisma/client';
import { useState, useMemo, useEffect } from 'react';
import { CartSidebar, CartItem } from './cart-sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, ClipboardCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useRouter } from 'next/navigation';

interface POSMenuItem extends MenuItem {
    offers: Offer[];
}

interface IncomingOrder extends Order {
    table: Table | null;
    items: (OrderItem & { menuItem: MenuItem })[];
}

interface POSInterfaceProps {
    categories: Category[];
    menuItems: POSMenuItem[];
    tables: Table[];
    initialPendingOrders: IncomingOrder[];
}

export function POSInterface({ categories, menuItems, tables, initialPendingOrders }: POSInterfaceProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>("all");
    const [cart, setCart] = useState<CartItem[]>([]);
    const [pendingOrders, setPendingOrders] = useState<IncomingOrder[]>(initialPendingOrders);
    const router = useRouter();

    // Auto-refresh pending orders periodically or stick to initial for now (and manual refresh)
    // Server actions revalidatePath SHOULD update this next time page loads, but client state might be stale
    // Ideally we put this in a separate client component that polls.
    useEffect(() => {
        const interval = setInterval(() => {
            router.refresh();
        }, 15000);
        return () => clearInterval(interval);
    }, [router]);

    // Sync props to state if router refreshes
    useEffect(() => {
        setPendingOrders(initialPendingOrders);
    }, [initialPendingOrders]);

    const filteredItems = useMemo(() => {
        let items = menuItems;
        if (activeCategory !== "all") {
            items = items.filter(i => i.categoryId === activeCategory);
        }
        if (searchQuery) {
            items = items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return items;
    }, [menuItems, activeCategory, searchQuery]);

    const addToCart = (item: POSMenuItem) => {
        setCart(prev => {
            const existing = prev.find(i => i.menuItem.id === item.id);
            if (existing) {
                return prev.map(i => i.menuItem.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { menuItem: item, quantity: 1 }];
        });
    };

    const updateQuantity = (id: string, delta: number) => {
        setCart(prev => prev.map(i => {
            if (i.menuItem.id === id) {
                const newQty = i.quantity + delta;
                return newQty > 0 ? { ...i, quantity: newQty } : i;
            }
            return i;
        }));
    };

    const removeItem = (id: string) => {
        setCart(prev => prev.filter(i => i.menuItem.id !== id));
    };

    const clearCart = () => setCart([]);

    return (
        <div className="grid grid-cols-[70%_30%] h-full overflow-hidden gap-0">
            {/* Main Content: Menu */}
            <div className="flex flex-col p-4 gap-4 overflow-hidden border-l bg-gray-50/50 relative">

                {/* Header including Search and Captain Orders Notification */}
                <div className="flex gap-4 items-center justify-between">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="بحث في القائمة..."
                            className="pr-8 text-right"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Captain Orders Button */}
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button variant="outline" className="relative gap-2 border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700">
                                <ClipboardCheck className="w-5 h-5" />
                                طلبات الكابتن
                                {pendingOrders.length > 0 && (
                                    <Badge variant="destructive" className="absolute -top-2 -right-2 px-1.5 min-w-[20px] h-5 flex items-center justify-center animate-bounce">
                                        {pendingOrders.length}
                                    </Badge>
                                )}
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                            <SheetHeader>
                                <SheetTitle>طلبات الكابتن (جديد)</SheetTitle>
                                <SheetDescription>
                                    هذه الطلبات تم إنشاؤها عبر الكابتن وهي بانتظار التعامل معها.
                                </SheetDescription>
                            </SheetHeader>
                            <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-4">
                                <div className="space-y-4">
                                    {pendingOrders.length === 0 ? (
                                        <div className="text-center text-muted-foreground py-10">لا توجد طلبات معلقة</div>
                                    ) : (
                                        pendingOrders.map(order => (
                                            <Card key={order.id} className="bg-white border-orange-100">
                                                <CardContent className="p-4">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                                            طاولة {order.table?.number || 'بدون'}
                                                        </Badge>
                                                        <span className="text-xs text-muted-foreground">
                                                            {formatDistanceToNow(new Date(order.createdAt), { addSuffix: true, locale: ar })}
                                                        </span>
                                                    </div>
                                                    <div className="space-y-1 mb-3">
                                                        {order.items.map((item, idx) => (
                                                            <div key={idx} className="text-sm flex justify-between">
                                                                <span>{item.quantity}x {item.menuItem.name}</span>
                                                                <span className="text-muted-foreground">{item.totalPrice.toFixed(0)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="flex justify-between items-center border-t pt-2 mt-2">
                                                        <span className="font-bold">المجموع: {order.totalAmount.toFixed(0)} د.ع</span>
                                                    </div>
                                                    <div className="mt-3 flex gap-2">
                                                        <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => router.push(`/dashboard/orders/${order.id}`)}>
                                                            عرض التفاصيل والدفع
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </SheetContent>
                    </Sheet>
                </div>

                <div className="flex-1 flex flex-col min-h-0">
                    <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory} className="h-full flex flex-col">
                        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap pb-0.5 mb-2">
                            <TabsTrigger value="all">الكل</TabsTrigger>
                            {categories.map(c => (
                                <TabsTrigger key={c.id} value={c.id}>{c.name}</TabsTrigger>
                            ))}
                        </TabsList>

                        <ScrollArea className="flex-1 bg-muted/20 rounded-md p-4 border">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-4">
                                {filteredItems.map(item => {
                                    const hasOffer = item.offers.length > 0;
                                    return (
                                        <Card
                                            key={item.id}
                                            className={cn(
                                                "cursor-pointer transition-all hover:scale-105 active:scale-95",
                                                !item.isAvailable && "opacity-50 pointer-events-none"
                                            )}
                                            onClick={() => addToCart(item)}
                                        >
                                            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                                                <div className="h-24 w-full bg-secondary rounded-md flex items-center justify-center text-secondary-foreground text-xs overflow-hidden relative">
                                                    {item.image ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span>لا توجد صورة</span>
                                                    )}
                                                    {hasOffer && (
                                                        <Badge className="absolute top-1 right-1" variant="destructive">%</Badge>
                                                    )}
                                                </div>
                                                <div className="font-medium line-clamp-2 leading-tight min-h-[2.5em]">
                                                    {item.name}
                                                </div>
                                                <div className="font-bold text-primary">
                                                    {item.price.toFixed(0)} د.ع
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )
                                })}
                                {filteredItems.length === 0 && (
                                    <div className="col-span-full text-center text-muted-foreground py-10">
                                        لا توجد عناصر
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </Tabs>
                </div>
            </div>

            {/* Right Sidebar: Cart */}
            <CartSidebar
                items={cart}
                onUpdateQuantity={updateQuantity}
                onRemove={removeItem}
                onClear={clearCart}
                tables={tables}
            />
        </div>
    );
}
