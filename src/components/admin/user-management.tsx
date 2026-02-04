'use client';

import { User } from '@prisma/client';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { deleteUser, upsertUser, UserInput } from '@/lib/actions/admin';
import { Edit, Trash2, Plus, Lock } from 'lucide-react';
import { useState, useTransition } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

const schema = z.object({
    name: z.string().min(2),
    email: z.string().email(),
    password: z.string().optional(),
    role: z.enum(['ADMIN', 'MANAGER', 'WAITER', 'CHEF', 'ACCOUNTANT', 'DRIVER', 'CAPTAIN', 'DELIVERY_MANAGER', 'CASHIER']),
    phone: z.string().optional(),
});

export function UserManagement({ users }: { users: User[] }) {
    const [open, setOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const handleEdit = (user: User) => {
        setEditingUser(user);
        setOpen(true);
    };

    const handleAdd = () => {
        setEditingUser(null);
        setOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">أعضاء الفريق</h2>
                <Button onClick={handleAdd}>
                    <Plus className="mr-2 h-4 w-4" /> إضافة مستخدم
                </Button>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingUser ? 'تعديل مستخدم' : 'مستخدم جديد'}</DialogTitle>
                    </DialogHeader>
                    <UserForm
                        user={editingUser}
                        onSuccess={() => setOpen(false)}
                    />
                </DialogContent>
            </Dialog>

            <div className="border rounded-md bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="text-right">الاسم</TableHead>
                            <TableHead className="text-right">الدور</TableHead>
                            <TableHead className="text-right">البريد الإلكتروني</TableHead>
                            <TableHead className="text-left">الإجراءات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map(user => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium text-right">{user.name}</TableCell>
                                <TableCell className="text-right">
                                    <Badge variant="outline">{user.role}</Badge>
                                </TableCell>
                                <TableCell className="text-right">{user.email}</TableCell>
                                <TableCell className="text-left gap-2 flex justify-start">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <form action={async () => { await deleteUser(user.id); }}>
                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </form>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

function UserForm({ user, onSuccess }: { user: User | null, onSuccess: () => void }) {
    const [isPending, startTransition] = useTransition();
    const form = useForm<UserInput>({
        // @ts-ignore - Schema matches but optional password logic needs care
        resolver: zodResolver(schema),
        defaultValues: {
            name: user?.name || '',
            email: user?.email || '',
            role: (user?.role as any) || 'WAITER',
            phone: user?.phone || '',
            password: ''
        }
    });

    const onSubmit = (data: UserInput) => {
        startTransition(async () => {
            await upsertUser(data, user?.id);
            onSuccess();
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>الاسم</FormLabel>
                            <FormControl><Input {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>البريد الإلكتروني</FormLabel>
                            <FormControl><Input type="email" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>الدور</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="اختر دوراً" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="ADMIN">مسؤول</SelectItem>
                                    <SelectItem value="MANAGER">مدير</SelectItem>
                                    <SelectItem value="WAITER">نادل</SelectItem>
                                    <SelectItem value="CHEF">طاهي</SelectItem>
                                    <SelectItem value="DRIVER">سائق</SelectItem>
                                    <SelectItem value="CAPTAIN">كابتن</SelectItem>
                                    <SelectItem value="CASHIER">أمين صندوق</SelectItem>
                                    <SelectItem value="DELIVERY_MANAGER">مدير سائقين</SelectItem>
                                    <SelectItem value="ACCOUNTANT">محاسب</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>{user ? 'كلمة المرور الجديدة (اختياري)' : 'كلمة المرور'}</FormLabel>
                            <FormControl><Input type="password" placeholder={user ? "اترك الحقل فارغاً للاحتفاظ بالحالية" : "******"} {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <Button type="submit" className="w-full" disabled={isPending}>
                    {user ? 'تحديث المستخدم' : 'إنشاء مستخدم'}
                </Button>
            </form>
        </Form>
    );
}
