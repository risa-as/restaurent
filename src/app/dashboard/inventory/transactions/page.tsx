import { getTransactions } from '@/lib/actions/inventory';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default async function TransactionsPage() {
    const transactions = await getTransactions();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Transaction History</h1>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Material</TableHead>
                            <TableHead>Quantity</TableHead>
                            <TableHead>Cost</TableHead>
                            <TableHead>Notes</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {transactions.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                    No transactions found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            transactions.map((tx) => (
                                <TableRow key={tx.id}>
                                    <TableCell>{format(tx.transactionDate, 'Pp')}</TableCell>
                                    <TableCell>
                                        <Badge variant={
                                            tx.type === 'PURCHASE' ? 'default' :
                                                tx.type === 'WASTE' ? 'destructive' : 'secondary'
                                        }>
                                            {tx.type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{tx.material.name}</TableCell>
                                    <TableCell>
                                        {tx.type === 'USAGE' || tx.type === 'WASTE' ? '-' : '+'}
                                        {tx.quantity} {tx.material.unit}
                                    </TableCell>
                                    <TableCell>{tx.cost ? `${tx.cost.toFixed(0)} د.ع` : '-'}</TableCell>
                                    <TableCell className="max-w-[200px] truncate" title={tx.notes || ''}>
                                        {tx.notes}
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
