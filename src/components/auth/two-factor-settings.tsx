'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, ShieldCheck, ShieldOff } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface TwoFactorSettingsProps {
    twoFactorEnabled: boolean;
}

export function TwoFactorSettings({ twoFactorEnabled }: TwoFactorSettingsProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [disabling, setDisabling] = useState(false);

    const handleDisable = async () => {
        setDisabling(true);
        try {
            const res = await fetch('/api/auth/2fa/disable', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                toast({ title: '✅ تم إلغاء تفعيل 2FA' });
                router.refresh();
            } else {
                toast({ title: 'خطأ', description: data.error, variant: 'destructive' });
            }
        } finally {
            setDisabling(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="w-4 h-4" />
                    المصادقة الثنائية (2FA)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {twoFactorEnabled
                            ? <ShieldCheck className="w-8 h-8 text-green-500" />
                            : <ShieldOff className="w-8 h-8 text-muted-foreground" />
                        }
                        <div>
                            <p className="font-medium text-sm">
                                {twoFactorEnabled ? 'مفعّل' : 'غير مفعّل'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {twoFactorEnabled
                                    ? 'حسابك محمي بمصادقة TOTP'
                                    : 'ننصح بتفعيل المصادقة الثنائية لحماية حسابك'
                                }
                            </p>
                        </div>
                        <Badge variant={twoFactorEnabled ? 'default' : 'secondary'}>
                            {twoFactorEnabled ? 'نشط' : 'معطّل'}
                        </Badge>
                    </div>

                    {twoFactorEnabled ? (
                        <Button
                            variant="destructive"
                            size="sm"
                            disabled={disabling}
                            onClick={handleDisable}
                        >
                            إلغاء التفعيل
                        </Button>
                    ) : (
                        <Button
                            size="sm"
                            onClick={() => router.push('/auth/2fa?setup=true')}
                        >
                            تفعيل 2FA
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
