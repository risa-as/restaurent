'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, AlertCircle, Loader2, Zap, Star, Crown, Clock, Upload, Building2, Smartphone } from 'lucide-react';
import { submitUpgradeRequest } from '@/lib/actions/billing';
import { useFmt } from '@/contexts/number-locale-context';
import { UploadButton } from '@uploadthing/react';
import type { OurFileRouter } from '@/app/api/uploadthing/core';

interface PlanPrices {
    pricingBasic: number;
    pricingPro: number;
    pricingEnterprise: number;
}

interface Props {
    currentPlan: string;
    pricing: PlanPrices;
    hasPendingRequest?: boolean;
}

const PLAN_CONFIG = [
    {
        key: 'BASIC',
        label: 'الأساسية',
        icon: Star,
        color: 'border-slate-300 bg-slate-50 dark:bg-slate-900/30',
        activeColor: 'border-slate-500 bg-slate-100 dark:bg-slate-800',
        iconColor: 'text-slate-600',
        features: ['إدارة الطلبات', 'المطبخ والكاشير', 'تقارير أساسية'],
    },
    {
        key: 'PRO',
        label: 'المتقدمة',
        icon: Zap,
        color: 'border-purple-200 bg-purple-50 dark:bg-purple-950/20',
        activeColor: 'border-purple-500 bg-purple-100 dark:bg-purple-900/40',
        iconColor: 'text-purple-600',
        badge: 'الأكثر شيوعاً',
        features: ['كل ميزات الأساسية', 'QR Menu للزبائن', 'نظام الولاء', 'التوصيل'],
    },
    {
        key: 'ENTERPRISE',
        label: 'المؤسسات',
        icon: Crown,
        color: 'border-amber-200 bg-amber-50 dark:bg-amber-950/20',
        activeColor: 'border-amber-500 bg-amber-100 dark:bg-amber-900/40',
        iconColor: 'text-amber-600',
        features: ['كل ميزات المتقدمة', 'تعدد الأفرع', 'تكامل Talabat', 'دعم مخصص'],
    },
];

const PAYMENT_METHODS = [
    { key: 'BANK_TRANSFER', label: 'حوالة مصرفية', icon: Building2 },
    { key: 'ZAIN_CASH', label: 'زين كاش', icon: Smartphone },
    { key: 'OTHER', label: 'أخرى', icon: Upload },
];

export default function PaymentSubmissionForm({ currentPlan, pricing, hasPendingRequest = false }: Props) {
    const fmt = useFmt();
    const PLAN_PRICES: Record<string, number> = {
        BASIC: pricing.pricingBasic,
        PRO: pricing.pricingPro,
        ENTERPRISE: pricing.pricingEnterprise,
    };

    const [isPending, startTransition] = useTransition();
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');
    const [plan, setPlan] = useState(currentPlan === 'TRIAL' ? 'BASIC' : currentPlan);
    const [method, setMethod] = useState('ZAIN_CASH');
    const [months, setMonths] = useState('1');
    const [receiptUrl, setReceiptUrl] = useState('');
    const [receiptNote, setReceiptNote] = useState('');
    const [uploadError, setUploadError] = useState('');

    const suggestedAmount = (PLAN_PRICES[plan] || 0) * parseInt(months || '1');

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError('');
        setSuccess(false);

        startTransition(async () => {
            try {
                await submitUpgradeRequest(plan, parseInt(months), receiptUrl || undefined, receiptNote || undefined);
                setSuccess(true);
                setReceiptUrl('');
                setReceiptNote('');
            } catch (err: any) {
                setError(err.message || 'حدث خطأ، يرجى المحاولة مرة أخرى');
            }
        });
    }

    if (hasPendingRequest) {
        return (
            <Card>
                <CardContent className="py-8 flex flex-col items-center gap-3 text-center">
                    <Clock className="w-10 h-10 text-yellow-500" />
                    <p className="font-semibold">طلب ترقية بانتظار الموافقة</p>
                    <p className="text-sm text-muted-foreground">سيتم إشعارك فور مراجعة طلبك من قِبل الإدارة</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                    <Upload className="w-4 h-4 text-primary" />
                    تقديم طلب ترقية جديد
                </CardTitle>
                <CardDescription className="text-xs">
                    اختر الخطة المطلوبة وعدد الأشهر، ثم أرفق وصل الدفع للتحقق السريع
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Plan selection */}
                    <div className="space-y-2">
                        <Label>اختر الخطة</Label>
                        <div className="grid gap-2">
                            {PLAN_CONFIG.map(p => {
                                const Icon = p.icon;
                                const price = PLAN_PRICES[p.key];
                                const isSelected = plan === p.key;
                                const isCurrent = currentPlan === p.key;
                                return (
                                    <button
                                        key={p.key}
                                        type="button"
                                        onClick={() => setPlan(p.key)}
                                        className={`relative flex flex-col rounded-xl border-2 px-4 py-3 text-right transition-all ${isSelected ? p.activeColor : p.color} ${isSelected ? 'ring-2 ring-offset-1 ring-primary/30' : 'hover:border-muted-foreground/30'}`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Icon className={`w-4 h-4 ${p.iconColor}`} />
                                                <span className="font-semibold text-sm">{p.label}</span>
                                                {p.badge && (
                                                    <span className="text-[10px] font-bold bg-purple-600 text-white px-1.5 py-0.5 rounded-full">{p.badge}</span>
                                                )}
                                                {isCurrent && (
                                                    <span className="text-[10px] font-bold bg-green-600 text-white px-1.5 py-0.5 rounded-full">خطتك الحالية</span>
                                                )}
                                            </div>
                                            <span className="font-bold text-sm tabular-nums">
                                                {fmt(price)} <span className="font-normal text-xs text-muted-foreground">د.ع/شهر</span>
                                            </span>
                                        </div>
                                        {isSelected && (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {p.features.map(f => (
                                                    <span key={f} className="text-[10px] bg-background/60 border rounded px-1.5 py-0.5 text-muted-foreground">
                                                        ✓ {f}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                        {isSelected && (
                                            <span className="absolute left-3 top-4 w-3 h-3 rounded-full bg-primary" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Months */}
                    <div className="space-y-1.5">
                        <Label>عدد الأشهر</Label>
                        <Select value={months} onValueChange={setMonths}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {[1, 2, 3, 6, 12].map(m => (
                                    <SelectItem key={m} value={String(m)}>
                                        {m} {m === 1 ? 'شهر' : 'أشهر'}
                                        {m >= 6 && <span className="text-xs text-green-600 mr-2">— توفير!</span>}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Payment method */}
                    <div className="space-y-1.5">
                        <Label>طريقة الدفع</Label>
                        <div className="flex gap-2">
                            {PAYMENT_METHODS.map(m => {
                                const Icon = m.icon;
                                return (
                                    <button
                                        key={m.key}
                                        type="button"
                                        onClick={() => setMethod(m.key)}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-sm rounded-lg border-2 transition-all ${method === m.key ? 'border-primary bg-primary/5 font-semibold' : 'border-border hover:border-muted-foreground/40'}`}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        {m.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Total amount preview */}
                    {suggestedAmount > 0 && (
                        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">المبلغ الإجمالي</span>
                            <span className="font-black text-lg text-primary">
                                {fmt(suggestedAmount)} <span className="text-sm font-normal">د.ع</span>
                            </span>
                        </div>
                    )}

                    {/* Receipt upload */}
                    <div className="space-y-1.5">
                        <Label>وصل الدفع (اختياري — يُسرّع المراجعة)</Label>
                        {receiptUrl ? (
                            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                                <span className="text-sm text-green-700 flex-1 truncate">تم رفع الوصل بنجاح</span>
                                <button
                                    type="button"
                                    onClick={() => setReceiptUrl('')}
                                    className="text-xs text-red-500 hover:underline"
                                >
                                    إزالة
                                </button>
                            </div>
                        ) : (
                            <div className="border-2 border-dashed border-border rounded-xl p-4 text-center">
                                <UploadButton<OurFileRouter, 'imageUploader'>
                                    endpoint="imageUploader"
                                    onClientUploadComplete={(res) => {
                                        if (res?.[0]?.url) {
                                            setReceiptUrl(res[0].url);
                                            setUploadError('');
                                        }
                                    }}
                                    onUploadError={(err) => {
                                        setUploadError(err.message || 'فشل رفع الوصل');
                                    }}
                                    appearance={{
                                        button: 'bg-primary text-primary-foreground hover:bg-primary/90 text-sm px-4 py-2 rounded-lg',
                                        allowedContent: 'text-xs text-muted-foreground mt-1',
                                    }}
                                    content={{
                                        button: 'رفع صورة الوصل',
                                        allowedContent: 'PNG, JPG, PDF حتى 4MB',
                                    }}
                                />
                                {uploadError && (
                                    <p className="text-xs text-red-500 mt-1">{uploadError}</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Note */}
                    <div className="space-y-1.5">
                        <Label>ملاحظة للإدارة (اختياري)</Label>
                        <Textarea
                            value={receiptNote}
                            onChange={e => setReceiptNote(e.target.value)}
                            placeholder="مثال: تم التحويل من بنك الرشيد برقم عملية 12345"
                            rows={2}
                            className="text-sm resize-none"
                        />
                    </div>

                    {success && (
                        <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 p-3 rounded-lg text-sm">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            تم إرسال طلب الترقية. سيتم التواصل معك لإتمام الدفع.
                        </div>
                    )}
                    {error && (
                        <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-lg text-sm">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            {error}
                        </div>
                    )}

                    <Button type="submit" className="w-full" disabled={isPending}>
                        {isPending ? <><Loader2 className="w-4 h-4 animate-spin ml-2" />جاري الإرسال...</> : 'تقديم طلب الترقية'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
