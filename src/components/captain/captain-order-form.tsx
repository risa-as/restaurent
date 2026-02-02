'use client';

import { Category, MenuItem, Table } from '@prisma/client';
import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createCaptainOrder } from '@/lib/actions/captain';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Minus, Plus, Trash2, UtensilsCrossed, Pizza, Coffee, IceCream } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CaptainOrderFormProps {
    categories: (Category & { items: MenuItem[] })[];
    tables: Table[];
}

interface CartItem {
    menuItem: MenuItem;
    quantity: number;
    notes?: string;
}

export function CaptainOrderForm({ categories, tables }: CaptainOrderFormProps) {
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const westernCategories = categories.filter(c => c.type === 'WESTERN');
    const easternCategories = categories.filter(c => c.type === 'EASTERN');
    const otherCategories = categories.filter(c => c.type !== 'WESTERN' && c.type !== 'EASTERN');

    const addToCart = (item: MenuItem) => {
        setCart(prev => {
            const existing = prev.find(i => i.menuItem.id === item.id);
            if (existing) {
                return prev.map(i => i.menuItem.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
            }
            return [...prev, { menuItem: item, quantity: 1 }];
        });
    };

    const removeFromCart = (itemId: string) => {
        setCart(prev => prev.filter(i => i.menuItem.id !== itemId));
    };

    const updateQuantity = (itemId: string, delta: number) => {
        setCart(prev => {
            return prev.map(i => {
                if (i.menuItem.id === itemId) {
                    const newQty = Math.max(0, i.quantity + delta);
                    return { ...i, quantity: newQty };
                }
                return i;
            }).filter(i => i.quantity > 0);
        });
    };

    const handleSubmit = () => {
        if (!selectedTable) {
            toast({ title: "يرجى اختيار طاولة", variant: "destructive" });
            return;
        }
        if (cart.length === 0) {
            toast({ title: "يرجى إضافة عناصر للطلب", variant: "destructive" });
            return;
        }

        startTransition(async () => {
            const result = await createCaptainOrder({
                tableId: selectedTable,
                items: cart.map(i => ({ menuItemId: i.menuItem.id, quantity: i.quantity, notes: i.notes }))
            });

            if (result.success) {
                toast({ title: "تم إرسال الطلب للمطبخ بنجاح" });
                setCart([]);
                setSelectedTable('');
            } else {
                toast({ title: "حدث خطأ أثناء إرسال الطلب", variant: "destructive" });
            }
        });
    };

    const totalAmount = cart.reduce((sum, item) => sum + (item.menuItem.price * item.quantity), 0);

    return (
        <div className="flex h-[calc(100vh-100px)] gap-4">
            {/* Menu Section */}
            <div className="flex-1 flex flex-col gap-4">
                <div className="bg-white p-4 rounded-lg shadow-sm border flex items-center gap-4">
                    <span className="font-bold text-lg">اختر الطاولة:</span>
                    <span className="font-bold text-lg">اختر الطاولة:</span>
                    <Select value={selectedTable} onValueChange={(value) => {
                        const table = tables.find(t => t.id === value);
                        // Allow selection regardless of status, but warn? Or strictly block?
                        // User said "accurate status", maybe they still want to add to it?
                        // Assuming blocking occupied is still desired unless logic changes.
                        // I will keep blocking logic but refine the message.
                        if (table?.status === 'OCCUPIED') {
                            toast({
                                title: "تنبيه",
                                description: "يمكنك إضافة طلبات لطاولة مشغولة",
                                // wait, usually captains add to occupied tables. 
                                // I will REMOVE the block restriction so they can add more items to an open table.
                            });
                        }
                        setSelectedTable(value);
                    }}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="رقم الطاولة" />
                        </SelectTrigger>
                        <SelectContent dir="rtl">
                            {tables.map(t => {
                                let statusColor = 'bg-gray-500';
                                let statusText = '';

                                switch (t.status) {
                                    case 'AVAILABLE':
                                        statusColor = 'bg-green-500';
                                        statusText = 'متاح';
                                        break;
                                    case 'OCCUPIED':
                                        statusColor = 'bg-red-500';
                                        statusText = 'مشغول';
                                        break;
                                    case 'RESERVED':
                                        statusColor = 'bg-yellow-500';
                                        statusText = 'محجوز';
                                        break;
                                    case 'DIRTY':
                                        statusColor = 'bg-orange-500';
                                        statusText = 'تنظيف';
                                        break;
                                }

                                return (
                                    <SelectItem key={t.id} value={t.id}>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${statusColor}`} />
                                            <span>طاولة {t.number}</span>
                                            <span className="text-xs text-muted-foreground">({statusText})</span>
                                        </div>
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </div>

                <Tabs defaultValue="all_food" className="flex-1 flex flex-col bg-white rounded-lg shadow-sm border items-start" dir="rtl">
                    <TabsList className="w-full justify-start h-16 p-2 bg-gray-50 border-b rounded-t-lg rounded-b-none">
                        <TabsTrigger value="all_food" className="h-full px-8 text-lg gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            <UtensilsCrossed className="w-5 h-5" /> الكل
                        </TabsTrigger>
                        <TabsTrigger value="eastern" className="h-full px-8 text-lg gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            <UtensilsCrossed className="w-5 h-5" /> مأكولات شرقية
                        </TabsTrigger>
                        <TabsTrigger value="western" className="h-full px-8 text-lg gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            <Pizza className="w-5 h-5" /> مأكولات غربية
                        </TabsTrigger>
                        <TabsTrigger value="beverages" className="h-full px-8 text-lg gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                            <Coffee className="w-5 h-5" /> مشروبات وحلويات
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex-1 w-full bg-gray-50/50 p-4 overflow-hidden">
                        <CategoryView value="all_food" categories={[...easternCategories, ...westernCategories]} onAdd={addToCart} />
                        <CategoryView value="eastern" categories={easternCategories} onAdd={addToCart} />
                        <CategoryView value="western" categories={westernCategories} onAdd={addToCart} />
                        <CategoryView value="beverages" categories={otherCategories} onAdd={addToCart} />
                    </div>
                </Tabs>
            </div>

            {/* Cart Section */}
            <Card className="w-96 flex flex-col h-full border-2 border-primary/20 shadow-lg">
                <CardContent className="p-4 flex flex-col h-full">
                    <h2 className="text-xl font-bold mb-4 flex items-center gap-2 border-b pb-4">
                        <span className="bg-primary text-primary-foreground w-8 h-8 rounded-full flex items-center justify-center text-sm">{cart.length}</span>
                        الطلب الحالي
                    </h2>

                    <ScrollArea className="flex-1 -mx-4 px-4">
                        <div className="space-y-4">
                            {cart.length === 0 ? (
                                <div className="text-center text-muted-foreground py-10 opacity-50">
                                    <UtensilsCrossed className="w-12 h-12 mx-auto mb-2" />
                                    اضغط على العناصر لإضافتها
                                </div>
                            ) : (
                                cart.map(item => (
                                    <div key={item.menuItem.id} className="flex gap-3 bg-white p-3 rounded-lg border shadow-sm">
                                        <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden shrink-0">
                                            {/* Image placeholder */}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-semibold text-sm">{item.menuItem.name}</div>
                                            <div className="text-primary font-bold">{item.menuItem.price.toFixed(0)} د.ع</div>
                                            <div className="flex items-center gap-3 mt-2">
                                                <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQuantity(item.menuItem.id, -1)}>
                                                    <Minus className="h-3 w-3" />
                                                </Button>
                                                <span className="font-mono font-bold w-4 text-center">{item.quantity}</span>
                                                <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQuantity(item.menuItem.id, 1)}>
                                                    <Plus className="h-3 w-3" />
                                                </Button>
                                            </div>
                                        </div>
                                        <Button variant="ghost" size="icon" className="text-destructive h-8 w-8 -mr-2" onClick={() => removeFromCart(item.menuItem.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>

                    <div className="border-t pt-4 mt-4 space-y-4">
                        <div className="flex justify-between items-center text-lg font-black">
                            <span>المجموع الكلي:</span>
                            <span className="text-2xl text-primary">{totalAmount.toFixed(0)} د.ع</span>
                        </div>
                        <Button
                            className="w-full h-14 text-xl font-bold shadow-lg shadow-primary/20"
                            onClick={handleSubmit}
                            disabled={isPending || cart.length === 0}
                        >
                            {isPending ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="animate-spin" /> جاري الإرسال...
                                </div>
                            ) : (
                                "تأكيد الطلب وإرسال للمطبخ"
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

function CategoryView({ value, categories, onAdd }: { value: string, categories: (Category & { items: MenuItem[] })[], onAdd: (item: MenuItem) => void }) {
    return (
        <TabsContent value={value} className="h-full m-0 data-[state=active]:flex flex-col gap-6 overflow-y-auto pr-2 pb-20">
            {categories.map(category => (
                <div key={category.id}>
                    <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-gray-700">
                        <span className="w-1 h-6 bg-primary rounded-full"></span>
                        {category.name}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {category.items.map(item => (
                            <button
                                key={item.id}
                                onClick={() => onAdd(item)}
                                className="bg-white hover:border-primary border-2 border-transparent transition-all duration-200 p-0 rounded-xl shadow-sm hover:shadow-md text-right overflow-hidden group flex flex-col"
                            >
                                <div className="aspect-video w-full bg-gray-100 relative">
                                    {/* Image */}
                                </div>
                                <div className="p-3 flex flex-col flex-1 w-full">
                                    <div className="font-bold text-gray-900 mb-1 group-hover:text-primary transition-colors">{item.name}</div>
                                    <div className="mt-auto flex justify-between items-center w-full">
                                        <span className="font-black text-lg">{item.price.toFixed(0)}</span>
                                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors">
                                            <Plus className="w-5 h-5" />
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </TabsContent>
    );
}
