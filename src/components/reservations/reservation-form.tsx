'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTransition } from 'react';
import { ReservationFormValues, reservationSchema } from '@/lib/validations/reservations';
import { Table } from '@prisma/client';
import { createReservation, updateReservation } from '@/lib/actions/reservations';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { SheetFooter } from '@/components/ui/sheet';

import { useRouter } from 'next/navigation';

interface ReservationFormProps {
    onSuccess: () => void;
    initialData?: ReservationFormValues & { id?: string };
    tables?: Table[];
}

export function ReservationForm({ onSuccess, initialData, tables = [] }: ReservationFormProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const router = useRouter();

    const form = useForm<ReservationFormValues>({
        resolver: zodResolver(reservationSchema) as any,
        defaultValues: initialData || {
            customerName: '',
            customerPhone: '',
            guests: 2,
            reservationTime: new Date(),
            notes: '',
            tableId: '',
        } as ReservationFormValues,
    });

    function onSubmit(data: ReservationFormValues) {
        startTransition(async () => {
            let res;
            if (initialData?.id) {
                res = await updateReservation(initialData.id, data);
            } else {
                res = await createReservation(data);
            }

            if (res.success) {
                toast({
                    title: initialData ? "تم تحديث الحجز" : "تم إنشاء الحجز بنجاح",
                    description: `للسيد/ة ${data.customerName}`,
                });
                if (!initialData) form.reset();
                router.refresh();
                onSuccess();
            } else {
                toast({
                    variant: "destructive",
                    title: initialData ? "فشل تحديث الحجز" : "فشل إنشاء الحجز",
                });
            }
        });
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control as any}
                    name="customerName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>اسم الضيف</FormLabel>
                            <FormControl>
                                <Input placeholder="الاسم الكريم" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control as any}
                        name="customerPhone"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>رقم الهاتف</FormLabel>
                                <FormControl>
                                    <Input placeholder="05xxxxxxxx" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control as any}
                        name="guests"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>عدد الضيوف</FormLabel>
                                <FormControl>
                                    <Input type="number" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control as any}
                    name="tableId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>تعيين طاولة (اختياري)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger dir="rtl">
                                        <SelectValue placeholder="اختر طاولة" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="none">بدون طاولة</SelectItem>
                                    {tables.map(table => (
                                        <SelectItem key={table.id} value={table.id}>
                                            طاولة {table.number} ({table.capacity} مقاعد)
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control as any}
                    name="reservationTime"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Date & Time</FormLabel>
                            <div className="flex gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value ? (
                                                    format(field.value as any, "PPP", { locale: ar })
                                                ) : (
                                                    <span>اختر تاريخاً</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={(date) => {
                                                if (date) {
                                                    const newDate = new Date(date);
                                                    // Maintain existing time if possible, or set to now
                                                    const current = field.value || new Date();
                                                    newDate.setHours(current.getHours(), current.getMinutes());
                                                    field.onChange(newDate);
                                                }
                                            }}
                                            disabled={(date) =>
                                                date < new Date(new Date().setHours(0, 0, 0, 0))
                                            }
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>

                                <Input
                                    type="time"
                                    className="w-32"
                                    value={field.value ? format(field.value, 'HH:mm') : ''}
                                    onChange={(e) => {
                                        const [hours, minutes] = e.target.value.split(':').map(Number);
                                        const newDate = new Date(field.value || new Date());
                                        newDate.setHours(hours);
                                        newDate.setMinutes(minutes);
                                        field.onChange(newDate);
                                    }}
                                />
                            </div>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control as any}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>ملاحظات</FormLabel>
                            <FormControl>
                                <Textarea placeholder="طلبات خاصة..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <SheetFooter>
                    <Button type="submit" disabled={isPending}>
                        {isPending ? 'جاري الحفظ...' : initialData ? 'تحديث الحجز' : 'إنشاء الحجز'}
                    </Button>
                </SheetFooter>
            </form>
        </Form>
    );
}
