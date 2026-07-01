'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Mail, ArrowRight, CheckCircle } from 'lucide-react';

export function ForgotPasswordForm() {
    const [email, setEmail] = useState('');
    const [isPending, setIsPending] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsPending(true);
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            if (res.ok) {
                setSuccess(true);
            } else {
                setError('حدث خطأ، يرجى المحاولة مجدداً');
            }
        } catch {
            setError('تعذر الاتصال بالخادم');
        } finally {
            setIsPending(false);
        }
    };

    if (success) {
        return (
            <Card>
                <CardContent className="pt-8 pb-8 flex flex-col items-center gap-4 text-center">
                    <div className="rounded-full bg-green-100 p-4">
                        <CheckCircle className="h-10 w-10 text-green-600" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">تم إرسال البريد</h2>
                        <p className="text-muted-foreground text-sm mt-2">
                            إذا كان البريد مسجلاً لدينا، ستصلك رسالة بالرابط خلال دقائق. الرابط صالح 30 دقيقة.
                        </p>
                    </div>
                    <Link href="/login" className="text-primary text-sm font-medium hover:underline flex items-center gap-1">
                        <ArrowRight className="h-4 w-4" /> العودة لتسجيل الدخول
                    </Link>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="text-center">
                <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-2">
                    <Mail className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>نسيت كلمة المرور؟</CardTitle>
                <CardDescription>أدخل بريدك الإلكتروني وسنرسل لك رابط الإعادة</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">البريد الإلكتروني</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="your@email.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            dir="ltr"
                        />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <Button type="submit" className="w-full" disabled={isPending || !email}>
                        {isPending ? 'جاري الإرسال...' : 'إرسال رابط الإعادة'}
                    </Button>
                    <div className="text-center">
                        <Link href="/login" className="text-sm text-muted-foreground hover:text-primary">
                            العودة لتسجيل الدخول
                        </Link>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
