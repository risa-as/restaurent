import { getMenuAnalysis } from '@/lib/actions/menu';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function MenuAnalysisPage() {
    const analysis = await getMenuAnalysis();

    const averageMargin = analysis.length > 0
        ? analysis.reduce((acc, item) => acc + item.marginPct, 0) / analysis.length
        : 0;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Menu Profitability Analysis</h1>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Avg Profit Margin</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{averageMargin.toFixed(1)}%</div>
                    </CardContent>
                </Card>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Item</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Cost</TableHead>
                            <TableHead>Profit</TableHead>
                            <TableHead>Margin %</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {analysis.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                    No items found with recipes.
                                </TableCell>
                            </TableRow>
                        ) : (
                            analysis.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell>{item.category?.name}</TableCell>
                                    <TableCell>{item.price.toFixed(0)} د.ع</TableCell>
                                    <TableCell className="text-muted-foreground">{item.cost.toFixed(0)} د.ع</TableCell>
                                    <TableCell className="font-semibold text-green-600">+{item.margin.toFixed(0)} د.ع</TableCell>
                                    <TableCell>
                                        <Badge variant={item.marginPct > 60 ? 'default' : item.marginPct > 30 ? 'secondary' : 'destructive'}>
                                            {item.marginPct.toFixed(1)}%
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
