
'use client';

import { Order, OrderItem, MenuItem, Table, Delivery, User, OrderItemModifier, ModifierOption } from '@prisma/client';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { formatNumber } from '@/lib/utils';

type ReceiptOrderItem = OrderItem & {
    menuItem: MenuItem;
    modifiers?: (OrderItemModifier & { modifierOption: ModifierOption })[];
};

interface ReceiptProps {
    order: Order & {
        items: ReceiptOrderItem[];
        table: Table | null;
        delivery: (Delivery & { driver: User | null }) | null;
    };
}

export function Receipt({ order }: ReceiptProps) {
    const { orderNumber, items, totalAmount, createdAt, serviceFee, tax } = order;

    // Subtotal
    const subtotal = items.reduce((acc, item) => acc + item.totalPrice, 0);

    return (
        <div id="printable-receipt" className="hidden print:block bg-white text-black font-mono text-xs leading-tight section-to-print">
            <style jsx global>{`
                @media print {
                    @page {
                        size: 80mm auto;
                        margin: 0;
                    }
                    body {
                        margin: 0;
                        padding: 0;
                    }
                    body * {
                        visibility: hidden;
                    }
                    #printable-receipt, #printable-receipt * {
                        visibility: visible;
                    }
                    #printable-receipt {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        padding: 5mm;
                        direction: rtl; 
                        box-sizing: border-box;
                    }
                }
            `}</style>

            <div className="text-center mb-4">
                <h1 className="text-lg font-bold mb-1">اسم المطعم</h1>
                <p>عنوان المطعم، المدينة</p>
                <p>هاتف: 07800000000</p>
                <div className="border-b border-dashed border-black my-2"></div>
                <h2 className="text-base font-bold">فاتورة طلب #{orderNumber}</h2>
                <p className="text-[10px]">{format(new Date(createdAt), 'dd/MM/yyyy hh:mm a', { locale: ar })}</p>
                {order.table && <p className="font-bold mt-1">طاولة: {order.table.number}</p>}
                {order.delivery && <p className="font-bold mt-1">توصيل - {order.delivery.customerName}</p>}
            </div>

            <div className="mb-4">
                <table className="w-full text-right">
                    <thead>
                        <tr className="border-b border-black">
                            <th className="pb-1 text-right">الصنف</th>
                            <th className="pb-1 text-center w-8">ع</th>
                            <th className="pb-1 text-left w-16">السعر</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <>
                                <tr key={item.id}>
                                    <td className="py-1">{item.menuItem.name}</td>
                                    <td className="py-1 text-center">{item.quantity}</td>
                                    <td className="py-1 text-left">{formatNumber(item.totalPrice)}</td>
                                </tr>
                                {item.modifiers && item.modifiers.length > 0 && item.modifiers.map((mod) => (
                                    <tr key={mod.id}>
                                        <td className="pr-3 pb-0.5 text-[10px] text-gray-600" colSpan={2}>
                                            + {mod.modifierOption.nameAr || mod.modifierOption.name}
                                        </td>
                                        <td className="pb-0.5 text-left text-[10px] text-gray-600">
                                            {mod.appliedPrice > 0 ? `+${formatNumber(mod.appliedPrice)}` : ''}
                                        </td>
                                    </tr>
                                ))}
                            </>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="border-t border-dashed border-black pt-2 space-y-1 mb-4">
                <div className="flex justify-between">
                    <span>المجموع الفرعي:</span>
                    <span>{formatNumber(subtotal)}</span>
                </div>
                {tax > 0 && (
                    <div className="flex justify-between">
                        <span>الضريبة:</span>
                        <span>{formatNumber(tax)}</span>
                    </div>
                )}
                {serviceFee > 0 && (
                    <div className="flex justify-between">
                        <span>الخدمة:</span>
                        <span>{formatNumber(serviceFee)}</span>
                    </div>
                )}
                <div className="flex justify-between font-bold text-sm border-t border-black pt-1 mt-1">
                    <span>الإجمالي:</span>
                    <span>{formatNumber(totalAmount)} د.ع</span>
                </div>
            </div>

            {order.delivery && (
                <div className="border-t border-dashed border-black pt-2 mb-4 text-[10px]">
                    <p className="font-bold">تفاصيل التوصيل:</p>
                    <p>العميل: {order.delivery.customerName}</p>
                    <p>العنوان: {order.delivery.address}</p>
                    <p>الهاتف: {order.delivery.customerPhone}</p>
                </div>
            )}

            <div className="text-center text-[10px] mt-4">
                <p>شكراً لزيارتكم</p>
                <p>يرجى الاحتفاظ بالفاتورة</p>
            </div>
        </div>
    );
}
