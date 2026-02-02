'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { addExpense, deleteExpense, ExpenseInput } from '@/lib/actions/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Trash2, PlusCircle } from 'lucide-react';
import { useTransition } from 'react';
import { Expense } from '@prisma/client';
import { format } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { useState } from 'react';

const schema = z.object({
    description: z.string().min(2, "Description required"),
    amount: z.coerce.number().min(0.01, "Amount required"),
    category: z.string().min(2, "Category required"),
    date: z.coerce.date(),
});

export function ExpenseManager({ expenses }: { expenses: Expense[] }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">المصاريف</h2>
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm"><PlusCircle className="ml-2 h-4 w-4" /> إضافة مصروف</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>مصروف جديد</DialogTitle>
                        </DialogHeader>
                        <ExpenseForm onSuccess={() => setOpen(false)} />
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-right">التاريخ</TableHead>
                            <TableHead className="text-right">الوصف</TableHead>
                            <TableHead className="text-right">الفئة</TableHead>
                            <TableHead className="text-right">المبلغ</TableHead>
                            <TableHead className="text-left">إجراء</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {expenses.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                    لا توجد مصاريف مسجلة.
                                </TableCell>
                            </TableRow>
                        ) : (
                            expenses.map(exp => (
                                <TableRow key={exp.id}>
                                    <TableCell>{format(new Date(exp.date), 'yyyy/MM/dd')}</TableCell>
                                    <TableCell>{exp.description}</TableCell>
                                    <TableCell><span className="bg-slate-100 px-2 py-1 rounded text-xs">{exp.category}</span></TableCell>
                                    <TableCell className="font-medium text-red-600">-{exp.amount.toFixed(0)} د.ع</TableCell>
                                    <TableCell className="text-right">
                                        <form action={async () => { await deleteExpense(exp.id); }}>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-red-500">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </form>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}

function ExpenseForm({ onSuccess }: { onSuccess: () => void }) {
    const [isPending, startTransition] = useTransition();
    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            description: '',
            amount: 0,
            category: 'General',
            date: new Date()
        }
    });

    const onSubmit = (data: z.infer<typeof schema>) => {
        startTransition(async () => {
            // @ts-ignore
            await addExpense(data);
            form.reset();
            onSuccess();
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>الوصف</FormLabel>
                            <FormControl><Input placeholder="مثل: أدوات تنظيف" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>المبلغ</FormLabel>
                                <FormControl><Input type="number" step="0.01" {...field} value={(field.value as any)} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>الفئة</FormLabel>
                                <FormControl><Input placeholder="مثل: خدمات" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <Button type="submit" className="w-full" disabled={isPending}>تسجيل المصروف</Button>
            </form>
        </Form>
    )
}
