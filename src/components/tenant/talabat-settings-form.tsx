'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { saveTalabatConfig, syncMenuToTalabat } from '@/lib/actions/talabat';
import { useRouter } from 'next/navigation';
import {
    RefreshCw, Save, Loader2, ShoppingCart, Key, Webhook,
    CheckCircle2, AlertCircle, Clock, Copy, Check,
    ArrowLeftRight, Zap, Link2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface TalabatConfig {
    storeId: string;
    apiKey: string;
    webhookSecret: string;
    isEnabled: boolean;
    lastSyncAt?: Date | null;
    tenantId: string;
}

interface Props {
    config: TalabatConfig | null;
    webhookUrl?: string;
}

// ── Copy Button ───────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
    const [copied, setCopied] = useState(false);
    const handleCopy = async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={handleCopy}
        >
            {copied
                ? <Check className="w-3.5 h-3.5 text-green-600" />
                : <Copy className="w-3.5 h-3.5 text-muted-foreground" />
            }
        </Button>
    );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function TalabatSettingsForm({ config, webhookUrl }: Props) {
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [isSyncing, setIsSyncing] = useState(false);
    const [saved, setSaved] = useState(false);
    const [form, setForm] = useState({
        storeId: config?.storeId ?? '',
        apiKey: config?.apiKey ?? '',
        webhookSecret: config?.webhookSecret ?? '',
        isEnabled: config?.isEnabled ?? false,
    });

    const isConfigured = !!(config?.storeId && config?.apiKey);
    const isActive = form.isEnabled && isConfigured;

    const handleSave = () => {
        startTransition(async () => {
            const result = await saveTalabatConfig(form);
            if (result.error) {
                toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
            } else {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
                toast({ title: '✅ تم حفظ الإعدادات' });
                router.refresh();
            }
        });
    };

    const handleSync = async () => {
        if (!config?.tenantId) return;
        setIsSyncing(true);
        const result = await syncMenuToTalabat(config.tenantId);
        if (result.error) {
            toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
        } else {
            toast({ title: '✅ تمت مزامنة القائمة مع Talabat' });
            router.refresh();
        }
        setIsSyncing(false);
    };

    return (
        <div className="space-y-5" dir="rtl">

            {/* ── Status Banner ── */}
            <div className={`flex items-center gap-4 rounded-2xl border p-4 transition-colors ${
                isActive
                    ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900'
                    : !isConfigured
                    ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-950/10 dark:border-amber-900'
                    : 'bg-muted/40 border-muted'
            }`}>
                <div className={`flex items-center justify-center w-11 h-11 rounded-xl shrink-0 ${
                    isActive ? 'bg-green-500' : !isConfigured ? 'bg-amber-400' : 'bg-muted'
                }`}>
                    <ShoppingCart className={`w-5 h-5 ${isActive || !isConfigured ? 'text-white' : 'text-muted-foreground'}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">تكامل Talabat</p>
                        {isActive && (
                            <Badge className="bg-green-100 text-green-700 border-green-200 text-[11px]">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block ml-1" />
                                متصل
                            </Badge>
                        )}
                        {!isConfigured && (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 text-[11px]">
                                يحتاج إعداد
                            </Badge>
                        )}
                        {isConfigured && !form.isEnabled && (
                            <Badge variant="secondary" className="text-[11px]">معطّل</Badge>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {isActive
                            ? 'التكامل مفعّل — الطلبات تصل تلقائياً من Talabat'
                            : !isConfigured
                            ? 'أدخل Store ID ومفتاح API لبدء التكامل'
                            : 'التكامل معطّل — فعّله لاستقبال الطلبات'}
                    </p>
                    {config?.lastSyncAt && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="w-3 h-3" />
                            آخر مزامنة: {format(new Date(config.lastSyncAt), 'dd/MM/yyyy HH:mm', { locale: ar })}
                        </p>
                    )}
                </div>
                <div className="shrink-0">
                    {isActive
                        ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                        : <AlertCircle className="w-5 h-5 text-muted-foreground" />
                    }
                </div>
            </div>

            {/* ── Two-column layout on wide screens ── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

                {/* LEFT: Connection Settings */}
                <Card className="shadow-sm lg:col-span-3">
                    <CardHeader className="border-b pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Key className="w-4 h-4 text-blue-500" />
                                    بيانات الاتصال
                                </CardTitle>
                                <CardDescription className="text-xs mt-0.5">
                                    احصل عليها من لوحة تحكم Talabat → قسم التكامل
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <Label htmlFor="talabat-toggle" className="text-sm font-medium cursor-pointer">
                                    {form.isEnabled ? 'مفعّل' : 'معطّل'}
                                </Label>
                                <Switch
                                    id="talabat-toggle"
                                    checked={form.isEnabled}
                                    onCheckedChange={v => setForm(f => ({ ...f, isEnabled: v }))}
                                    dir="ltr"
                                />
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-5 space-y-4">
                        {/* Store ID */}
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium flex items-center gap-1.5">
                                <ShoppingCart className="w-3.5 h-3.5 text-orange-500" />
                                معرف المتجر (Store ID)
                            </Label>
                            <Input
                                value={form.storeId}
                                onChange={e => setForm(f => ({ ...f, storeId: e.target.value }))}
                                dir="ltr"
                                placeholder="12345"
                                className="font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">معرف مطعمك في لوحة تحكم Talabat</p>
                        </div>

                        {/* API Key */}
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium flex items-center gap-1.5">
                                <Key className="w-3.5 h-3.5 text-blue-500" />
                                مفتاح API
                            </Label>
                            <Input
                                type="password"
                                value={form.apiKey}
                                onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
                                dir="ltr"
                                placeholder="••••••••••••••••"
                                className="font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">مفتاح المصادقة السري من Talabat</p>
                        </div>

                        {/* Webhook Secret */}
                        <div className="space-y-1.5">
                            <Label className="text-sm font-medium flex items-center gap-1.5">
                                <Webhook className="w-3.5 h-3.5 text-purple-500" />
                                Webhook Secret
                                <span className="text-xs text-muted-foreground font-normal">(اختياري)</span>
                            </Label>
                            <Input
                                type="password"
                                value={form.webhookSecret}
                                onChange={e => setForm(f => ({ ...f, webhookSecret: e.target.value }))}
                                dir="ltr"
                                placeholder="••••••••••••••••"
                                className="font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">يُستخدم للتحقق من صحة الطلبات الواردة (HMAC-SHA256)</p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
                            <Button onClick={handleSave} disabled={isPending} className="gap-2">
                                {isPending
                                    ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</>
                                    : <><Save className="w-4 h-4" /> حفظ الإعدادات</>
                                }
                            </Button>
                            {isConfigured && (
                                <Button variant="outline" onClick={handleSync} disabled={isSyncing} className="gap-2">
                                    {isSyncing
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري المزامنة...</>
                                        : <><RefreshCw className="w-4 h-4" /> مزامنة القائمة</>
                                    }
                                </Button>
                            )}
                            {saved && (
                                <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                                    <CheckCircle2 className="w-4 h-4" /> تم الحفظ
                                </span>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* RIGHT: Webhook URL + How it works */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Webhook URL Card */}
                    {webhookUrl && (
                        <Card className="shadow-sm border-purple-200 dark:border-purple-900">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Link2 className="w-4 h-4 text-purple-500" />
                                    رابط الـ Webhook
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    أضف هذا الرابط في إعدادات Talabat لاستقبال الطلبات
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="flex items-center gap-1.5 bg-muted/60 rounded-lg px-3 py-2 border">
                                    <code className="text-xs font-mono text-purple-700 dark:text-purple-300 flex-1 truncate" dir="ltr">
                                        {webhookUrl}
                                    </code>
                                    <CopyButton text={webhookUrl} />
                                </div>
                                <p className="text-[11px] text-muted-foreground mt-2">
                                    انتقل إلى لوحة Talabat → الإعدادات → Webhook URL، والصق الرابط أعلاه
                                </p>
                            </CardContent>
                        </Card>
                    )}

                    {/* How it works */}
                    <Card className="shadow-sm">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center gap-2">
                                <Zap className="w-4 h-4 text-amber-500" />
                                كيف يعمل التكامل؟
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0 space-y-3">
                            {[
                                { icon: ArrowLeftRight, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30', title: 'استقبال الطلبات', desc: 'تصل طلبات Talabat تلقائياً وتظهر في الكاشير' },
                                { icon: RefreshCw, color: 'text-green-500 bg-green-50 dark:bg-green-950/30', title: 'مزامنة القائمة', desc: 'تُحدَّث أصنافك وأسعارك على Talabat فوراً' },
                                { icon: Clock, color: 'text-orange-500 bg-orange-50 dark:bg-orange-950/30', title: 'تحديث الحالات', desc: 'حالات الطلبات تتزامن تلقائياً مع Talabat' },
                            ].map(({ icon: Icon, color, title, desc }) => (
                                <div key={title} className="flex items-start gap-3">
                                    <div className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${color}`}>
                                        <Icon className="w-3.5 h-3.5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold">{title}</p>
                                        <p className="text-[11px] text-muted-foreground">{desc}</p>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
