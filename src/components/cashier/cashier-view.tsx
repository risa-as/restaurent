'use client';

import { Category, MenuItem, Table, Offer, Order, OrderItem, Delivery, User, Bill } from '@prisma/client';
import { ReadyOrdersList } from './ready-orders-list';
import { CashierMenu, OrderType } from './cashier-menu';
import { CashierCart, CartItem } from './cashier-cart';
import { useState, useTransition, useEffect, useRef } from 'react';
import { createOrder } from '@/lib/actions/pos';
import { getOrderForReceipt } from '@/lib/actions/cashier';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, History } from 'lucide-react';
import { CashierHistory } from './cashier-history';
import { Receipt } from '@/components/orders/receipt';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, CheckCircle } from 'lucide-react';

// ... (keep POSMenuItem and OrderWithDetails types)
// Better to export OrderWithDetails from a central place or redefine it to match getOrderForReceipt result?
// getOrderForReceipt includes bills.
// I should update OrderWithDetails type here or genericise.
// For printing, I'll just use 'any' or intersection if lazy, but better to add Bill.

type OrderWithDetails = Order & {
    items: (OrderItem & { menuItem: MenuItem })[];
    table: Table | null;
    delivery: (Delivery & { driver: User | null }) | null;
    bills?: Bill[]; // Added optional bills
};

interface POSMenuItem extends MenuItem {
    offers: Offer[];
}

interface CashierViewProps {
    initialOrders: OrderWithDetails[];
    historyOrders: OrderWithDetails[];
    categories: Category[];
    menuItems: POSMenuItem[];
    tables: Table[];
}

export function CashierView({ initialOrders, historyOrders, categories, menuItems, tables }: CashierViewProps) {
    // Lifted State
    const [cart, setCart] = useState<CartItem[]>([]);
    const [orderType, setOrderType] = useState<OrderType>('takeaway');
    const [selectedTable, setSelectedTable] = useState<string>("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    const [, startTransition] = useTransition();
    const { toast } = useToast();

    // Printing State
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [printingOrder, setPrintingOrder] = useState<any | null>(null); // Using any to avoid strict type mismatch with Receipt props if complex
    const printRef = useRef<boolean>(false);
    const [orderSuccess, setOrderSuccess] = useState<string | null>(null); // Store Order ID

    // Effect to trigger print when printingOrder is set
    useEffect(() => {
        if (printingOrder && printRef.current) {
            // Small delay to ensure render
            setTimeout(() => {
                window.print();
                printRef.current = false;
                setPrintingOrder(null); // Clear after print dialog opens
            }, 500);
        }
    }, [printingOrder]);

    // Handlers
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

    const removeFromCart = (id: string) => {
        setCart(prev => prev.filter(i => i.menuItem.id !== id));
    };

    const clearCart = () => {
        setCart([]);
        setCustomerPhone("");
        setCustomerAddress("");
        setSelectedTable("");
        // Keep orderType
    };

    const handleCreateOrder = async () => {
        if (cart.length === 0) return;
        if (orderType === 'dine_in' && !selectedTable) {
            toast({ variant: "destructive", title: "تنبيه", description: "يرجى اختيار طاولة" });
            return;
        }

        startTransition(async () => {
            const res = await createOrder({
                tableId: orderType === 'dine_in' ? selectedTable : undefined,
                deliveryType: orderType === 'delivery' ? 'delivery' : (orderType === 'takeaway' ? 'pickup' : undefined),
                items: cart.map(i => ({ menuItemId: i.menuItem.id, quantity: i.quantity, notes: i.notes })),
                customerPhone,
                customerAddress,
                note: `نظام الكاشير - ${orderType}`
            });

            if (res?.error) {
                toast({ variant: "destructive", title: "خطأ", description: res.error });
            } else {
                toast({ title: "تم بنجاح", description: "تم إنشاء الطلب" });

                // Manual Print Logic
                if (res.orderId) {
                    setOrderSuccess(res.orderId);
                    // Pre-fetch order data silently for printing?
                    // Or wait for user to click Print.
                    // We'll wait for click to be safe and simple.

                    // Clear cart immediately
                    clearCart();
                }
            }
        });
    };

    const handlePrintSuccess = async () => {
        if (!orderSuccess) return;
        const order = await getOrderForReceipt(orderSuccess);
        if (order) {
            setPrintingOrder(order);
            printRef.current = true;
        }
    };

    return (
        <Tabs defaultValue="pos" className="h-[calc(100vh-6rem)] flex flex-col">
            <div className="flex justify-center mb-2">
                <TabsList className="grid w-[400px] grid-cols-2">
                    <TabsTrigger value="pos" className="flex items-center gap-2">
                        <LayoutDashboard className="w-4 h-4" />
                        نقطة البيع
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex items-center gap-2">
                        <History className="w-4 h-4" />
                        سجل الطلبات
                    </TabsTrigger>
                </TabsList>
            </div>

            <TabsContent value="pos" className="flex-1 overflow-hidden mt-0">
                <div className="grid grid-cols-3 h-full gap-4 overflow-hidden">
                    {/* Right Section: Ready Orders (Kitchen) - 1/3 */}
                    <div className="border rounded-xl shadow-sm overflow-hidden bg-white">
                        {/* Pass updated key or data if needed, but it auto-refreshes internally too */}
                        <ReadyOrdersList initialOrders={initialOrders} />
                    </div>

                    {/* Middle Section: Menu & Settings - 1/3 */}
                    <div className="border rounded-xl shadow-sm overflow-hidden bg-white">
                        <CashierMenu
                            categories={categories}
                            menuItems={menuItems}
                            tables={tables}
                            orderType={orderType}
                            setOrderType={setOrderType}
                            customerPhone={customerPhone}
                            setCustomerPhone={setCustomerPhone}
                            customerAddress={customerAddress}
                            setCustomerAddress={setCustomerAddress}
                            selectedTable={selectedTable}
                            setSelectedTable={setSelectedTable}
                            onAddToCart={addToCart}
                        />
                    </div>

                    {/* Left Section: Cart & Payment - 1/3 */}
                    <div className="border rounded-xl shadow-sm overflow-hidden bg-white">
                        <CashierCart
                            cart={cart}
                            onUpdateQuantity={updateQuantity}
                            onRemove={removeFromCart}
                            onClear={clearCart}
                            onSubmit={handleCreateOrder}
                        />
                    </div>
                </div>
            </TabsContent>

            <TabsContent value="history" className="flex-1 overflow-hidden mt-0">
                <CashierHistory initialOrders={historyOrders} />
            </TabsContent>

            {/* Hidden Receipt for Printing */}
            {printingOrder && (
                <div className="hidden">
                    <Receipt order={printingOrder} />
                </div>
            )}
            {/* Note: Receipt component handles @media print visibility internally. 
                If it's hidden here with 'hidden' class, it might not show on print unless that class is overridden in print media query.
                Usually better to use absolute positioning off-screen or a verified print-only wrapper.
                Or relies on Receipt component NOT being wrapped in hidden div?
                Actually, standard Tailwind `hidden` is `display: none!important`.
                It WON'T show on print if wrapped in `hidden`.
                I should check `Receipt` implementation or wrapper.
                Better approach: Render it normally but it should be structured to only show when printing?
                Or render it only when printingOrder is set, and it takes over screen?
                Standard practice: render standard UI, and Receipt has `@media print { display: block }` and everything else has `@media print { display: none }`.
                If I wrap it in `hidden`, it will probably stay hidden.
                I will render it conditionally without `hidden` class, assuming Receipt component handles "only visible on print" OR it overlays?
                Let's look at `ReadyOrdersList` usage: `{selectedOrder && <Receipt order={selectedOrder} />}` at the bottom.
                It seems it renders always if present?
                If `Receipt` has `fixed inset-0 z-50 bg-white` style for print?
                I'll assume `Receipt` component is "Print-Ready". If I render it, does it mess up the UI?
                I'll check `ReadyOrdersList` usage again. It just renders it at the end.
                I'll do the same.
            */}
            {printingOrder && <Receipt order={printingOrder} />}

            <Dialog open={!!orderSuccess} onOpenChange={(open) => !open && setOrderSuccess(null)}>
                <DialogContent className="sm:max-w-md text-center">
                    <DialogHeader>
                        <div className="mx-auto bg-green-100 p-3 rounded-full mb-2">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <DialogTitle className="text-center text-xl">تم إرسال الطلب بنجاح</DialogTitle>
                        <DialogDescription className="text-center">
                            تم استلام الطلب وتسجيله على النظام
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center justify-center space-x-2 py-4">
                        <div className="grid flex-1 gap-2">
                            <Button
                                size="lg"
                                className="w-full gap-2 text-lg h-12"
                                onClick={() => {
                                    setOrderSuccess(null);
                                    // Handle print or other logic if needed
                                }}
                            >
                                <Printer className="h-5 w-5" />
                                طباعة الإيصال
                            </Button>
                        </div>
                    </div>
                    <DialogFooter className="sm:justify-center">
                        <Button
                            type="button"
                            variant="secondary"
                            className="w-full"
                            onClick={() => setOrderSuccess(null)}
                        >
                            إغلاق (طلب جديد)
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Tabs>
    );
}
