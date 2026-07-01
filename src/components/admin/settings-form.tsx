'use client';

import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { updateSystemSettings } from '@/lib/actions/admin';
import { useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { DollarSign, Percent, Loader2, Save, CheckCircle2, Clock, Hash } from 'lucide-react';
import { useState } from 'react';
import { NUMBER_LOCALE_OPTIONS, DEFAULT_NUMBER_LOCALE } from '@/lib/number-locale';
import { cn } from '@/lib/utils';

interface SettingsFormProps {
    settings: {
        currency: string;
        taxRate: number;
        serviceFee: number;
        tableReviewMinutes: number;
        numberLocale?: string | null;
    } | null;
    config?: {
        serviceMode: string;
    } | null;
}

export function SettingsForm({ settings }: SettingsFormProps) {
    const [isPending, startTransition] = useTransition();
    const [saved, setSaved] = useState(false);
    const [numberLocale, setNumberLocale] = useState<string>(
        settings?.numberLocale || DEFAULT_NUMBER_LOCALE
    );
    const { toast } = useToast();

    interface SettingsFormValues {
        currency: string;
        taxRate: number;
        serviceFee: number;
        tableReviewMinutes: number;
    }

    const { register, handleSubmit } = useForm<SettingsFormValues>({
        defaultValues: {
            currency: settings?.currency || 'د.ع',
            taxRate: settings?.taxRate || 0,
            serviceFee: settings?.serviceFee || 0,
            tableReviewMinutes: settings?.tableReviewMinutes ?? 25,
        }
    });

    const onSubmit = (data: SettingsFormValues) => {
        startTransition(async () => {
            const res = await updateSystemSettings({
                ...data,
                taxRate: Number(data.taxRate),
                serviceFee: Number(data.serviceFee),
                tableReviewMinutes: Number(data.tableReviewMinutes),
                numberLocale,
            });

            if (res.success) {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
                toast({ title: 'تم حفظ الإعدادات بنجاح' });
            } else {
                toast({ variant: 'destructive', title: 'فشل حفظ الإعدادات', description: res.error });
            }
        });
    };

    return (
        <Card className="shadow-sm" dir="rtl">
            <CardHeader className="border-b pb-4">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10">
                        <DollarSign className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-lg">الإعدادات المالية</CardTitle>
                        <CardDescription className="text-xs mt-0.5">تحكم في العملة ومعدل الضريبة ورسوم الخدمة</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Currency */}
                        <div className="space-y-1.5">
                            <Label htmlFor="currency" className="text-sm font-medium">رمز العملة</Label>
                            <div className="relative">
                                <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    id="currency"
                                    {...register('currency')}
                                    className="pr-9"
                                    placeholder="د.ع"
                                    dir="ltr"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">مثال: د.ع، IQD، $</p>
                        </div>

                        {/* Tax Rate */}
                        <div className="space-y-1.5">
                            <Label htmlFor="taxRate" className="text-sm font-medium">معدل الضريبة (%)</Label>
                            <div className="relative">
                                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    id="taxRate"
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    {...register('taxRate')}
                                    className="pr-9"
                                    dir="ltr"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">اتركه 0 إذا لا تنطبق ضريبة</p>
                        </div>

                        {/* Service Fee */}
                        <div className="space-y-1.5">
                            <Label htmlFor="serviceFee" className="text-sm font-medium">رسوم الخدمة (%)</Label>
                            <div className="relative">
                                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    id="serviceFee"
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="100"
                                    {...register('serviceFee')}
                                    className="pr-9"
                                    dir="ltr"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">رسوم إضافية تُضاف على الفاتورة</p>
                        </div>

                        {/* Table Review Minutes */}
                        <div className="space-y-1.5 md:col-span-2">
                            <Label htmlFor="tableReviewMinutes" className="text-sm font-medium">
                                وقت مراجعة الطاولة بعد التسليم (دقيقة) — خدمة سريعة
                            </Label>
                            <div className="relative">
                                <Clock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                <Input
                                    id="tableReviewMinutes"
                                    type="number"
                                    min="5"
                                    max="120"
                                    step="5"
                                    {...register('tableReviewMinutes')}
                                    className="pr-9"
                                    dir="ltr"
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                في نظام الخدمة السريعة — بعد هذه المدة يُنبَّه النادل للتحقق من الطاولة (القيمة الافتراضية 25 دقيقة)
                            </p>
                        </div>
                    </div>

                    {/* Number Locale */}
                    <div className="space-y-3 pt-2 border-t">
                        <div className="flex items-center gap-2">
                            <Hash className="w-4 h-4 text-muted-foreground" />
                            <Label className="text-sm font-medium">لغة عرض الأرقام</Label>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {NUMBER_LOCALE_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setNumberLocale(opt.value)}
                                    className={cn(
                                        'flex flex-col items-center gap-1.5 rounded-xl border-2 p-4 transition-all text-center',
                                        numberLocale === opt.value
                                            ? 'border-primary bg-primary/5 shadow-sm'
                                            : 'border-border hover:border-primary/40 hover:bg-muted/50'
                                    )}
                                >
                                    <span className="text-2xl font-bold tabular-nums tracking-wide">
                                        {opt.example}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{opt.label}</span>
                                    {numberLocale === opt.value && (
                                        <span className="text-xs text-primary font-medium">✓ محدد</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2 border-t">
                        <Button type="submit" disabled={isPending} className="gap-2">
                            {isPending
                                ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</>
                                : <><Save className="w-4 h-4" /> حفظ التغييرات</>
                            }
                        </Button>
                        {saved && (
                            <span className="flex items-center gap-1.5 text-sm text-green-600">
                                <CheckCircle2 className="w-4 h-4" /> تم الحفظ
                            </span>
                        )}
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
