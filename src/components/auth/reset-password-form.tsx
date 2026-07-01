'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Lock, CheckCircle } from 'lucide-react';

interface ResetPasswordFormProps {
    token: string;
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isPending, setIsPending] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!token) {
            setError('الرابط غير صالح أو منتهي الصلاحية');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('كلمتا المرور غير متطابقتين');
            return;
        }

        setIsPending(true);
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, newPassword, confirmPassword }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setSuccess(true);
            } else {
                setError(data.error || 'حدث خطأ، يرجى المحاولة مجدداً');
            }
        } catch {
            setError('تعذر الاتصال بالخادم');
        } finally {
            setIsPending(false);
        }
    };

    if (!token) {
        return (
            <Card>
                <CardContent className="pt-8 pb-8 text-center">
                    <p className="text-destructive font-medium">الرابط غير صالح أو منتهي الصلاحية</p>
                    <Link href="/forgot-password" className="text-primary text-sm mt-4 block hover:underline">
                        طلب رابط جديد
                    </Link>
                </CardContent>
            </Card>
        );
    }

    if (success) {
        return (
            <Card>
                <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4 text-center">
                    <div className="rounded-full bg-green-100 p-4">
                        <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">تم تغيير كلمة المرور!</h2>
                        <p className="text-muted-foreground text-sm mt-2">يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة</p>
                    </div>
                    <Link href="/login" className="text-primary text-sm font-medium hover:underline">
                        تسجيل الدخول
                    </Link>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="text-center">
                <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
                    <Lock className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>تعيين كلمة مرور جديدة</CardTitle>
                <CardDescription>يجب أن تكون 8 أحرف على الأقل</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="newPassword">كلمة المرور الجديدة</Label>
                        <Input
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            required
                            minLength={8}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            required
                            minLength={8}
                        />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <Button type="submit" className="w-full" disabled={isPending || !newPassword || !confirmPassword}>
                        {isPending ? 'جاري الحفظ...' : 'حفظ كلمة المرور الجديدة'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
