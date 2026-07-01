'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Shield } from 'lucide-react';
import { updateTwoFactorEmail } from '@/lib/actions/superadmin';

interface Props {
    currentEmail: string;
    loginEmail: string;
}

export default function TwoFactorEmailForm({ currentEmail, loginEmail }: Props) {
    const { toast } = useToast();
    const [email, setEmail] = useState(currentEmail || loginEmail);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        const result = await updateTwoFactorEmail(email);
        setSaving(false);
        if (result?.error) {
            toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
        } else {
            toast({ title: 'تم الحفظ', description: 'سيظهر هذا الإيميل في تطبيق Google Authenticator عند الإعداد التالي.' });
        }
    };

    return (
        <Card dir="rtl">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="w-4 h-4 text-primary" />
                    إيميل المصادقة الثنائية (2FA)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                    الإيميل الذي يظهر كاسم حساب في تطبيق Google Authenticator.
                    يمكن أن يختلف عن إيميل تسجيل الدخول.
                </p>
                <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                        إيميل تسجيل الدخول الحالي: <span className="font-mono">{loginEmail}</span>
                    </Label>
                    <div className="flex gap-2">
                        <Input
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="example@gmail.com"
                            dir="ltr"
                            className="font-mono"
                        />
                        <Button onClick={handleSave} disabled={saving || !email.trim()}>
                            {saving ? 'جاري...' : 'حفظ'}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
