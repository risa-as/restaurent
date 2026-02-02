import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RawMaterial } from '@prisma/client';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface LowStockListProps {
    items: RawMaterial[];
}

export function LowStockList({ items }: LowStockListProps) {
    return (
        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>تنبيهات انخفاض المخزون</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-right">العنصر</TableHead>
                            <TableHead className="text-right">المخزون</TableHead>
                            <TableHead className="text-right">الحد الأدنى</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                                    لا توجد تنبيهات انخفاض مخزون.
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map(item => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="destructive">{item.currentStock} {item.unit}</Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">{item.minStockLevel}</TableCell>
                                    <TableCell>
                                        <AlertTriangle className="h-4 w-4 text-red-500" />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
