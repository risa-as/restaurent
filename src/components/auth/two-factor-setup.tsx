'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Shield, Copy, Eye, EyeOff, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface SetupData {
    secret: string;
    qrDataUrl: string;
    backupCodes: string[];
}

export function TwoFactorSetup({ role }: { role?: string }) {
    const { toast } = useToast();
    const router = useRouter();
    const { update } = useSession();
    const [setupData, setSetupData] = useState<SetupData | null>(null);
    const [code, setCode] = useState('');
    const [showSecret, setShowSecret] = useState(false);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);

    useEffect(() => {
        fetch('/api/auth/2fa/setup', { method: 'POST' })
            .then(r => r.json())
            .then(data => { setSetupData(data); setLoading(false); })
            .catch(() => { toast({ title: 'خطأ في تحميل بيانات 2FA', variant: 'destructive' }); setLoading(false); });
    }, [toast]);

    const handleVerify = async () => {
        if (!setupData || code.length < 6) return;
        setVerifying(true);
        try {
            const res = await fetch('/api/auth/2fa/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    code,
                    secret: setupData.secret,
                    backupCodes: setupData.backupCodes,
                    isSetup: true,
                }),
            });
            const data = await res.json();
            if (data.success) {
                // Update session token so middleware sees twoFactorEnabled = true
                await update({ twoFactorEnabled: true });
                toast({ title: '✅ تم تفعيل المصادقة الثنائية' });
                router.push(role === 'SUPER_ADMIN' ? '/superadmin' : '/dashboard');
            } else {
                toast({ title: 'خطأ', description: data.error, variant: 'destructive' });
            }
        } finally {
            setVerifying(false);
        }
    };

    if (loading) return (
        <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            جاري التحضير...
        </div>
    );

    if (!setupData) return null;

    return (
        <Card className="w-full max-w-md" dir="rtl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    إعداد المصادقة الثنائية (2FA)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
                <p className="text-sm text-muted-foreground">
                    امسح رمز QR بتطبيق Google Authenticator أو Authy، ثم أدخل الرمز المكوّن من 6 أرقام.
                </p>

                {/* QR Code */}
                <div className="flex justify-center">
                    <Image src={setupData.qrDataUrl} alt="QR Code" width={200} height={200} />
                </div>

                {/* Secret key toggle */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between">
                        <Label className="text-xs">المفتاح السري (للإدخال اليدوي)</Label>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setShowSecret(s => !s)}>
                            {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </Button>
                    </div>
                    {showSecret && (
                        <div className="flex items-center gap-2 bg-muted rounded p-2">
                            <code className="text-xs font-mono flex-1 break-all">{setupData.secret}</code>
                            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => {
                                navigator.clipboard.writeText(setupData.secret);
                                toast({ title: 'تم النسخ' });
                            }}>
                                <Copy className="w-3 h-3" />
                            </Button>
                        </div>
                    )}
                </div>

                {/* Backup codes */}
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">رموز الطوارئ (احتفظ بها في مكان آمن)</Label>
                    <div className="grid grid-cols-2 gap-1 bg-muted rounded p-2">
                        {setupData.backupCodes.map((code, i) => (
                            <code key={i} className="text-xs font-mono text-center py-0.5">{code}</code>
                        ))}
                    </div>
                </div>

                {/* Verification */}
                <div className="space-y-2">
                    <Label>رمز التحقق (6 أرقام)</Label>
                    <Input
                        value={code}
                        onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="text-center font-mono text-2xl tracking-widest h-12"
                        dir="ltr"
                        maxLength={6}
                        autoFocus
                    />
                </div>

                <Button onClick={handleVerify} disabled={verifying || code.length < 6} className="w-full gap-2">
                    {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                    تأكيد الإعداد
                </Button>
            </CardContent>
        </Card>
    );
}
