import { getCaptainCompletedOrders } from '@/lib/actions/captain';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCheck } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

export const dynamic = 'force-dynamic';

export default async function CaptainHistoryPage() {
    const orders = await getCaptainCompletedOrders();

    return (
        <div className="h-full overflow-y-auto max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">سجل الطلبات المكتملة</h1>

            <div className="grid gap-4 opacity-80">
                {orders.length === 0 ? (
                    <div className="text-center text-muted-foreground py-10">
                        لا توجد طلبات مكتملة مؤخراً
                    </div>
                ) : (
                    orders.map(order => (
                        <Card key={order.id} className="overflow-hidden bg-gray-50">
                            <CardHeader className="bg-gray-100/50 pb-3 border-b">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <CardTitle className="text-lg text-gray-700">
                                            #{order.orderNumber}
                                        </CardTitle>
                                        <span className="text-sm font-medium text-muted-foreground">
                                            {order.tableId ? `طاولة ${order.table?.number}` : 'سفري'}
                                        </span>
                                    </div>
                                    <Badge variant="outline" className="gap-1 px-3 py-1 bg-gray-200 text-gray-700 border-gray-300">
                                        <CheckCheck className="w-3 h-3" />
                                        مكتمل
                                    </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground" dir="ltr">
                                    {formatDistanceToNow(new Date(order.updatedAt), { addSuffix: true, locale: ar })}
                                </div>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {order.items.map(item => (
                                        <div key={item.id} className="flex items-center justify-between bg-white border p-2 rounded shadow-sm opacity-75">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold bg-gray-100 w-6 h-6 flex items-center justify-center rounded text-sm">
                                                    {item.quantity}
                                                </span>
                                                <span className="text-sm font-medium">{item.menuItem.name}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
