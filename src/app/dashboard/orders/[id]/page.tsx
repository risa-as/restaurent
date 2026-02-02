import { getOrderDetails } from '@/lib/actions/orders';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { ArrowBigRight, ArrowLeft, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PrintButton } from '@/components/orders/print-button';
import { Receipt } from '@/components/orders/receipt';

interface OrderDetailsPageProps {
    params: {
        id: string;
    };
}

export default async function OrderDetailsPage({ params }: OrderDetailsPageProps) {
    const order = await getOrderDetails(params.id);

    if (!order) {
        notFound();
    }

    const {
        orderNumber,
        status,
        createdAt,
        table,
        items,
        totalAmount,
        tax,
        serviceFee,
        delivery,
        note
    } = order;

    // Calculate subtotal
    const subtotal = items.reduce((acc, item) => acc + item.totalPrice, 0);

    // Status translation
    const statusMap: Record<string, string> = {
        PENDING: 'قيد الانتظار',
        PREPARING: 'جاري التحضير',
        READY: 'جاهز',
        SERVED: 'تم التقديم',
        COMPLETED: 'مكتمل',
        CANCELLED: 'ملغي'
    };

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-6">
            <Receipt order={order} />
            <div className="flex items-center justify-between no-print print:hidden">
                <Button variant="ghost" asChild>
                    <Link href="/dashboard/orders" className="flex items-center gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        عودة للطلبات
                    </Link>
                </Button>
                <PrintButton />
            </div>

            <Card className="overflow-hidden">
                <CardHeader className="bg-muted/50 pb-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="text-sm text-muted-foreground mb-1">رقم الطلب</div>
                            <CardTitle className="text-3xl font-bold">#{orderNumber}</CardTitle>
                        </div>
                        <Badge variant={status === 'COMPLETED' ? 'default' : 'secondary'} className="text-lg px-4 py-1">
                            {statusMap[status] || status}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="-mt-8">
                    <Card className="mb-8 shadow-sm">
                        <CardContent className="p-6 grid gap-4 sm:grid-cols-2 text-sm">
                            <div className="grid gap-1">
                                <div className="font-semibold text-muted-foreground">التاريخ والوقت</div>
                                <div>{format(createdAt, "PPP p", { locale: ar })}</div>
                            </div>
                            <div className="grid gap-1">
                                <div className="font-semibold text-muted-foreground">الموقع / العميل</div>
                                {table ? (
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium">طاولة {table.number}</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <ShoppingBag className="w-4 h-4" />
                                        <span className="font-medium">{delivery ? 'توصيل' : 'سفري'}</span>
                                        {delivery && <span className="text-muted-foreground">({delivery.driver?.name || "غير معين"})</span>}
                                    </div>
                                )}
                            </div>
                            {delivery && (
                                <>
                                    <div className="grid gap-1">
                                        <div className="font-semibold text-muted-foreground">العميل</div>
                                        <div>{delivery.customerName} ({delivery.customerPhone})</div>
                                    </div>
                                    <div className="grid gap-1">
                                        <div className="font-semibold text-muted-foreground">العنوان</div>
                                        <div>{delivery.address}</div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <div className="space-y-4">
                        <div className="text-lg font-semibold">تفاصيل الطلب</div>
                        <div className="border rounded-lg overflow-hidden">
                            <table className="w-full text-sm text-right">
                                <thead className="bg-muted/50">
                                    <tr className="border-b">
                                        <th className="h-12 px-4 font-medium">الصنف</th>
                                        <th className="h-12 px-4 font-medium max-w-[100px] text-center">الكمية</th>
                                        <th className="h-12 px-4 font-medium text-left">السعر</th>
                                        <th className="h-12 px-4 font-medium text-left">المجموع</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item) => (
                                        <tr key={item.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                                            <td className="p-4 align-top">
                                                <div className="font-medium">{item.menuItem.name}</div>
                                                {item.notes && <div className="text-xs text-muted-foreground mt-1">{item.notes}</div>}
                                            </td>
                                            <td className="p-4 align-top text-center">{item.quantity}</td>
                                            <td className="p-4 align-top text-left">{item.unitPrice.toFixed(0)} د.ع</td>
                                            <td className="p-4 align-top text-left font-medium">{item.totalPrice.toFixed(0)} د.ع</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 items-end mt-8">
                        <div className="w-full max-w-xs space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">المجموع الفرعي</span>
                                <span>{subtotal.toFixed(0)} د.ع</span>
                            </div>
                            {tax > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">الضريبة</span>
                                    <span>{tax.toFixed(0)} د.ع</span>
                                </div>
                            )}
                            {(serviceFee !== null && serviceFee > 0) && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">رسوم الخدمة</span>
                                    <span>{serviceFee?.toFixed(0)} د.ع</span>
                                </div>
                            )}
                            {delivery && delivery.deliveryFee > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">رسوم التوصيل</span>
                                    <span>{delivery.deliveryFee.toFixed(0)} د.ع</span>
                                </div>
                            )}
                            <div className="h-px bg-border my-2" />
                            <div className="flex justify-between font-bold text-lg">
                                <span>الإجمالي</span>
                                <span>{totalAmount.toFixed(0)} د.ع</span>
                            </div>
                        </div>

                        {note && (
                            <div className="w-full mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                                <strong>ملاحظات:</strong> {note}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
