import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getAllDeliveryOrders } from '@/lib/actions/delivery';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { MapPin, Phone, User, Calendar, DollarSign } from 'lucide-react';

export default async function DeliveryHistoryPage() {
    const session = await auth();
    if (!session?.user) redirect('/login');

    const isManager = session.user.role === 'DELIVERY_MANAGER' || session.user.role === 'ADMIN' || session.user.role === 'MANAGER';

    // If manager, fetch all. If driver, fetch only theirs.
    const history = await getAllDeliveryOrders(isManager ? undefined : session.user.id);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">سجل التوصيل</h1>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {history.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-muted-foreground">
                        لا يوجد سجل توصيل حتى الآن.
                    </div>
                ) : (
                    history.map(delivery => (
                        <Card key={delivery.id} className="overflow-hidden">
                            <CardHeader className="bg-gray-50 border-b p-4">
                                <div className="flex justify-between items-center">
                                    <Badge variant="secondary" className="text-sm">
                                        #{delivery.order.orderNumber}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {format(new Date(delivery.order.createdAt), 'dd MMMM yyyy, hh:mm a', { locale: ar })}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-bold">{delivery.customerName}</div>
                                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                                            <Phone className="w-3 h-3" /> {delivery.customerPhone}
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                        تم التوصيل
                                    </Badge>
                                </div>

                                <div className="text-sm bg-muted/50 p-2 rounded flex items-start gap-2">
                                    <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-gray-500" />
                                    <span>{delivery.address}</span>
                                </div>

                                {isManager && delivery.driver && (
                                    <div className="text-sm flex items-center gap-2 border-t pt-2 mt-2">
                                        <User className="w-4 h-4 text-gray-500" />
                                        <span className="font-semibold">السائق: {delivery.driver.name}</span>
                                    </div>
                                )}

                                <div className="flex justify-between items-center bg-primary/5 p-2 rounded border border-primary/10">
                                    <span className="text-sm font-medium">الإجمالي:</span>
                                    <span className="font-bold text-primary flex items-center gap-1">
                                        <DollarSign className="w-4 h-4" />
                                        {delivery.order.totalAmount.toFixed(0)} د.ع
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
