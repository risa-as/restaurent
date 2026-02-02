'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { authenticate } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UtensilsCrossed, AlertCircle } from 'lucide-react';

export default function LoginForm() {
    const [errorMessage, dispatch] = useFormState(authenticate, undefined);

    return (
        <Card className="w-full max-w-sm shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
            <CardHeader className="text-center space-y-2">
                <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-2">
                    <UtensilsCrossed className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-2xl font-bold tracking-tight">مرحباً بك مجدداً</CardTitle>
                <CardDescription className="text-base">
                    سجل الدخول للمتابعة إلى لوحة التحكم
                </CardDescription>
            </CardHeader>
            <form action={dispatch}>
                <CardContent className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="email" className="text-right">البريد الإلكتروني</Label>
                        <Input
                            id="email"
                            type="email"
                            name="email"
                            placeholder="name@example.com"
                            required
                            dir="ltr"
                            className="text-right h-10 bg-white"
                        />
                    </div>
                    <div className="grid gap-2">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="password">كلمة المرور</Label>
                        </div>
                        <Input
                            id="password"
                            type="password"
                            name="password"
                            required
                            dir="ltr"
                            className="text-right h-10 bg-white"
                        />
                    </div>
                    <div className="text-xs text-muted-foreground text-center bg-gray-50 p-3 rounded-md border border-gray-100 flex flex-col gap-1">
                        <span className="font-semibold">بيانات تجريبية (المدير):</span>
                        <span className="font-mono" dir="ltr">admin@example.com / 123456</span>
                    </div>
                    <input type="hidden" name="redirectTo" value="/dashboard" />
                    {errorMessage && (
                        <div className="flex items-center gap-2 text-destructive text-sm font-medium bg-destructive/5 p-3 rounded-md border border-destructive/10">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {errorMessage}
                        </div>
                    )}
                </CardContent>
                <CardFooter className="pb-6">
                    <LoginButton />
                </CardFooter>
            </form>
        </Card>
    );
}

function LoginButton() {
    const { pending } = useFormStatus();

    return (
        <Button className="w-full" aria-disabled={pending} disabled={pending}>
            {pending ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    جاري الدخول...
                </>
            ) : (
                'تسجيل الدخول'
            )}
        </Button>
    );
}
