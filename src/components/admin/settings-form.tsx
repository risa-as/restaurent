'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { updateSystemSettings } from '@/lib/actions/admin';
import { useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';

interface SettingsFormProps {
    settings: {
        restaurantName: string;
        currency: string;
        taxRate: number;
        serviceFee: number;
    } | null;
}

export function SettingsForm({ settings }: SettingsFormProps) {
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    interface SettingsFormValues {
        restaurantName: string;
        currency: string;
        taxRate: number;
        serviceFee: number;
    }

    const { register, handleSubmit } = useForm<SettingsFormValues>({
        defaultValues: {
            restaurantName: settings?.restaurantName || 'My Restaurant',
            currency: settings?.currency || 'د.ع',
            taxRate: settings?.taxRate || 0,
            serviceFee: settings?.serviceFee || 0,
        }
    });

    const onSubmit = (data: SettingsFormValues) => {
        startTransition(async () => {
            const res = await updateSystemSettings({
                ...data,
                taxRate: Number(data.taxRate),
                serviceFee: Number(data.serviceFee)
            });
            if (res.success) {
                toast({ title: "تم حفظ الإعدادات بنجاح" });
            } else {
                toast({
                    variant: "destructive",
                    title: "فشل حفظ الإعدادات",
                    description: res.error
                });
            }
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>إعداد النظام</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>اسم المطعم</Label>
                            <Input {...register('restaurantName')} />
                        </div>
                        <div className="space-y-2">
                            <Label>رمز العملة</Label>
                            <Input {...register('currency')} />
                        </div>
                        <div className="space-y-2">
                            <Label>معدل الضريبة (%)</Label>
                            <Input type="number" step="0.1" {...register('taxRate')} />
                        </div>
                        <div className="space-y-2">
                            <Label>رسوم الخدمة (%)</Label>
                            <Input type="number" step="0.1" {...register('serviceFee')} />
                        </div>
                    </div>
                    <Button type="submit" disabled={isPending}>
                        {isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
