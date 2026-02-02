import { getCompletedOrders } from '@/lib/actions/orders';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import NextLink from 'next/link';
import { cn } from "@/lib/utils";

export default async function HistoryPage() {
    const orders = await getCompletedOrders();

    const statusMap: Record<string, string> = {
        COMPLETED: 'مكتمل',
        CANCELLED: 'ملغي'
    };

    const statusColor: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
        COMPLETED: 'default', // Black/White usually
        CANCELLED: 'destructive'
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">سجل الطلبات</h1>
            </div>

            <div className="rounded-md border bg-white shadow">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-right">رقم الطلب</TableHead>
                            <TableHead className="text-right">التاريخ</TableHead>
                            <TableHead className="text-right">النوع</TableHead>
                            <TableHead className="text-right">الأصناف</TableHead>
                            <TableHead className="text-right">المبلغ</TableHead>
                            <TableHead className="text-right">الحالة</TableHead>
                            <TableHead className="text-center">إجراءات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell className="font-medium">#{order.orderNumber}</TableCell>
                                <TableCell>{format(order.createdAt, "PPP p", { locale: ar })}</TableCell>
                                <TableCell>
                                    {order.tableId ? (
                                        <Badge variant="outline">طاولة {order.table?.number}</Badge>
                                    ) : (
                                        <Badge variant="secondary">سفري / توصيل</Badge>
                                    )}
                                </TableCell>
                                <TableCell className="max-w-[300px] truncate" title={order.items.map(i => i.menuItem.name).join(', ')}>
                                    {order.items.map(i => i.menuItem.name).join(', ')}
                                </TableCell>
                                <TableCell className="font-bold">{order.totalAmount.toFixed(0)} د.ع</TableCell>
                                <TableCell>
                                    <Badge variant={statusColor[order.status] || 'secondary'}>
                                        {statusMap[order.status] || order.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                    <NextLink
                                        href={`/dashboard/orders/${order.id}`}
                                        className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
                                    >
                                        عرض التفاصيل
                                    </NextLink>
                                </TableCell>
                            </TableRow>
                        ))}
                        {orders.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                    لا يوجد طلبات سابقة
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
