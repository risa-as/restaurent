'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { createStation, deleteStation, updateStation, assignCategoryToStation } from '@/lib/actions/kitchen-stations';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Pencil, ChefHat, Loader2, FolderOpen, X, Info } from 'lucide-react';
import Link from 'next/link';

interface CategoryInfo {
    id: string;
    name: string;
    stationId: string | null;
}

interface Station {
    id: string;
    name: string;
    nameAr: string | null;
    colour: string;
    sortOrder: number;
}

interface KitchenStationManagerProps {
    stations: Station[];
    categories: CategoryInfo[];
}

export function KitchenStationManager({ stations, categories }: KitchenStationManagerProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [showHelp, setShowHelp] = useState(false);
    const [newName, setNewName] = useState('');
    const [newNameAr, setNewNameAr] = useState('');
    const [newColour, setNewColour] = useState('#6366f1');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editNameAr, setEditNameAr] = useState('');
    const [editColour, setEditColour] = useState('');

    const handleCreate = () => {
        if (!newName.trim()) return;
        startTransition(async () => {
            const result = await createStation({ name: newName, nameAr: newNameAr || undefined, colour: newColour });
            if ('error' in result && result.error) {
                toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
            } else {
                toast({ title: '✅ تم إنشاء المحطة' });
                setNewName(''); setNewNameAr(''); setNewColour('#6366f1');
                router.refresh();
            }
        });
    };

    const handleDelete = (id: string) => {
        startTransition(async () => {
            const result = await deleteStation(id);
            if (result.error) {
                toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
            } else {
                toast({ title: '✅ تم حذف المحطة' });
                router.refresh();
            }
        });
    };

    const handleSaveEdit = (id: string) => {
        startTransition(async () => {
            const result = await updateStation(id, { name: editName, nameAr: editNameAr || undefined, colour: editColour });
            if (result.error) {
                toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
            } else {
                toast({ title: '✅ تم التحديث' });
                setEditingId(null);
                router.refresh();
            }
        });
    };

    const handleAssignCategory = (categoryId: string, stationId: string | null) => {
        startTransition(async () => {
            const result = await assignCategoryToStation(categoryId, stationId);
            if (result.error) {
                toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
            } else {
                router.refresh();
            }
        });
    };

    const unassignedCategories = categories.filter(c => !c.stationId);

    return (
        <Card>
            <CardHeader>
                {/* العنوان + زر المساعدة */}
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <ChefHat className="w-4 h-4" />
                        محطات المطبخ
                    </CardTitle>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowHelp(!showHelp)}
                        className={showHelp ? 'bg-primary/10 border-primary/20 text-primary' : ''}
                    >
                        <Info className="h-4 w-4 ml-2" />
                        كيف تعمل؟
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">

                {/* ── لوحة المساعدة ── */}
                {showHelp && (
                    <Card className="bg-primary/5 border-primary/20 animate-in fade-in slide-in-from-top-2 duration-300">
                        <CardContent className="pt-6 text-sm space-y-4">
                            <div className="flex justify-between items-start">
                                <h3 className="font-bold text-base text-primary flex items-center gap-2">
                                    <Info className="h-5 w-5" />
                                    دليل الاستخدام السريع — محطات المطبخ
                                </h3>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 hover:bg-primary/10"
                                    onClick={() => setShowHelp(false)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-foreground">ما هي محطات المطبخ؟</h4>
                                    <p className="text-muted-foreground leading-relaxed">
                                        محطات المطبخ تسمح لك بتقسيم العمل داخل المطبخ حسب التخصص. كل محطة تعرض
                                        على شاشة المطبخ الخاصة بها فقط الطلبات التابعة لأقسامها، مما يقلل الفوضى
                                        ويرفع سرعة التحضير.
                                    </p>
                                </div>
                                <div className="space-y-2 bg-background/50 p-3 rounded-lg border border-primary/5">
                                    <h4 className="font-semibold text-foreground mb-2">أمثلة عملية:</h4>
                                    <ul className="text-muted-foreground leading-relaxed space-y-2 text-sm">
                                        <li className="flex items-start gap-2">
                                            <span className="font-bold text-primary shrink-0">🔥 محطة الشوي:</span>
                                            <span>تُعرض عليها أصناف أقسام "المشويات" و"الكباب" فقط.</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="font-bold text-primary shrink-0">🥗 المحطة الباردة:</span>
                                            <span>تُعرض عليها أصناف أقسام "السلطات" و"المقبلات الباردة".</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <span className="font-bold text-primary shrink-0">🥤 البار:</span>
                                            <span>تُعرض عليها أصناف قسم "المشروبات" فقط.</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <div className="bg-background/80 rounded-lg p-4 border border-primary/10 space-y-3 shadow-sm">
                                <h4 className="font-semibold text-foreground">الخطوات العملية:</h4>
                                <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                                    <li>
                                        <strong>إنشاء محطة:</strong> أدخل اسم المحطة (عربي وإنجليزي) واختر لوناً مميزاً لها
                                        من اللوح أدناه، ثم اضغط "إضافة".
                                    </li>
                                    <li>
                                        <strong>ربط الأقسام:</strong> بعد إنشاء المحطة ستظهر قائمة الأقسام المتاحة.
                                        اختر القسم المطلوب من القائمة المنسدلة داخل كل محطة.
                                        <span className="text-xs mr-1 text-primary/80">(أو اذهب لـ "إدارة القائمة ← الأقسام")</span>
                                    </li>
                                    <li>
                                        <strong>فتح شاشة المطبخ:</strong> اذهب لـ{' '}
                                        <a href="/kitchen" className="underline text-primary hover:text-primary/80 font-medium">
                                            /kitchen
                                        </a>{' '}
                                        وستجد تبويبات المحطات تظهر تلقائياً في شريط التنقل العلوي.
                                    </li>
                                    <li>
                                        <strong>إلغاء التفعيل:</strong> لإيقاف وضع المحطات كلياً، افتح{' '}
                                        <Link href="/dashboard/menu" className="underline text-primary hover:text-primary/80 font-medium">
                                            إدارة القائمة ← الأقسام
                                        </Link>{' '}
                                        وأزل ربط الأقسام بالمحطات (اختر "— بدون محطة —" لكل قسم).
                                    </li>
                                </ol>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                                <span className="text-base">💡</span>
                                <span>
                                    إذا لم تربط أي قسم بمحطة، ستعمل صفحة المطبخ بالوضع الافتراضي (عرض الأقسام مباشرة) دون أي تأثير.
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ── قائمة المحطات ── */}
                <div className="space-y-3">
                    {stations.map(station => {
                        const stationCategories = categories.filter(c => c.stationId === station.id);

                        return (
                            <div key={station.id} className="border rounded-xl overflow-hidden">
                                {/* Station header */}
                                <div className="flex items-center gap-3 p-3 bg-muted/30">
                                    <div
                                        className="w-4 h-4 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: station.colour }}
                                    />
                                    {editingId === station.id ? (
                                        <div className="flex-1 grid grid-cols-3 gap-2">
                                            <Input value={editName} onChange={e => setEditName(e.target.value)} placeholder="English name" className="h-7 text-xs" />
                                            <Input value={editNameAr} onChange={e => setEditNameAr(e.target.value)} placeholder="الاسم بالعربي" className="h-7 text-xs" />
                                            <input type="color" value={editColour} onChange={e => setEditColour(e.target.value)} className="h-7 w-full rounded border" />
                                        </div>
                                    ) : (
                                        <span className="flex-1 text-sm font-bold">
                                            {station.nameAr || station.name}
                                        </span>
                                    )}
                                    <div className="flex gap-1">
                                        {editingId === station.id ? (
                                            <>
                                                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingId(null)}>إلغاء</Button>
                                                <Button size="sm" className="h-7 text-xs" onClick={() => handleSaveEdit(station.id)} disabled={isPending}>حفظ</Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => {
                                                    setEditingId(station.id);
                                                    setEditName(station.name);
                                                    setEditNameAr(station.nameAr ?? '');
                                                    setEditColour(station.colour);
                                                }}>
                                                    <Pencil className="w-3 h-3" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(station.id)} disabled={isPending}>
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Assigned categories */}
                                <div className="p-3 space-y-2">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <FolderOpen className="w-3 h-3" />
                                        <span>الأقسام المرتبطة:</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {stationCategories.map(cat => (
                                            <Badge key={cat.id} variant="secondary" className="gap-1 text-xs">
                                                {cat.name}
                                                <button
                                                    onClick={() => handleAssignCategory(cat.id, null)}
                                                    className="hover:text-destructive transition-colors"
                                                    disabled={isPending}
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                        {stationCategories.length === 0 && (
                                            <span className="text-xs text-muted-foreground/60">لم يتم ربط أي قسم بعد</span>
                                        )}
                                    </div>

                                    {unassignedCategories.length > 0 && (
                                        <select
                                            className="w-full h-7 text-xs border rounded-md bg-background px-2 mt-1"
                                            value=""
                                            onChange={e => {
                                                if (e.target.value) handleAssignCategory(e.target.value, station.id);
                                            }}
                                            disabled={isPending}
                                        >
                                            <option value="">+ إضافة قسم لهذه المحطة...</option>
                                            {unassignedCategories.map(cat => (
                                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {stations.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">لا توجد محطات — أضف محطة أدناه</p>
                    )}
                </div>

                {/* ── إضافة محطة جديدة ── */}
                <div className="border-t pt-4 space-y-2">
                    <Label className="text-xs text-muted-foreground">إضافة محطة جديدة</Label>
                    <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-end">
                        <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="English" className="h-8 text-sm" />
                        <Input value={newNameAr} onChange={e => setNewNameAr(e.target.value)} placeholder="العربي" className="h-8 text-sm" />
                        <input type="color" value={newColour} onChange={e => setNewColour(e.target.value)} className="h-8 w-10 rounded border" />
                        <Button size="sm" onClick={handleCreate} disabled={isPending || !newName.trim()} className="h-8 gap-1">
                            {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                            إضافة
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
