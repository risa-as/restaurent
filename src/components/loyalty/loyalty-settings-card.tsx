'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { updateLoyaltySettings } from '@/lib/actions/loyalty';
import { useToast } from '@/hooks/use-toast';
import { Star, Coins, ArrowDownUp, Info } from 'lucide-react';
import { useFmt } from '@/contexts/number-locale-context';

interface LoyaltySettingsCardProps {
    settings: {
        loyaltyEnabled: boolean;
        loyaltyPointsPerThousand: number;
        loyaltyPointValueIqd: number;
        loyaltyMinRedeemPoints: number;
    };
}

export function LoyaltySettingsCard({ settings }: LoyaltySettingsCardProps) {
    const fmt = useFmt();
    const [enabled, setEnabled] = useState(settings.loyaltyEnabled);
    const [pointsPerThousand, setPointsPerThousand] = useState(settings.loyaltyPointsPerThousand);
    const [pointValue, setPointValue] = useState(settings.loyaltyPointValueIqd);
    const [minRedeem, setMinRedeem] = useState(settings.loyaltyMinRedeemPoints);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const exampleSpend = 5000;
    const examplePoints = Math.floor((exampleSpend / 1000) * pointsPerThousand);
    const exampleDiscount = examplePoints * pointValue;

    function handleSave() {
        startTransition(async () => {
            const res = await updateLoyaltySettings({
                loyaltyEnabled: enabled,
                loyaltyPointsPerThousand: Number(pointsPerThousand),
                loyaltyPointValueIqd: Number(pointValue),
                loyaltyMinRedeemPoints: Number(minRedeem),
            });
            if (res.success) {
                toast({ title: 'تم حفظ إعدادات الولاء' });
            }
        });
    }

    return (
        <Card className="border-2 shadow-sm">
            <CardHeader className="border-b bg-muted/30">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                            <Star className="w-5 h-5 text-yellow-600 dark:text-yellow-400 fill-yellow-500" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">إعدادات نظام الولاء</CardTitle>
                            <CardDescription>تحكم في كيفية كسب العملاء للنقاط واستردادها</CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`text-sm font-semibold ${enabled ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                            {enabled ? 'مفعّل' : 'معطّل'}
                        </span>
                        <div dir="ltr">
                            <Switch
                                checked={enabled}
                                onCheckedChange={setEnabled}
                                className="data-[state=checked]:bg-green-600"
                            />
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
                {/* Settings Grid */}
                <div className={`grid gap-6 md:grid-cols-3 transition-opacity ${!enabled ? 'opacity-40 pointer-events-none' : ''}`}>
                    {/* Points per 1000 */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-semibold">
                            <Coins className="w-4 h-4 text-yellow-500" />
                            نقاط لكل 1000 دينار
                        </Label>
                        <Input
                            type="number"
                            min={1}
                            max={100}
                            value={pointsPerThousand}
                            onChange={e => setPointsPerThousand(Number(e.target.value))}
                            className="text-center text-lg font-bold"
                        />
                        <p className="text-xs text-muted-foreground">
                            العميل يكسب {pointsPerThousand} نقطة لكل 1000 د.ع ينفقها
                        </p>
                    </div>

                    {/* Point value */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-semibold">
                            <ArrowDownUp className="w-4 h-4 text-blue-500" />
                            قيمة النقطة الواحدة (دينار)
                        </Label>
                        <Input
                            type="number"
                            min={1}
                            value={pointValue}
                            onChange={e => setPointValue(Number(e.target.value))}
                            className="text-center text-lg font-bold"
                        />
                        <p className="text-xs text-muted-foreground">
                            كل نقطة تساوي {pointValue} د.ع عند الاسترداد
                        </p>
                    </div>

                    {/* Minimum redeem */}
                    <div className="space-y-2">
                        <Label className="flex items-center gap-2 text-sm font-semibold">
                            <Star className="w-4 h-4 text-orange-500" />
                            الحد الأدنى للاسترداد
                        </Label>
                        <Input
                            type="number"
                            min={1}
                            value={minRedeem}
                            onChange={e => setMinRedeem(Number(e.target.value))}
                            className="text-center text-lg font-bold"
                        />
                        <p className="text-xs text-muted-foreground">
                            يجب أن يمتلك {minRedeem} نقطة على الأقل للاسترداد
                        </p>
                    </div>
                </div>

                {/* Live Example */}
                {enabled && (
                    <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                        <div className="flex items-start gap-2">
                            <Info className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-bold text-yellow-800 dark:text-yellow-300 mb-1">مثال تطبيقي:</p>
                                <p className="text-yellow-700 dark:text-yellow-400">
                                    عميل ينفق <strong>{fmt(exampleSpend)} د.ع</strong> → يكسب{' '}
                                    <strong>{examplePoints} نقطة</strong> → تساوي{' '}
                                    <strong>{fmt(exampleDiscount)} د.ع</strong> خصماً عند الاسترداد
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end">
                    <Button onClick={handleSave} disabled={isPending}>
                        {isPending ? 'جارٍ الحفظ...' : 'حفظ الإعدادات'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
