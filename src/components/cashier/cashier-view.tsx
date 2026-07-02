'use client';

import { Category, MenuItem, Table, Offer, Order, OrderItem, Delivery, User, Bill } from '@prisma/client';
import { ReadyOrdersList } from './ready-orders-list';
import { CashierMenu, OrderType } from './cashier-menu';
import { CashierCart, CartItem } from './cashier-cart';
import { useState, useTransition, useEffect, useRef, useCallback } from 'react';
import { createOrder } from '@/lib/actions/pos';
import { getOrderForReceipt } from '@/lib/actions/cashier';
import { enqueueOrder, drainQueue } from '@/lib/offline-queue';
import { saveLiveOrder, addOrderLog, type LiveOrder } from '@/lib/offline/db';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LayoutDashboard, History, ClipboardCheck, QrCode } from 'lucide-react';
import { CashierHistory } from './cashier-history';
import { PendingBillsView } from './pending-bills-view';
import { Receipt } from '@/components/orders/receipt';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, CheckCircle } from 'lucide-react';
import { getPusherClient } from '@/lib/pusher';
import { useRouter } from 'next/navigation';

type OrderWithDetails = Order & {
    items: (OrderItem & { menuItem: MenuItem })[];
    table: Table | null;
    delivery: (Delivery & { driver: User | null }) | null;
    bills?: Bill[];
};

interface POSMenuItem extends MenuItem {
    offers: Offer[];
    _count: { modifierGroups: number };
}

interface CashierViewProps {
    initialOrders: OrderWithDetails[];
    categories: Category[];
    menuItems: POSMenuItem[];
    tables: Table[];
    serviceMode: string;
    shiftId?: string;
    qrPendingBills?: any[];
    activeTableOrders?: any[];
    tenantId?: string;
    loyaltyEnabled?: boolean;
    onRefresh?: () => void | Promise<void>;
}

export function CashierView({ initialOrders, categories, menuItems, tables, serviceMode, shiftId, qrPendingBills: initialQrBills, activeTableOrders = [], tenantId, loyaltyEnabled = false, onRefresh }: CashierViewProps) {
    const router = useRouter();

    // Prefer the CSR background refetch; fall back to router.refresh() (SSR).
    // Held in a ref so the Pusher effect never re-subscribes on re-render.
    const refresh = useCallback(
        () => (onRefresh ? onRefresh() : router.refresh()),
        [onRefresh, router],
    );
    const refreshRef = useRef(refresh);
    refreshRef.current = refresh;
    const [qrBills, setQrBills] = useState<any[]>(initialQrBills ?? []);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [orderType, setOrderType] = useState<OrderType>('takeaway');
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');
    const [customerLat, setCustomerLat] = useState<number | undefined>();
    const [customerLng, setCustomerLng] = useState<number | undefined>();
    const [, startTransition] = useTransition();
    const { toast } = useToast();

    // Drain offline queue when component mounts and when coming back online
    const drainOfflineQueue = useCallback(async () => {
        await drainQueue(async (payload) => {
            await createOrder(payload as Parameters<typeof createOrder>[0]);
        });
    }, []);

    useEffect(() => {
        // Drain on mount (in case app was reloaded while online)
        if (navigator.onLine) drainOfflineQueue();
        const handleOnline = () => drainOfflineQueue();
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [drainOfflineQueue]);

    // مزامنة فواتير QR عند تحديث الخادم
    useEffect(() => { setQrBills(initialQrBills ?? []); }, [initialQrBills]);

    // إشعار فوري عند طلب فاتورة QR جديدة
    useEffect(() => {
        if (!tenantId) return;
        const pusher = getPusherClient();
        if (!pusher) return;
        const channel = pusher.subscribe(`tenant-${tenantId}-cashier`);
        channel.bind('qr-bill-requested', () => refreshRef.current());
        channel.bind('bill-settled', () => refreshRef.current());
        channel.bind('table-status-changed', () => refreshRef.current());
        return () => {
            channel.unbind('qr-bill-requested');
            channel.unbind('bill-settled');
            channel.unbind('table-status-changed');
            pusher.unsubscribe(`tenant-${tenantId}-cashier`);
        };
    }, [tenantId]);

    const [printingOrder, setPrintingOrder] = useState<any | null>(null);
    const printRef = useRef<boolean>(false);
    const [orderSuccess, setOrderSuccess] = useState<string | null>(null);

    useEffect(() => {
        if (printingOrder && printRef.current) {
            setTimeout(() => {
                window.print();
                printRef.current = false;
                setPrintingOrder(null);
            }, 500);
        }
    }, [printingOrder]);

    const addToCart = (item: POSMenuItem, modifiers?: import('@/components/menu/modifier-picker-modal').SelectedModifier[]) => {
        const cartKey = item.id + (modifiers && modifiers.length > 0 ? ':' + modifiers.map(m => m.modifierOptionId).sort().join(',') : '');
        setCart(prev => {
            const existing = prev.find(i => i.cartKey === cartKey);
            if (existing) return prev.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i);
            return [...prev, { menuItem: item, quantity: 1, modifiers, cartKey }];
        });
    };

    const updateQuantity = (cartKey: string, delta: number) => {
        setCart(prev => prev.map(i => {
            if (i.cartKey === cartKey) {
                const newQty = i.quantity + delta;
                return newQty > 0 ? { ...i, quantity: newQty } : i;
            }
            return i;
        }).filter(i => i.quantity > 0));
    };

    const removeFromCart = (cartKey: string) => setCart(prev => prev.filter(i => i.cartKey !== cartKey));

    const clearCart = () => {
        setCart([]);
        setCustomerPhone('');
        setCustomerAddress('');
        setSelectedTable('');
    };

    const handleCreateOrder = async (pointsToRedeem?: number, paymentMethod?: 'CASH' | 'CARD') => {
        if (cart.length === 0) return;
        if (orderType === 'dine_in' && !selectedTable) {
            toast({ variant: 'destructive', title: 'تنبيه', description: 'يرجى اختيار طاولة' });
            return;
        }

        const orderPayload = {
            tableId: orderType === 'dine_in' ? selectedTable : undefined,
            deliveryType: (orderType === 'delivery' ? 'delivery' : (orderType === 'takeaway' ? 'pickup' : undefined)) as 'delivery' | 'pickup' | undefined,
            items: cart.map(i => ({
                menuItemId: i.menuItem.id,
                quantity: i.quantity,
                notes: i.notes,
                modifiers: i.modifiers?.map(m => ({ modifierOptionId: m.modifierOptionId })),
            })),
            customerPhone,
            customerAddress,
            customerLat,
            customerLng,
            note: `نظام الكاشير - ${orderType}`,
            pointsRedeemed: pointsToRedeem || 0,
            serviceMode: serviceMode as any,
            paymentMethod: paymentMethod ?? 'CASH',
            // Needed by the offline queue / sync endpoint to scope the order.
            tenantId: tenantId ?? '',
        };

        // Build a full local order so it shows up in the kitchen/waiter pages on
        // the same device while offline (single-device live flow).
        const buildLiveOrder = (localId: string): LiveOrder => {
            const tableObj = orderType === 'dine_in' ? tables.find(t => t.id === selectedTable) : null;
            const liveItems = cart.map((c, idx) => {
                const cat = categories.find(cc => cc.id === c.menuItem.categoryId);
                const modTotal = (c.modifiers ?? []).reduce((s, m) => s + (m.priceAdjustment || 0), 0);
                const unit = c.menuItem.price + modTotal;
                return {
                    id: `${localId}_i${idx}`,
                    quantity: c.quantity,
                    status: 'PENDING',
                    notes: c.notes ?? null,
                    unitPrice: unit,
                    totalPrice: unit * c.quantity,
                    menuItem: {
                        id: c.menuItem.id,
                        name: c.menuItem.name,
                        nameAr: (c.menuItem as any).nameAr ?? null,
                        category: { id: cat?.id ?? '', name: cat?.name ?? 'أخرى' },
                    },
                    modifiers: (c.modifiers ?? []).map((m, mi) => ({
                        id: `${localId}_i${idx}_m${mi}`,
                        modifierOption: { name: m.name, nameAr: (m as any).nameAr ?? m.name },
                    })),
                };
            });
            return {
                id: localId,
                orderNumber: Math.floor(Date.now() / 1000) % 100000,
                tenantId: tenantId ?? '',
                tableId: orderType === 'dine_in' ? selectedTable : null,
                table: tableObj ? { number: tableObj.number } : null,
                status: 'PENDING',
                note: `نظام الكاشير - ${orderType}`,
                totalAmount: liveItems.reduce((s, i) => s + i.totalPrice, 0),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                items: liveItems,
                _local: true,
            };
        };

        const logEntryBase = () => {
            const tableObj = orderType === 'dine_in' ? tables.find(t => t.id === selectedTable) : null;
            return {
                source: 'cashier' as const,
                tableName: tableObj?.number ?? null,
                orderType: (orderType === 'delivery' ? 'DELIVERY' : orderType === 'takeaway' ? 'TAKEAWAY' : 'DINE_IN') as 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY',
                itemsCount: cart.reduce((s, c) => s + c.quantity, 0),
                total: cart.reduce((s, c) => {
                    const mods = (c.modifiers ?? []).reduce((m, x) => m + (x.priceAdjustment || 0), 0);
                    return s + (c.menuItem.price + mods) * c.quantity;
                }, 0),
                createdAt: Date.now(),
                tenantId: tenantId ?? '',
            };
        };

        const queueOffline = async () => {
            // Save the visible local order BEFORE clearing the cart. localOrderId
            // ties the queued sync action to the live order so its final offline
            // status (ready/served) is carried to the cloud on sync.
            const isKitchen = orderType !== 'delivery';
            const localId = `local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            if (isKitchen) await saveLiveOrder(buildLiveOrder(localId)).catch(() => {});
            const queueId = await enqueueOrder({ ...orderPayload, localOrderId: isKitchen ? localId : undefined });
            await addOrderLog({
                id: isKitchen ? localId : queueId,
                status: 'PENDING',
                sync: 'pending',
                ...logEntryBase(),
            }).catch(() => {});
            clearCart();
            toast({ title: 'تم حفظ الطلب محلياً', description: 'سيظهر في المطبخ، وسيُرسل للسحابة عند عودة الإنترنت' });
        };

        startTransition(async () => {
            // Fast path — clearly offline: queue immediately instead of waiting
            // several seconds for the DB connection to time out.
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                await queueOffline();
                return;
            }
            try {
                const res = await createOrder(orderPayload);
                if (res?.offline) {
                    // Server reached but DB unreachable → queue locally
                    await queueOffline();
                } else if (res?.error) {
                    toast({ variant: 'destructive', title: 'خطأ', description: res.error });
                } else if (res.orderId) {
                    setOrderSuccess(res.orderId);
                    await addOrderLog({
                        id: res.orderId,
                        serverOrderId: res.orderId,
                        status: 'PENDING',
                        sync: 'synced',
                        ...logEntryBase(),
                    }).catch(() => {});
                    clearCart();
                    // Refetch so the dine-in table flips to occupied and the
                    // ready-orders list reflects the new order without a reload.
                    await refresh();
                }
            } catch {
                // Network failure — queue for later sync
                await queueOffline();
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
        <div className="h-full bg-muted/30 p-3" dir="rtl">
            <Tabs defaultValue="pos" className="h-full flex flex-col gap-3">

                    {/* ── Top Tab Bar ── */}
                    <div className="shrink-0 flex items-center justify-between">
                        <TabsList className="h-10 rounded-xl gap-1 p-1">
                            <TabsTrigger value="pos" className="gap-2 h-8 rounded-lg text-sm font-bold data-[state=active]:shadow-sm">
                                <LayoutDashboard className="w-4 h-4" />
                                نقطة البيع
                            </TabsTrigger>
                            {qrBills.length > 0 && (
                                <TabsTrigger value="qr" className="gap-2 h-8 rounded-lg text-sm font-bold data-[state=active]:shadow-sm relative">
                                    <QrCode className="w-4 h-4" />
                                    طلبات QR
                                    <span className="absolute -top-1.5 -right-1.5 bg-green-500 text-white text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                                        {qrBills.length}
                                    </span>
                                </TabsTrigger>
                            )}
                            <TabsTrigger value="history" className="gap-2 h-8 rounded-lg text-sm font-bold data-[state=active]:shadow-sm">
                                <History className="w-4 h-4" />
                                سجل الطلبات
                            </TabsTrigger>
                        </TabsList>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-card border rounded-lg px-3 py-2">
                            <ClipboardCheck className="w-4 h-4 text-primary" />
                            <span className="font-medium">كاشير — {serviceMode === 'QUICK_SERVICE' ? 'خدمة سريعة' : 'خدمة طاولات'}</span>
                        </div>
                    </div>

                    {/* ── POS Panel ── */}
                    <TabsContent value="pos" className="flex-1 overflow-hidden mt-3">
                        <div className="grid grid-cols-[300px_1fr_310px] h-full gap-3">

                            {/* Ready Orders */}
                            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden flex flex-col">
                                <ReadyOrdersList initialOrders={initialOrders} shiftId={shiftId} />
                            </div>

                            {/* Menu */}
                            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden flex flex-col">
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
                                    customerLat={customerLat}
                                    setCustomerLat={setCustomerLat}
                                    customerLng={customerLng}
                                    setCustomerLng={setCustomerLng}
                                    selectedTable={selectedTable}
                                    setSelectedTable={setSelectedTable}
                                    onAddToCart={addToCart}
                                />
                            </div>

                            {/* Cart */}
                            <div className="rounded-2xl border bg-card shadow-sm overflow-hidden flex flex-col">
                                <CashierCart
                                    cart={cart}
                                    customerPhone={customerPhone}
                                    setCustomerPhone={setCustomerPhone}
                                    onUpdateQuantity={updateQuantity}
                                    onRemove={removeFromCart}
                                    onClear={clearCart}
                                    onSubmit={handleCreateOrder}
                                    loyaltyEnabled={loyaltyEnabled}
                                />
                            </div>
                        </div>
                    </TabsContent>

                    {/* ── QR Bills Panel ── */}
                    <TabsContent value="qr" className="flex-1 overflow-y-auto mt-3">
                        <PendingBillsView
                            bills={qrBills}
                            activeOrders={activeTableOrders}
                            tenantId={tenantId ?? ''}
                            shiftId={shiftId}
                            onRefresh={onRefresh}
                        />
                    </TabsContent>

                    {/* ── History Panel ── */}
                    <TabsContent value="history" className="flex-1 overflow-hidden mt-3">
                        <div className="rounded-2xl border bg-card shadow-sm h-full overflow-hidden">
                            <CashierHistory />
                        </div>
                    </TabsContent>
            </Tabs>

            {/* Hidden receipt for print */}
            {printingOrder && <Receipt order={printingOrder} />}

            {/* Success Dialog */}
            <Dialog open={!!orderSuccess} onOpenChange={open => !open && setOrderSuccess(null)}>
                <DialogContent className="sm:max-w-sm" dir="rtl">
                    <DialogHeader className="items-center text-center">
                        <div className="mx-auto bg-green-100 dark:bg-green-900/30 p-4 rounded-full mb-2">
                            <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
                        </div>
                        <DialogTitle className="text-xl">تم إرسال الطلب بنجاح</DialogTitle>
                        <DialogDescription>تم استلام الطلب وتسجيله في النظام</DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-2 pt-2">
                        <Button
                            size="lg"
                            className="w-full gap-2 font-bold h-12"
                            onClick={handlePrintSuccess}
                        >
                            <Printer className="h-5 w-5" />
                            طباعة الإيصال
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => setOrderSuccess(null)}
                        >
                            طلب جديد
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
