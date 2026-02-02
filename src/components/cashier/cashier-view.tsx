'use client';

import { Category, MenuItem, Table, Offer, Order, OrderItem, Delivery, User } from '@prisma/client';
import { ReadyOrdersList } from './ready-orders-list';
import { CashierMenu, OrderType } from './cashier-menu';
import { CashierCart, CartItem } from './cashier-cart';
import { useState, useTransition } from 'react';
import { createOrder } from '@/lib/actions/pos';
import { useToast } from '@/hooks/use-toast';

interface POSMenuItem extends MenuItem {
    offers: Offer[];
}

type OrderWithDetails = Order & {
    items: (OrderItem & { menuItem: MenuItem })[];
    table: Table | null;
    delivery: (Delivery & { driver: User | null }) | null;
};

interface CashierViewProps {
    initialOrders: OrderWithDetails[];
    categories: Category[];
    menuItems: POSMenuItem[];
    tables: Table[];
}

export function CashierView({ initialOrders, categories, menuItems, tables }: CashierViewProps) {
    // Lifted State
    const [cart, setCart] = useState<CartItem[]>([]);
    const [orderType, setOrderType] = useState<OrderType>('takeaway');
    const [selectedTable, setSelectedTable] = useState<string>("");
    const [customerPhone, setCustomerPhone] = useState("");
    const [customerAddress, setCustomerAddress] = useState("");
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

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
        setOrderType('takeaway'); // Reset order type or keep? Usually helpful to keep. Resetting fields helps.
        // Let's keep orderType as user might do multiple of same type.
    };

    const handleCreateOrder = async () => {
        if (cart.length === 0) return;
        if (orderType === 'dine_in' && !selectedTable) {
            toast({ variant: "destructive", title: "تنبيه", description: "يرجى اختيار طاولة" });
            return;
        }

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
            clearCart();
        }
    };

    return (
        <div className="grid grid-cols-3 h-[calc(100vh-6rem)] gap-4 overflow-hidden">
            {/* Right Section: Ready Orders (Kitchen) - 1/3 */}
            <div className="border rounded-xl shadow-sm overflow-hidden bg-white">
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
    );
}
