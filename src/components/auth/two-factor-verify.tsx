'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Shield, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

export function TwoFactorVerify({ role }: { role?: string }) {
    const { toast } = useToast();
    const router = useRouter();
    const { update } = useSession();
    const [code, setCode] = useState('');
    const [backupCode, setBackupCode] = useState('');
    const [useBackup, setUseBackup] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleVerify = async () => {
        setLoading(true);
        try {
            const endpoint = useBackup ? '/api/auth/2fa/backup' : '/api/auth/2fa/verify';
            const body = useBackup ? { backupCode } : { code };
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.success) {
                await update({ twoFactorVerified: true });
                router.push(role === 'SUPER_ADMIN' ? '/superadmin' : '/dashboard');
            } else {
                toast({ title: 'خطأ', description: data.error, variant: 'destructive' });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="w-full max-w-sm" dir="rtl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    التحقق بخطوتين
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {!useBackup ? (
                    <>
                        <p className="text-sm text-muted-foreground">
                            أدخل الرمز من تطبيق Google Authenticator أو Authy.
                        </p>
                        <div className="space-y-2">
                            <Label>رمز التحقق</Label>
                            <Input
                                value={code}
                                onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="000000"
                                className="text-center font-mono text-2xl tracking-widest h-12"
                                dir="ltr"
                                maxLength={6}
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleVerify()}
                            />
                        </div>
                        <Button onClick={handleVerify} disabled={loading || code.length < 6} className="w-full gap-2">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                            تحقق
                        </Button>
                        <button
                            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setUseBackup(true)}
                        >
                            استخدام رمز الطوارئ
                        </button>
                    </>
                ) : (
                    <>
                        <p className="text-sm text-muted-foreground">
                            أدخل أحد رموز الطوارئ (XXXXX-XXXXX).
                        </p>
                        <div className="space-y-2">
                            <Label>رمز الطوارئ</Label>
                            <Input
                                value={backupCode}
                                onChange={e => setBackupCode(e.target.value.toUpperCase())}
                                placeholder="XXXXXX-XXXXXX"
                                className="text-center font-mono"
                                dir="ltr"
                                autoFocus
                            />
                        </div>
                        <Button onClick={handleVerify} disabled={loading || !backupCode} className="w-full gap-2">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            استخدم الرمز
                        </Button>
                        <button
                            className="w-full text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => setUseBackup(false)}
                        >
                            ← العودة لرمز TOTP
                        </button>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
