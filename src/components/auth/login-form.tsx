'use client';

import { useFormState, useFormStatus } from 'react-dom';
import { authenticate } from '@/lib/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, Mail, Lock } from 'lucide-react';
import Link from 'next/link';

export default function LoginForm() {
    const [errorMessage, dispatch] = useFormState(authenticate, undefined);

    return (
        <div className="w-full">
            {/* Header */}
            <div className="mb-8">
                <h2 className="text-3xl font-black text-foreground mb-1">مرحباً بك 👋</h2>
                <p className="text-muted-foreground text-base">سجّل الدخول للمتابعة إلى النظام</p>
            </div>

            <form action={dispatch} className="space-y-5">

                {/* Email field */}
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold text-foreground">
                        البريد الإلكتروني
                    </Label>
                    <div className="relative">
                        <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                        <Input
                            id="email"
                            type="email"
                            name="email"
                            placeholder="you@example.com"
                            required
                            dir="ltr"
                            className="pr-10 h-12 text-sm bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all rounded-xl"
                        />
                    </div>
                </div>

                {/* Password field */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-sm font-semibold text-foreground">
                            كلمة المرور
                        </Label>
                        <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                            نسيت كلمة المرور؟
                        </Link>
                    </div>
                    <div className="relative">
                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60 pointer-events-none" />
                        <Input
                            id="password"
                            type="password"
                            name="password"
                            placeholder="••••••••"
                            required
                            dir="ltr"
                            className="pr-10 h-12 text-sm bg-background border-border focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all rounded-xl"
                        />
                    </div>
                </div>

                {/* Error message */}
                {errorMessage && (
                    <div className="flex items-center gap-2.5 text-destructive text-sm font-medium bg-destructive/8 p-3.5 rounded-xl border border-destructive/15">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* Submit button */}
                <div className="pt-2">
                    <LoginButton />
                </div>

            </form>
        </div>
    );
}

function LoginButton() {
    const { pending } = useFormStatus();

    return (
        <Button
            className="w-full h-12 text-base font-black bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg shadow-primary/25 transition-all active:scale-[0.98]"
            aria-disabled={pending}
            disabled={pending}
        >
            {pending ? (
                <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    جاري الدخول...
                </span>
            ) : (
                <span className="flex items-center gap-2">
                    تسجيل الدخول
                    <span className="text-lg">←</span>
                </span>
            )}
        </Button>
    );
}
