'use client';

import { Category, MenuItem, Table, Offer } from '@prisma/client';
import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, ShoppingBag, Truck, Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface POSMenuItem extends MenuItem {
    offers: Offer[];
}

export type OrderType = 'dine_in' | 'takeaway' | 'delivery';

interface CashierMenuProps {
    categories: Category[];
    menuItems: POSMenuItem[];
    tables: Table[];
    orderType: OrderType;
    setOrderType: (type: OrderType) => void;
    customerPhone: string;
    setCustomerPhone: (phone: string) => void;
    customerAddress: string;
    setCustomerAddress: (address: string) => void;
    selectedTable: string;
    setSelectedTable: (tableId: string) => void;
    onAddToCart: (item: POSMenuItem) => void;
}

export function CashierMenu({
    categories,
    menuItems,
    tables,
    orderType,
    setOrderType,
    customerPhone,
    setCustomerPhone,
    customerAddress,
    setCustomerAddress,
    selectedTable,
    setSelectedTable,
    onAddToCart
}: CashierMenuProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState<string>("all");

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

    return (
        <div className="flex flex-col h-full bg-slate-50 border-r">
            {/* Header: Order Type & Search */}
            <div className="p-3 bg-white border-b shadow-sm space-y-3">
                <div className="flex gap-2">
                    <Button
                        variant={orderType === 'takeaway' ? 'default' : 'outline'}
                        className={cn("flex-1 gap-2", orderType === 'takeaway' && "bg-blue-600 hover:bg-blue-700")}
                        onClick={() => setOrderType('takeaway')}
                    >
                        <ShoppingBag className="w-4 h-4" /> سفري
                    </Button>
                    <Button
                        variant={orderType === 'dine_in' ? 'default' : 'outline'}
                        className={cn("flex-1 gap-2", orderType === 'dine_in' && "bg-orange-600 hover:bg-orange-700")}
                        onClick={() => setOrderType('dine_in')}
                    >
                        <Utensils className="w-4 h-4" /> صالة
                    </Button>
                    <Button
                        variant={orderType === 'delivery' ? 'default' : 'outline'}
                        className={cn("flex-1 gap-2", orderType === 'delivery' && "bg-green-600 hover:bg-green-700")}
                        onClick={() => setOrderType('delivery')}
                    >
                        <Truck className="w-4 h-4" /> توصيل
                    </Button>
                </div>

                {/* Context Inputs based on Type */}
                {orderType === 'dine_in' && (
                    <Select value={selectedTable} onValueChange={(value) => {
                        const table = tables.find(t => t.id === value);
                        if (table?.status === 'OCCUPIED') {
                            // Optional: Toast warning?
                        }
                        setSelectedTable(value);
                    }}>
                        <SelectTrigger>
                            <SelectValue placeholder="اختر الطاولة" />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                            {tables.map(t => {
                                let statusColor = 'bg-gray-500';
                                switch (t.status) {
                                    case 'AVAILABLE': statusColor = 'bg-green-500'; break;
                                    case 'OCCUPIED': statusColor = 'bg-red-500'; break;
                                    case 'RESERVED': statusColor = 'bg-yellow-500'; break;
                                    case 'DIRTY': statusColor = 'bg-orange-500'; break;
                                }
                                return (
                                    <SelectItem key={t.id} value={t.id}>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${statusColor}`} />
                                            <span>طاولة {t.number}</span>
                                            <span className="text-xs text-muted-foreground mr-1">
                                                ({t.status === 'AVAILABLE' ? 'متاح' : t.status === 'OCCUPIED' ? 'مشغول' : t.status === 'RESERVED' ? 'محجوز' : 'تنظيف'})
                                            </span>
                                        </div>
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                )}
                {orderType === 'delivery' && (
                    <div className="flex flex-col gap-2">
                        <Input placeholder="رقم الهاتف" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="bg-muted/20 w-full" />
                        <Input placeholder="العنوان" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} className="bg-muted/20 w-full" />
                    </div>
                )}

                <div className="relative">
                    <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="بحث في القائمة..."
                        className="pr-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Categories */}
            <div className="bg-white border-b px-2 py-2">
                <Tabs defaultValue="all" value={activeCategory} onValueChange={setActiveCategory}>
                    <TabsList className="w-full justify-start overflow-x-auto flex-nowrap pb-1 h-auto bg-transparent p-0 gap-2">
                        <TabsTrigger value="all" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border bg-muted/30">الكل</TabsTrigger>
                        {categories.map(c => (
                            <TabsTrigger key={c.id} value={c.id} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground border bg-muted/30">{c.name}</TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            </div>

            {/* Menu Items Grid */}
            <ScrollArea className="flex-1 p-3">
                <div className="grid grid-cols-2 gap-3 pb-8">
                    {filteredItems.map(item => {
                        const hasOffer = item.offers.length > 0;
                        return (
                            <Card
                                key={item.id}
                                className={cn(
                                    "cursor-pointer hover:border-primary transition-all active:scale-95 shadow-sm border-gray-200",
                                    !item.isAvailable && "opacity-50 pointer-events-none"
                                )}
                                onClick={() => onAddToCart(item)}
                            >
                                <CardContent className="p-3 text-center flex flex-col gap-2">
                                    <div className="h-20 w-full bg-gray-100 rounded flex items-center justify-center text-xs relative overflow-hidden">
                                        {item.image ? (
                                            <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-gray-400">صورة</span>
                                        )}
                                        {hasOffer && <Badge className="absolute top-1 right-1 px-1 h-5 text-[10px]" variant="destructive">%</Badge>}
                                    </div>
                                    <div className="text-sm font-medium line-clamp-1">{item.name}</div>
                                    <div className="text-sm font-bold text-primary">{item.price.toFixed(0)}</div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            </ScrollArea>
        </div>
    );
}
