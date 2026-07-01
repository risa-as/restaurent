'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { createAnnouncement } from '@/lib/actions/superadmin';

export default function AnnouncementForm() {
    const [isPending, startTransition] = useTransition();
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [type, setType] = useState('INFO');
    const [targetPlan, setTargetPlan] = useState('ALL');

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError('');
        setSuccess(false);
        const form = e.currentTarget;
        const formData = new FormData(form);
        formData.set('type', type);
        if (targetPlan !== 'ALL') formData.set('targetPlan', targetPlan);

        startTransition(async () => {
            try {
                await createAnnouncement(formData);
                setSuccess(true);
                form.reset();
                setType('INFO');
                setTargetPlan('ALL');
            } catch (err: any) {
                setError(err.message || 'حدث خطأ');
            }
        });
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-primary" />
                    إنشاء إعلان جديد
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="title">عنوان الإعلان</Label>
                        <Input id="title" name="title" placeholder="مثال: صيانة مجدولة" required />
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="body">محتوى الإعلان</Label>
                        <Textarea id="body" name="body" placeholder="تفاصيل الإعلان..." rows={3} required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label>النوع</Label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="INFO">ℹ️ معلومات</SelectItem>
                                    <SelectItem value="WARNING">⚠️ تحذير</SelectItem>
                                    <SelectItem value="UPDATE">✅ تحديث</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>الخطة المستهدفة</Label>
                            <Select value={targetPlan} onValueChange={setTargetPlan}>
                                <SelectTrigger className="h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">الكل</SelectItem>
                                    <SelectItem value="TRIAL">TRIAL</SelectItem>
                                    <SelectItem value="BASIC">BASIC</SelectItem>
                                    <SelectItem value="PRO">PRO</SelectItem>
                                    <SelectItem value="ENTERPRISE">ENTERPRISE</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label htmlFor="expiresAt">تاريخ الانتهاء (اختياري)</Label>
                        <Input id="expiresAt" name="expiresAt" type="date" dir="ltr" />
                    </div>

                    {success && (
                        <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 p-2.5 rounded-lg text-sm">
                            <CheckCircle2 className="w-4 h-4" /> تم نشر الإعلان بنجاح
                        </div>
                    )}
                    {error && (
                        <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 p-2.5 rounded-lg text-sm">
                            <AlertCircle className="w-4 h-4" /> {error}
                        </div>
                    )}

                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? <><Loader2 className="w-4 h-4 animate-spin ml-2" /> جاري النشر...</> : 'نشر الإعلان'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
