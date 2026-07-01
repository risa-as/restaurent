'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { FeedbackPrompt } from './feedback-prompt';
import { getPusherClient } from '@/lib/pusher';

interface OrderStatus {
    id: string;
    status: string;
    orderNumber: number;
    totalAmount: number;
    billRequested: boolean;
    items: {
        id: string;
        status: string;
        quantity: number;
        menuItem: { name: string };
        modifiers: { id: string; modifierOption: { name: string; nameAr: string | null } }[];
    }[];
}

interface QROrderTrackerProps {
    orderId: string;
    tenantSlug: string;
    tenantId: string;
    tableId?: string;
    onNewOrder: () => void;
}

const STATUS_STEPS = [
    { key: 'PENDING', label: 'تم الاستلام', icon: '✅' },
    { key: 'PREPARING', label: 'قيد التحضير', icon: '👨‍🍳' },
    { key: 'READY', label: 'جاهز', icon: '🔔' },
    { key: 'SERVED', label: 'تم التقديم', icon: '🍽️' },
];

// ── شاشة الشكر بعد اكتمال الدفع ──────────────────────────────────────────────
function ThankYouScreen({ order, onNewOrder }: {
    order: OrderStatus;
    onNewOrder: () => void;
    orderId: string;
    feedbackSubmitted: boolean;
    onFeedbackSubmitted: () => void;
}) {
    return (
        <div className="customer-page min-h-screen bg-gradient-to-b from-green-50 to-white p-4" dir="rtl">
            <div className="max-w-md mx-auto space-y-6 pt-10 sm:pt-16">

                {/* أيقونة الشكر */}
                <div className="text-center space-y-3">
                    <div className="mx-auto w-24 h-24 rounded-full bg-green-100 flex items-center justify-center text-5xl shadow-inner">
                        🎉
                    </div>
                    <h1 className="text-3xl font-black text-green-700">شكراً لزيارتكم!</h1>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        تم إتمام طلبكم بنجاح ونأمل أن تكون التجربة رائعة.
                        <br />
                        نتطلع لاستقبالكم مجدداً
                    </p>
                </div>

                {/* ملخص الفاتورة */}
                <div className="bg-white rounded-2xl border shadow-sm p-4 space-y-2">
                    <div className="flex items-center justify-between mb-3">
                        <span className="font-bold text-sm text-muted-foreground">فاتورة #{order.orderNumber}</span>
                        <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">مدفوع ✓</span>
                    </div>
                    {order.items.map(item => (
                        <div key={item.id} className="flex justify-between items-start text-sm">
                            <div>
                                <span className="font-medium">{item.menuItem.name}</span>
                                {item.modifiers.length > 0 && (
                                    <p className="text-xs text-muted-foreground">
                                        {item.modifiers.map(m => m.modifierOption.nameAr || m.modifierOption.name).join(' · ')}
                                    </p>
                                )}
                            </div>
                            <span className="font-bold text-muted-foreground shrink-0 mr-2">×{item.quantity}</span>
                        </div>
                    ))}
                    <div className="border-t pt-2 flex justify-between font-black text-base mt-2">
                        <span>الإجمالي المدفوع</span>
                        <span className="text-green-700">{order.totalAmount.toFixed(0)} د.ع</span>
                    </div>
                </div>

                {/* زر طلب جديد */}
                <button
                    onClick={onNewOrder}
                    className="w-full h-14 rounded-2xl bg-primary text-primary-foreground font-black text-base shadow-lg transition-all active:scale-95"
                >
                    + طلب جديد لنفس الطاولة
                </button>
            </div>
        </div>
    );
}

// ── نموذج تسجيل بيانات الزبون ─────────────────────────────────────────────
function CustomerInfoForm({ orderId, onDismiss }: { orderId: string; onDismiss: () => void }) {
    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const handleSubmit = async () => {
        if (!phone.trim()) return;
        setLoading(true);
        try {
            await fetch('/api/qr/register-customer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId, phone, name, address }),
            });
            setDone(true);
            setTimeout(onDismiss, 1800);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    };

    if (done) {
        return (
            <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-4 text-center space-y-1">
                <div className="text-2xl">✅</div>
                <p className="font-bold text-green-700 text-sm">تم حفظ معلوماتك بنجاح!</p>
                <p className="text-xs text-green-600">ستحصل على نقاط في زيارتك المقبلة</p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 border-2 border-primary/20 rounded-2xl p-4 space-y-3">
            <div className="text-center">
                <div className="text-2xl mb-1">🎁</div>
                <p className="font-black text-sm">سجّل معلوماتك</p>
                <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">
                    احصل على نقاط تستخدمها في زيارتك المقبلة للحصول على تخفيض
                </p>
            </div>
            <div className="space-y-2">
                <input
                    type="tel"
                    placeholder="رقم الهاتف *"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                    dir="ltr"
                />
                <input
                    type="text"
                    placeholder="الاسم (اختياري)"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <input
                    type="text"
                    placeholder="العنوان (اختياري)"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
            </div>
            <div className="flex gap-2">
                <button
                    onClick={handleSubmit}
                    disabled={!phone.trim() || loading}
                    className="flex-1 h-10 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-40 active:scale-95 transition-all"
                >
                    {loading ? '⏳ جاري الحفظ...' : 'حفظ وتسجيل'}
                </button>
                <button
                    onClick={onDismiss}
                    className="px-4 h-10 rounded-xl border text-sm text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                    تخطي
                </button>
            </div>
        </div>
    );
}

// ── المكوّن الرئيسي ──────────────────────────────────────────────────────────
export function QROrderTracker({ orderId, tenantId, onNewOrder }: QROrderTrackerProps) {
    const [order, setOrder] = useState<OrderStatus | null>(null);
    const [billRequested, setBillRequested] = useState(false);
    const [requestingBill, setRequestingBill] = useState(false);
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
    const [customerFormDismissed, setCustomerFormDismissed] = useState(false);

    const fetchStatus = useCallback(async () => {
        try {
            const res = await fetch(`/api/qr/order-status?orderId=${orderId}`);
            if (res.ok) {
                const data = await res.json();
                setOrder(data);
            }
        } catch {
            // silent fail
        }
    }, [orderId]);

    // Polling كل 15 ثانية كـ fallback
    useEffect(() => {
        fetchStatus();
        const interval = setInterval(fetchStatus, 15000);
        return () => clearInterval(interval);
    }, [fetchStatus]);

    // Pusher: تحديث فوري عند إتمام الدفع
    useEffect(() => {
        if (!tenantId) return;
        const pusher = getPusherClient();
        if (!pusher) return;
        const channel = pusher.subscribe(`tenant-${tenantId}-customer`);
        channel.bind('order-completed', (data: { orderId: string }) => {
            if (data.orderId === orderId) fetchStatus();
        });
        return () => {
            channel.unbind('order-completed');
            pusher.unsubscribe(`tenant-${tenantId}-customer`);
        };
    }, [tenantId, orderId, fetchStatus]);

    // ── شاشة الشكر عند اكتمال الدفع ───────────────────────────────────────
    if (order?.status === 'COMPLETED') {
        return (
            <ThankYouScreen
                order={order}
                onNewOrder={onNewOrder}
                orderId={orderId}
                feedbackSubmitted={feedbackSubmitted}
                onFeedbackSubmitted={() => setFeedbackSubmitted(true)}
            />
        );
    }

    const handleRequestBill = async () => {
        setRequestingBill(true);
        try {
            const res = await fetch('/api/qr/bill-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId }),
            });
            if (res.ok) setBillRequested(true);
        } catch {
            // silent
        } finally {
            setRequestingBill(false);
        }
    };

    const currentStepIndex = STATUS_STEPS.findIndex(s => s.key === order?.status);
    const activeIndex = currentStepIndex >= 0 ? currentStepIndex : 0;

    return (
        <div className="customer-page min-h-screen bg-muted/30 p-4" dir="rtl">
            <div className="max-w-md mx-auto space-y-6 pt-6 sm:pt-10">
                {/* Header */}
                <div className="text-center">
                    <div className="text-5xl mb-2">
                        {order?.status === 'READY' ? '🔔' : order?.status === 'SERVED' ? '🍽️' : '⏳'}
                    </div>
                    <h1 className="text-2xl font-black">طلب #{order?.orderNumber ?? '...'}</h1>
                    <p className="text-muted-foreground text-sm mt-1">تتبع حالة طلبك في الوقت الفعلي</p>
                </div>

                {/* Status stepper */}
                <div className="bg-card rounded-2xl border p-4 space-y-3">
                    {STATUS_STEPS.map((step, idx) => (
                        <div key={step.key} className={cn('flex items-center gap-3', idx > activeIndex && 'opacity-40')}>
                            <div className={cn(
                                'w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 border-2',
                                idx < activeIndex ? 'bg-green-100 border-green-500 text-green-700'
                                    : idx === activeIndex ? 'bg-primary/10 border-primary text-primary animate-pulse'
                                        : 'bg-muted border-border text-muted-foreground'
                            )}>
                                {idx < activeIndex ? '✓' : step.icon}
                            </div>
                            <span className={cn('font-bold text-sm', idx === activeIndex && 'text-primary')}>{step.label}</span>
                        </div>
                    ))}
                </div>

                {/* Order items */}
                {order && (
                    <div className="bg-card rounded-2xl border p-4 space-y-2">
                        <h2 className="font-bold text-sm text-muted-foreground mb-2">تفاصيل الطلب</h2>
                        {order.items.map(item => (
                            <div key={item.id} className="flex justify-between items-start text-sm">
                                <div>
                                    <span className="font-medium">{item.menuItem.name}</span>
                                    {item.modifiers.length > 0 && (
                                        <p className="text-xs text-muted-foreground">
                                            {item.modifiers.map(m => m.modifierOption.nameAr || m.modifierOption.name).join(' · ')}
                                        </p>
                                    )}
                                </div>
                                <span className="font-bold text-muted-foreground shrink-0 mr-2">×{item.quantity}</span>
                            </div>
                        ))}
                        <div className="border-t pt-2 flex justify-between font-black text-base">
                            <span>الإجمالي</span>
                            <span>{order.totalAmount.toFixed(0)} د.ع</span>
                        </div>
                    </div>
                )}

                {/* نموذج بيانات الزبون — يظهر عند SERVED فقط */}
                {order?.status === 'SERVED' && !customerFormDismissed && (
                    <CustomerInfoForm
                        orderId={orderId}
                        onDismiss={() => setCustomerFormDismissed(true)}
                    />
                )}

                {/* Bill request button */}
                {order?.status === 'READY' || order?.status === 'SERVED' ? (
                    (() => {
                        const isBillRequested = billRequested || order?.billRequested;
                        return !isBillRequested ? (
                            <button
                                onClick={handleRequestBill}
                                disabled={requestingBill}
                                className="w-full h-14 rounded-2xl bg-green-600 text-white font-black text-lg shadow-lg active:scale-95 transition-all disabled:opacity-50"
                            >
                                {requestingBill ? '⏳ جاري الإرسال...' : '💳 اطلب الفاتورة'}
                            </button>
                        ) : (
                            <div className="space-y-4">
                                <div className="w-full h-14 rounded-2xl bg-green-100 border-2 border-green-500 text-green-700 font-black text-base flex items-center justify-center gap-2">
                                    ✅ تم إرسال طلب الفاتورة — سيأتيك النادل قريباً
                                </div>
                                {/* التقييم يظهر بعد طلب الفاتورة مباشرةً */}
                                {!feedbackSubmitted && (
                                    <FeedbackPrompt
                                        orderId={orderId}
                                        onSubmitted={() => setFeedbackSubmitted(true)}
                                    />
                                )}
                            </div>
                        );
                    })()
                ) : null}

                {/* New order button */}
                <button
                    onClick={onNewOrder}
                    className="w-full h-12 rounded-2xl border-2 border-primary text-primary font-bold text-base transition-all active:scale-95"
                >
                    + إضافة طلب جديد لنفس الطاولة
                </button>
            </div>
        </div>
    );
}
