'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Smartphone, Clock, Globe, Loader2, CheckCircle2, AlertCircle, PhoneCall } from 'lucide-react';
import { updatePlatformSettings } from '@/lib/actions/superadmin';

interface PlatformSettingsData {
    bankName: string;
    bankAccount: string;
    bankAccountName: string;
    bankIban?: string;
    zainCashNumber: string;
    supportPhone: string;
    welcomeMessage: string;
    trialDurationDays: number;
    gracePeriodDays: number;
    maintenanceMode: boolean;
    usdToIqdRate?: number;
}

export default function PlatformSettingsForm({ settings }: { settings: PlatformSettingsData }) {
    const [isPending, startTransition] = useTransition();
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [maintenanceMode, setMaintenanceMode] = useState(settings.maintenanceMode);

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError('');
        setSuccess(false);
        const formData = new FormData(e.currentTarget);
        formData.set('maintenanceMode', String(maintenanceMode));

        startTransition(async () => {
            try {
                await updatePlatformSettings(formData);
                setSuccess(true);
            } catch (err: any) {
                setError(err.message || 'حدث خطأ');
            }
        });
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Bank info */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-blue-600" />
                        معلومات الحوالة المصرفية
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="bankName">اسم المصرف</Label>
                            <Input id="bankName" name="bankName" defaultValue={settings.bankName} placeholder="مثال: مصرف الرافدين" />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="bankAccountName">اسم صاحب الحساب</Label>
                            <Input id="bankAccountName" name="bankAccountName" defaultValue={settings.bankAccountName} placeholder="الاسم الكامل" />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="bankAccount">رقم الحساب</Label>
                        <Input id="bankAccount" name="bankAccount" defaultValue={settings.bankAccount} placeholder="رقم الحساب المصرفي" dir="ltr" />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="bankIban">IBAN</Label>
                        <Input id="bankIban" name="bankIban" defaultValue={settings.bankIban || ''} placeholder="IQ12XXXXXXXXXXXXXXXXXX" dir="ltr" />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="usdToIqdRate">سعر صرف USD إلى IQD</Label>
                        <Input id="usdToIqdRate" name="usdToIqdRate" type="number" min={1} defaultValue={settings.usdToIqdRate ?? 1310} dir="ltr" />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-green-600" />
                        زين كاش
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1.5">
                        <Label htmlFor="zainCashNumber">رقم المحفظة</Label>
                        <Input id="zainCashNumber" name="zainCashNumber" defaultValue={settings.zainCashNumber} placeholder="077XXXXXXXX" dir="ltr" />
                    </div>
                </CardContent>
            </Card>

            {/* Support Phone */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <PhoneCall className="w-4 h-4 text-blue-500" />
                        رقم الدعم الفني
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1.5">
                        <Label htmlFor="supportPhone">رقم الهاتف / واتسآب</Label>
                        <Input
                            id="supportPhone"
                            name="supportPhone"
                            type="tel"
                            defaultValue={settings.supportPhone}
                            placeholder="مثال: 07XXXXXXXXX أو +964XXXXXXXXX"
                            dir="ltr"
                        />
                        <p className="text-xs text-muted-foreground">يظهر في صفحة الفوترة للمطاعم كرابط تواصل مباشر</p>
                    </div>
                </CardContent>
            </Card>

            {/* Trial & Grace */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-500" />
                        مدد الاشتراك
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="trialDurationDays">مدة التجربة (أيام)</Label>
                        <Input id="trialDurationDays" name="trialDurationDays" type="number" min={1} max={90} defaultValue={settings.trialDurationDays} dir="ltr" />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="gracePeriodDays">فترة السماح (أيام)</Label>
                        <Input id="gracePeriodDays" name="gracePeriodDays" type="number" min={0} max={30} defaultValue={settings.gracePeriodDays} dir="ltr" />
                    </div>
                </CardContent>
            </Card>

            {/* Welcome message */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Globe className="w-4 h-4 text-purple-500" />
                        رسالة الترحيب
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Textarea
                        id="welcomeMessage"
                        name="welcomeMessage"
                        defaultValue={settings.welcomeMessage}
                        placeholder="رسالة ترحيب تظهر عند تسجيل مطعم جديد..."
                        rows={3}
                    />
                </CardContent>
            </Card>

            {/* Maintenance mode */}
            <Card>
                <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold">وضع الصيانة</p>
                            <p className="text-sm text-muted-foreground">عند التفعيل، تظهر رسالة صيانة للمطاعم</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setMaintenanceMode(!maintenanceMode)}
                            className={`w-12 h-6 rounded-full transition-colors relative ${maintenanceMode ? 'bg-red-500' : 'bg-muted'}`}
                        >
                            <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${maintenanceMode ? 'right-1' : 'right-7'}`} />
                        </button>
                    </div>
                </CardContent>
            </Card>

            {/* Feedback */}
            {success && (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 p-3 rounded-lg text-sm">
                    <CheckCircle2 className="w-4 h-4" /> تم حفظ الإعدادات بنجاح
                </div>
            )}
            {error && (
                <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-lg text-sm">
                    <AlertCircle className="w-4 h-4" /> {error}
                </div>
            )}

            <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? <><Loader2 className="w-4 h-4 animate-spin ml-2" /> جاري الحفظ...</> : 'حفظ الإعدادات'}
            </Button>
        </form>
    );
}
