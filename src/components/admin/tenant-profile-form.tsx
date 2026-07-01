'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { updateTenantProfile } from '@/lib/actions/admin';
import { Globe, Moon, Sun, ExternalLink, Loader2, Save, CheckCircle2 } from 'lucide-react';

interface Props {
    googlePlaceId: string;
    nightMenuStartTime: string;
    nightMenuEndTime: string;
}

export function TenantProfileForm({ googlePlaceId: initGooglePlaceId, nightMenuStartTime: initStart, nightMenuEndTime: initEnd }: Props) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [saved, setSaved] = useState(false);
    const [googlePlaceId, setGooglePlaceId] = useState(initGooglePlaceId);
    const [nightStart, setNightStart] = useState(initStart);
    const [nightEnd, setNightEnd] = useState(initEnd);

    const handleSave = () => {
        startTransition(async () => {
            const result = await updateTenantProfile({
                googlePlaceId: googlePlaceId.trim() || null,
                nightMenuStartTime: nightStart.trim() || null,
                nightMenuEndTime: nightEnd.trim() || null,
            });
            if (result.success) {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
                toast({ title: 'تم حفظ الإعدادات' });
            } else {
                toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
            }
        });
    };

    const nightMenuActive = nightStart && nightEnd;

    return (
        <Card dir="rtl" className="shadow-sm">
            <CardHeader className="border-b pb-4">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10">
                        <Globe className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                        <CardTitle className="text-lg">الإعدادات الرقمية للمطعم</CardTitle>
                        <CardDescription className="text-xs mt-0.5">تكامل Google Reviews وإعدادات القائمة الليلية</CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">

                {/* Google Place ID */}
                <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-blue-500" />
                        Google Place ID
                        <span className="text-xs text-muted-foreground font-normal">(للتقييمات)</span>
                    </Label>
                    <Input
                        value={googlePlaceId}
                        onChange={e => setGooglePlaceId(e.target.value)}
                        placeholder="ChIJ..."
                        dir="ltr"
                        className="font-mono text-sm"
                    />
                    <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
                        <span className="shrink-0 mt-0.5">💡</span>
                        <span>
                            ابحث عن مطعمك في{' '}
                            <a
                                href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline inline-flex items-center gap-0.5"
                            >
                                Place ID Finder <ExternalLink className="w-3 h-3" />
                            </a>
                            {' '}واحصل على الكود لعرض تقييمات Google على لوحة الكاشير.
                        </span>
                    </div>
                </div>

                {/* Night Menu */}
                <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                        <Moon className="w-3.5 h-3.5 text-indigo-500" />
                        أوقات القائمة الليلية
                        {nightMenuActive ? (
                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">مفعّلة</span>
                        ) : (
                            <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">غير مفعّلة</span>
                        )}
                    </Label>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                <Moon className="w-3 h-3" /> من
                            </Label>
                            <Input
                                type="time"
                                value={nightStart}
                                onChange={e => setNightStart(e.target.value)}
                                className="text-sm"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                <Sun className="w-3 h-3" /> إلى
                            </Label>
                            <Input
                                type="time"
                                value={nightEnd}
                                onChange={e => setNightEnd(e.target.value)}
                                className="text-sm"
                            />
                        </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        سيظهر مؤشر &quot;القائمة الليلية&quot; على لوحة العرض الرقمية خلال هذه الأوقات (توقيت بغداد).
                        اتركهما فارغَين لتعطيل الميزة.
                    </p>
                </div>

                <div className="flex items-center gap-3 pt-2 border-t">
                    <Button onClick={handleSave} disabled={isPending} className="gap-2">
                        {isPending
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</>
                            : <><Save className="w-4 h-4" /> حفظ التغييرات</>
                        }
                    </Button>
                    {saved && (
                        <span className="flex items-center gap-1.5 text-sm text-green-600">
                            <CheckCircle2 className="w-4 h-4" /> تم الحفظ
                        </span>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
