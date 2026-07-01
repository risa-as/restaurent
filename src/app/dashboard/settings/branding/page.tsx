'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UploadButton } from '@/lib/uploadthing';
import {
    Palette, Save, Image as ImageIcon, Check, RefreshCw,
    Loader2, Store, Trash2, Upload, Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';

const PRESET_COLORS = [
    '#f97316', '#ef4444', '#8b5cf6', '#3b82f6',
    '#10b981', '#f59e0b', '#ec4899', '#06b6d4',
    '#84cc16', '#6366f1', '#14b8a6', '#f43f5e',
];

export default function BrandingSettingsPage() {
    const { toast } = useToast();
    const [name, setName] = useState('');
    const [appName, setAppName] = useState('');
    const [color, setColor] = useState('#f97316');
    const [logoUrl, setLogoUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [previewColor, setPreviewColor] = useState('#f97316');
    const colorDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        fetch('/api/tenant/settings')
            .then(res => res.json())
            .then(data => {
                if (data.tenant) {
                    setName(data.tenant.name || '');
                    setAppName(data.tenant.appName || '');
                    setColor(data.tenant.primaryColor || '#f97316');
                    setPreviewColor(data.tenant.primaryColor || '#f97316');
                    setLogoUrl(data.tenant.logoUrl || '');
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const handleColorChange = (val: string) => {
        setColor(val);
        setPreviewColor(val);
        if (colorDebounceRef.current) clearTimeout(colorDebounceRef.current);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/tenant/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, appName, primaryColor: color, logoUrl })
            });
            if (!res.ok) throw new Error('فشل الحفظ');
            toast({
                title: '✅ تم الحفظ بنجاح',
                description: 'تم تحديث هوية المطعم. ستُطبَّق التغييرات بعد تحديث الصفحة.',
            });
            setTimeout(() => window.location.reload(), 1500);
        } catch (e: any) {
            toast({ title: 'خطأ في الحفظ', description: e.message, variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span>جاري تحميل الإعدادات...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex items-center gap-3 border-b pb-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: previewColor + '20' }}>
                    <Palette className="w-5 h-5" style={{ color: previewColor }} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold">هوية المطعم (White Labeling)</h1>
                    <p className="text-sm text-muted-foreground">خصّص ألوان وشعار مطعمك ليظهر للعملاء والموظفين بشكل فريد</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* ── القسم الرئيسي ── */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* اسم المطعم */}
                        <div className="bg-card border rounded-xl p-5 space-y-4">
                            <div className="flex items-center gap-2 font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                                <Store className="w-4 h-4" />
                                معلومات المطعم
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">اسم المطعم الرسمي</Label>
                                    <Input
                                        id="name"
                                        required
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="مطعم الشرقي"
                                    />
                                    <p className="text-xs text-muted-foreground">يظهر في الفواتير وتقارير النظام</p>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="appName">اسم التطبيق (App Name)</Label>
                                    <Input
                                        id="appName"
                                        value={appName}
                                        onChange={e => setAppName(e.target.value)}
                                        placeholder="Sharqi POS"
                                    />
                                    <p className="text-xs text-muted-foreground">يظهر في شريط المتصفح وشاشة الدخول</p>
                                </div>
                            </div>
                        </div>

                        {/* الشعار */}
                        <div className="bg-card border rounded-xl p-5 space-y-4">
                            <div className="flex items-center gap-2 font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                                <ImageIcon className="w-4 h-4" />
                                شعار المطعم
                            </div>

                            {/* معاينة الشعار */}
                            <div className="flex items-start gap-4">
                                <div className="w-28 h-28 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                                    {logoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={logoUrl} alt="شعار المطعم" className="w-full h-full object-contain p-2" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-1 text-muted-foreground">
                                            <ImageIcon className="w-8 h-8 opacity-30" />
                                            <span className="text-xs">لا يوجد شعار</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex-1 space-y-3">
                                    {/* رفع الصورة عبر UploadThing */}
                                    <div>
                                        <p className="text-sm font-medium mb-2">رفع شعار جديد</p>
                                        <div className={cn(
                                            "border-2 border-dashed rounded-lg p-3 transition-colors",
                                            uploadingLogo ? "border-primary/50 bg-primary/5" : "border-muted-foreground/20 hover:border-primary/40"
                                        )}>
                                            <UploadButton
                                                endpoint="imageUploader"
                                                onUploadBegin={() => setUploadingLogo(true)}
                                                onClientUploadComplete={(res) => {
                                                    setUploadingLogo(false);
                                                    if (res?.[0]?.url) {
                                                        setLogoUrl(res[0].url);
                                                        toast({ title: '✅ تم رفع الشعار', description: 'اضغط حفظ لتأكيد التغييرات' });
                                                    }
                                                }}
                                                onUploadError={(err) => {
                                                    setUploadingLogo(false);
                                                    toast({ title: 'فشل رفع الشعار', description: err.message, variant: 'destructive' });
                                                }}
                                                appearance={{
                                                    button: 'bg-primary text-primary-foreground hover:bg-primary/90 text-sm px-4 py-2 rounded-md font-medium ut-uploading:cursor-not-allowed ut-uploading:opacity-70',
                                                    allowedContent: 'text-xs text-muted-foreground mt-1',
                                                }}
                                                content={{
                                                    button: uploadingLogo ? (
                                                        <span className="flex items-center gap-2">
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            جاري الرفع...
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-2">
                                                            <Upload className="w-4 h-4" />
                                                            اختر صورة
                                                        </span>
                                                    ),
                                                    allowedContent: 'PNG, JPG, SVG — حتى 4MB',
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* أو أدخل رابط مباشر */}
                                    <div className="space-y-1.5">
                                        <p className="text-xs text-muted-foreground">أو أدخل رابط مباشر للشعار</p>
                                        <div className="flex gap-2">
                                            <Input
                                                value={logoUrl}
                                                onChange={e => setLogoUrl(e.target.value)}
                                                placeholder="https://example.com/logo.png"
                                                dir="ltr"
                                                className="text-left text-sm flex-1"
                                            />
                                            {logoUrl && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => setLogoUrl('')}
                                                    title="حذف الشعار"
                                                >
                                                    <Trash2 className="w-4 h-4 text-destructive" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* اللون الأساسي */}
                        <div className="bg-card border rounded-xl p-5 space-y-4">
                            <div className="flex items-center gap-2 font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                                <Palette className="w-4 h-4" />
                                اللون الأساسي
                            </div>

                            {/* ألوان مقترحة */}
                            <div>
                                <p className="text-sm text-muted-foreground mb-3">اختر من الألوان الجاهزة</p>
                                <div className="flex flex-wrap gap-2">
                                    {PRESET_COLORS.map(c => (
                                        <button
                                            key={c}
                                            type="button"
                                            onClick={() => handleColorChange(c)}
                                            className={cn(
                                                "w-9 h-9 rounded-lg border-2 transition-all hover:scale-110",
                                                color === c ? "border-foreground scale-110 shadow-md" : "border-transparent"
                                            )}
                                            style={{ background: c }}
                                            title={c}
                                        >
                                            {color === c && <Check className="w-4 h-4 text-white mx-auto drop-shadow" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* اختيار مخصص */}
                            <div>
                                <p className="text-sm text-muted-foreground mb-3">أو اختر لوناً مخصصاً</p>
                                <div className="flex items-center gap-3">
                                    <div className="relative w-12 h-12 rounded-lg overflow-hidden border-2 border-muted-foreground/30 shadow-inner">
                                        <input
                                            type="color"
                                            value={color}
                                            onChange={e => handleColorChange(e.target.value)}
                                            className="absolute -inset-2 w-16 h-16 cursor-pointer"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <code className="px-3 py-1 bg-muted rounded-lg font-mono text-sm block">{color}</code>
                                        <p className="text-xs text-muted-foreground">HEX Color Code</p>
                                    </div>
                                    <Input
                                        value={color}
                                        onChange={e => {
                                            const val = e.target.value;
                                            if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) handleColorChange(val);
                                        }}
                                        className="w-32 font-mono text-sm"
                                        dir="ltr"
                                        placeholder="#f97316"
                                        maxLength={7}
                                    />
                                </div>
                            </div>

                            <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3">
                                💡 هذا اللون سيُستخدم في جميع الأزرار والروابط والعناصر التفاعلية في نظامك وقائمة QR للزبائن.
                            </p>
                        </div>
                    </div>

                    {/* ── معاينة مباشرة ── */}
                    <div className="space-y-4">
                        <div className="bg-card border rounded-xl p-5 space-y-4 sticky top-4">
                            <div className="flex items-center gap-2 font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                                <Eye className="w-4 h-4" />
                                معاينة مباشرة
                            </div>

                            {/* محاكاة شاشة Login */}
                            <div className="rounded-xl overflow-hidden border shadow-sm bg-background">
                                {/* Header bar */}
                                <div className="p-3 flex items-center gap-2" style={{ background: previewColor }}>
                                    {logoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={logoUrl} alt="logo" className="h-6 object-contain" />
                                    ) : (
                                        <div className="w-6 h-6 rounded bg-white/30 flex items-center justify-center">
                                            <Store className="w-3.5 h-3.5 text-white" />
                                        </div>
                                    )}
                                    <span className="text-white text-sm font-bold truncate">{name || 'اسم المطعم'}</span>
                                </div>

                                {/* Body preview */}
                                <div className="p-4 space-y-3">
                                    <div className="space-y-1">
                                        <div className="h-2 w-16 rounded-full bg-muted" />
                                        <div className="h-7 rounded-lg bg-muted border" />
                                    </div>
                                    <div className="space-y-1">
                                        <div className="h-2 w-20 rounded-full bg-muted" />
                                        <div className="h-7 rounded-lg bg-muted border" />
                                    </div>
                                    <button
                                        type="button"
                                        className="w-full py-2 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
                                        style={{ background: previewColor }}
                                    >
                                        دخول
                                    </button>
                                </div>
                            </div>

                            {/* معاينة الشعار */}
                            {logoUrl && (
                                <div className="rounded-xl border p-4 bg-muted/20 text-center">
                                    <p className="text-xs text-muted-foreground mb-2">معاينة الشعار</p>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={logoUrl} alt="logo" className="h-12 object-contain mx-auto" />
                                </div>
                            )}

                            {/* معاينة الزر */}
                            <div className="rounded-xl border p-4 space-y-2">
                                <p className="text-xs text-muted-foreground">أمثلة على العناصر</p>
                                <button
                                    type="button"
                                    className="w-full py-2 rounded-lg text-white text-sm font-medium"
                                    style={{ background: previewColor }}
                                >
                                    زر رئيسي
                                </button>
                                <button
                                    type="button"
                                    className="w-full py-2 rounded-lg text-sm font-medium border-2"
                                    style={{ color: previewColor, borderColor: previewColor + '40', background: previewColor + '10' }}
                                >
                                    زر ثانوي
                                </button>
                                <div
                                    className="w-full py-1.5 rounded-lg text-white text-xs text-center font-bold"
                                    style={{ background: previewColor }}
                                >
                                    Badge • نشط
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* زر الحفظ */}
                <div className="flex items-center justify-between border-t pt-5">
                    <p className="text-sm text-muted-foreground">
                        ستُطبَّق التغييرات فور الحفظ وتحديث الصفحة
                    </p>
                    <div className="flex gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => window.location.reload()}
                            className="gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            إعادة تعيين
                        </Button>
                        <Button type="submit" disabled={saving} className="gap-2 min-w-[130px]">
                            {saving ? (
                                <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</>
                            ) : (
                                <><Save className="w-4 h-4" /> حفظ التعديلات</>
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
