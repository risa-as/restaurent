'use client';

import { useState, useTransition, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import {
    createSeasonalMenu, updateSeasonalMenu, deleteSeasonalMenu,
} from '@/lib/actions/seasonal-menus';
import {
    Plus, Trash2, Calendar, CheckCircle, XCircle,
    HelpCircle, CalendarRange, Utensils, Zap, Moon,
    Sun, PartyPopper, Loader2, Search, LayoutGrid, UtensilsCrossed,
} from 'lucide-react';
import { useDateFmt } from '@/contexts/number-locale-context';

// ── Types ────────────────────────────────────────────────────────────────────
interface Category { id: string; name: string; nameAr: string | null }
interface MenuItem  { id: string; name: string; nameAr: string | null; categoryId: string }
interface SeasonalMenu {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    isActive: boolean;
    categories: { categoryId: string; category: Category }[];
    items: { menuItemId: string; menuItem: MenuItem }[];
}
interface Props {
    menus: SeasonalMenu[];
    allCategories: Category[];
    allMenuItems: MenuItem[];
}

// ── Help Dialog ──────────────────────────────────────────────────────────────
function HelpDialog() {
    const steps = [
        { icon: Plus, color: 'text-violet-600 bg-violet-100', title: 'أنشئ قائمة موسمية', desc: 'اختر اسماً وتاريخي البداية والنهاية، ثم حدد أقساماً كاملة أو أصناف بعينها.' },
        { icon: Zap, color: 'text-amber-600 bg-amber-100', title: 'فعِّلها متى تشاء', desc: 'اضغط "تفعيل" لتنشيطها. ستُخفى القائمة الاعتيادية وتُعرض القائمة الموسمية بدلاً منها.' },
        { icon: CalendarRange, color: 'text-green-600 bg-green-100', title: 'تُعطَّل تلقائياً', desc: 'بعد انتهاء التاريخ المحدد، تتوقف القائمة تلقائياً وتعود القائمة الاعتيادية.' },
    ];
    const useCases = [
        { icon: Moon, label: 'قائمة رمضان', desc: 'فطور وسحور بأوقات محددة' },
        { icon: PartyPopper, label: 'العيد والمناسبات', desc: 'أصناف احتفالية خاصة' },
        { icon: Sun, label: 'الصيف والشتاء', desc: 'مشروبات وأطباق موسمية' },
        { icon: Utensils, label: 'غداء / عشاء', desc: 'قوائم مختلفة حسب الوقت' },
    ];
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                    <HelpCircle className="w-4 h-4" /> كيف تعمل؟
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg" dir="rtl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CalendarRange className="w-5 h-5 text-violet-600" /> القوائم الموسمية — كيف تعمل؟
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-5 pt-2">
                    <div className="space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">الخطوات</p>
                        {steps.map(({ icon: Icon, color, title, desc }, i) => (
                            <div key={i} className="flex gap-3">
                                <div className={`flex items-center justify-center w-9 h-9 rounded-xl shrink-0 ${color}`}>
                                    <Icon className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">{title}</p>
                                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <hr />
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">أمثلة</p>
                        <div className="grid grid-cols-2 gap-2">
                            {useCases.map(({ icon: Icon, label, desc }) => (
                                <div key={label} className="flex items-start gap-2 bg-muted/40 rounded-xl p-3">
                                    <Icon className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-semibold">{label}</p>
                                        <p className="text-[11px] text-muted-foreground">{desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-violet-50 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-800 rounded-xl p-3 text-xs text-violet-700 dark:text-violet-300">
                        💡 <strong>ملاحظة:</strong> يمكن أن تكون قائمة واحدة نشطة فقط في آنٍ واحد. القائمة الموسمية تتجاوز الاعتيادية تماماً.
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ menu }: { menu: SeasonalMenu }) {
    const now = new Date();
    if (menu.isActive) return (
        <Badge className="bg-green-100 text-green-700 border-green-200">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block ml-1" />نشط
        </Badge>
    );
    if (new Date(menu.endDate) < now) return <Badge variant="secondary" className="opacity-60">منتهي</Badge>;
    return <Badge variant="outline" className="text-muted-foreground">معطّل</Badge>;
}

// ── Selection Tab (Categories or Items) ──────────────────────────────────────
type SelectionMode = 'categories' | 'items';

interface SelectionPanelProps {
    mode: SelectionMode;
    onModeChange: (m: SelectionMode) => void;
    allCategories: Category[];
    allMenuItems: MenuItem[];
    selectedCats: string[];
    selectedItems: string[];
    onToggleCat: (id: string) => void;
    onToggleItem: (id: string) => void;
}

function SelectionPanel({ mode, onModeChange, allCategories, allMenuItems, selectedCats, selectedItems, onToggleCat, onToggleItem }: SelectionPanelProps) {
    const [search, setSearch] = useState('');

    const filteredCategories = useMemo(
        () => allCategories.filter(c => (c.nameAr || c.name).toLowerCase().includes(search.toLowerCase())),
        [allCategories, search]
    );

    // Group items by category
    const groupedItems = useMemo(() => {
        const filtered = allMenuItems.filter(item =>
            (item.nameAr || item.name).toLowerCase().includes(search.toLowerCase())
        );
        const groups: Record<string, { cat: Category | undefined; items: MenuItem[] }> = {};
        filtered.forEach(item => {
            if (!groups[item.categoryId]) {
                groups[item.categoryId] = {
                    cat: allCategories.find(c => c.id === item.categoryId),
                    items: [],
                };
            }
            groups[item.categoryId].items.push(item);
        });
        return Object.values(groups) as Array<{ cat: Category | undefined; items: MenuItem[] }>;
    }, [allMenuItems, allCategories, search]);

    return (
        <div className="space-y-3">
            {/* Mode toggle */}
            <div className="flex rounded-xl border p-1 gap-1 bg-muted/40">
                <button
                    type="button"
                    onClick={() => onModeChange('categories')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                        mode === 'categories' ? 'bg-white dark:bg-zinc-800 shadow text-violet-700' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <LayoutGrid className="w-3.5 h-3.5" /> الأقسام
                    {selectedCats.length > 0 && (
                        <span className="bg-violet-600 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center">
                            {selectedCats.length}
                        </span>
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => onModeChange('items')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                        mode === 'items' ? 'bg-white dark:bg-zinc-800 shadow text-violet-700' : 'text-muted-foreground hover:text-foreground'
                    }`}
                >
                    <UtensilsCrossed className="w-3.5 h-3.5" /> أصناف محددة
                    {selectedItems.length > 0 && (
                        <span className="bg-violet-600 text-white rounded-full text-[10px] w-4 h-4 flex items-center justify-center">
                            {selectedItems.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={mode === 'categories' ? 'ابحث عن قسم...' : 'ابحث عن صنف...'}
                    className="pr-9 h-8 text-sm"
                />
            </div>

            {/* Categories */}
            {mode === 'categories' && (
                <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto p-1">
                    {filteredCategories.length === 0
                        ? <p className="text-xs text-muted-foreground w-full text-center py-4">لا توجد أقسام</p>
                        : filteredCategories.map(cat => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => onToggleCat(cat.id)}
                                className={`px-3 py-1.5 rounded-full text-sm border transition-all font-medium ${
                                    selectedCats.includes(cat.id)
                                        ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                                        : 'bg-muted border-border hover:border-violet-300'
                                }`}
                            >
                                {cat.nameAr || cat.name}
                            </button>
                        ))
                    }
                </div>
            )}

            {/* Items grouped by category */}
            {mode === 'items' && (
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                    {groupedItems.length === 0
                        ? <p className="text-xs text-muted-foreground text-center py-4">لا توجد أصناف</p>
                        : groupedItems.map(({ cat, items }) => (
                            <div key={cat?.id ?? 'unknown'}>
                                <p className="text-xs font-semibold text-muted-foreground mb-1.5 sticky top-0 bg-background/80 py-0.5">
                                    {cat ? (cat.nameAr || cat.name) : 'بدون قسم'}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {items.map(item => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => onToggleItem(item.id)}
                                            className={`px-2.5 py-1 rounded-lg text-xs border transition-all font-medium ${
                                                selectedItems.includes(item.id)
                                                    ? 'bg-violet-600 text-white border-violet-600'
                                                    : 'bg-muted border-border hover:border-violet-300'
                                            }`}
                                        >
                                            {item.nameAr || item.name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))
                    }
                </div>
            )}

            {/* Validation hint */}
            {selectedCats.length === 0 && selectedItems.length === 0 && (
                <p className="text-xs text-muted-foreground">اختر قسماً واحداً أو أكثر، أو أصنافاً محددة</p>
            )}
        </div>
    );
}

// ── Main Component ───────────────────────────────────────────────────────────
export function SeasonalMenuManager({ menus, allCategories, allMenuItems }: Props) {
    const dateFmt = useDateFmt();
    const { toast } = useToast();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [open, setOpen] = useState(false);

    const [name, setName] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedCats, setSelectedCats] = useState<string[]>([]);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [selMode, setSelMode] = useState<SelectionMode>('categories');

    const toggleCat  = (id: string) => setSelectedCats(prev => prev.includes(id)   ? prev.filter(c => c !== id)  : [...prev, id]);
    const toggleItem = (id: string) => setSelectedItems(prev => prev.includes(id)   ? prev.filter(i => i !== id)  : [...prev, id]);

    const isValid = name.trim() && startDate && endDate && (selectedCats.length > 0 || selectedItems.length > 0);

    const resetForm = () => {
        setName(''); setStartDate(''); setEndDate('');
        setSelectedCats([]); setSelectedItems([]); setSelMode('categories');
    };

    const handleCreate = () => {
        if (!isValid) return;
        startTransition(async () => {
            const result = await createSeasonalMenu({
                name: name.trim(),
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                categoryIds: selectedCats,
                menuItemIds: selectedItems,
            });
            if ('error' in result) {
                toast({ title: 'خطأ', description: result.error, variant: 'destructive' });
            } else {
                toast({ title: '✅ تم إنشاء القائمة الموسمية' });
                setOpen(false);
                resetForm();
                router.refresh();
            }
        });
    };

    const handleToggle = (id: string, isActive: boolean) => {
        startTransition(async () => {
            await updateSeasonalMenu(id, { isActive: !isActive });
            router.refresh();
        });
    };

    const handleDelete = (id: string) => {
        startTransition(async () => {
            await deleteSeasonalMenu(id);
            router.refresh();
        });
    };

    return (
        <div className="space-y-5" dir="rtl">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-sm text-muted-foreground">
                    {menus.length > 0 ? `${menus.length} ${menus.length === 1 ? 'قائمة مسجّلة' : 'قوائم مسجّلة'}` : 'لا توجد قوائم بعد'}
                </span>
                <div className="flex items-center gap-2">
                    <HelpDialog />
                    <Sheet open={open} onOpenChange={v => { setOpen(v); if (!v) resetForm(); }}>
                        <SheetTrigger asChild>
                            <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700">
                                <Plus className="w-4 h-4" /> قائمة جديدة
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-full sm:max-w-lg overflow-y-auto" dir="rtl">
                            <SheetHeader className="border-b pb-4 mb-6">
                                <SheetTitle className="flex items-center gap-2">
                                    <CalendarRange className="w-5 h-5 text-violet-600" />
                                    إنشاء قائمة موسمية
                                </SheetTitle>
                            </SheetHeader>
                            <div className="space-y-5">
                                {/* Name */}
                                <div className="space-y-1.5">
                                    <Label className="font-medium">اسم القائمة</Label>
                                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="مثال: قائمة رمضان 2025" />
                                </div>

                                {/* Dates */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="font-medium text-sm">تاريخ البداية</Label>
                                        <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="font-medium text-sm">تاريخ النهاية</Label>
                                        <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} />
                                    </div>
                                </div>

                                {/* Selection Panel */}
                                <div className="space-y-2">
                                    <Label className="font-medium">المحتوى المضمَّن</Label>
                                    <SelectionPanel
                                        mode={selMode}
                                        onModeChange={setSelMode}
                                        allCategories={allCategories}
                                        allMenuItems={allMenuItems}
                                        selectedCats={selectedCats}
                                        selectedItems={selectedItems}
                                        onToggleCat={toggleCat}
                                        onToggleItem={toggleItem}
                                    />
                                </div>

                                {/* Summary */}
                                {(selectedCats.length > 0 || selectedItems.length > 0) && (
                                    <div className="bg-violet-50 dark:bg-violet-950/20 rounded-xl p-3 text-xs text-violet-700 dark:text-violet-300 space-y-1">
                                        {selectedCats.length > 0 && <p>📂 {selectedCats.length} قسم مختار</p>}
                                        {selectedItems.length > 0 && <p>🍽️ {selectedItems.length} صنف مختار</p>}
                                    </div>
                                )}

                                <Button className="w-full gap-2 bg-violet-600 hover:bg-violet-700" onClick={handleCreate} disabled={isPending || !isValid}>
                                    {isPending
                                        ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</>
                                        : <><Plus className="w-4 h-4" /> إنشاء القائمة</>
                                    }
                                </Button>
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>

            {/* Empty State */}
            {menus.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-4 py-16 rounded-2xl border-2 border-dashed border-violet-200 dark:border-violet-900 bg-violet-50/30 dark:bg-violet-950/10 text-center">
                    <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-100 dark:bg-violet-900/30">
                        <Calendar className="w-7 h-7 text-violet-500" />
                    </div>
                    <div>
                        <p className="font-semibold text-violet-700 dark:text-violet-300">لا توجد قوائم موسمية بعد</p>
                        <p className="text-sm text-muted-foreground mt-1">أنشئ قائمتك الأولى لرمضان أو أي مناسبة خاصة</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-50">
                        <Plus className="w-4 h-4" /> إنشاء أول قائمة
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {menus.map(menu => {
                        const now = new Date();
                        const isExpired = new Date(menu.endDate) < now;
                        const daysLeft = !isExpired && !menu.isActive
                            ? Math.ceil((new Date(menu.endDate).getTime() - now.getTime()) / 86400000)
                            : null;

                        return (
                            <Card key={menu.id} className={`transition-all ${menu.isActive ? 'border-green-300 dark:border-green-800 shadow-sm shadow-green-100 dark:shadow-green-900/20' : ''}`}>
                                <CardContent className="pt-4 pb-4">
                                    <div className="space-y-3">
                                        {/* Header row */}
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold">{menu.name}</span>
                                                    <StatusBadge menu={menu} />
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                                                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                                                    <span dir="ltr">
                                                        {dateFmt(menu.startDate)} → {dateFmt(menu.endDate)}
                                                    </span>
                                                </div>
                                                {daysLeft !== null && (
                                                    <p className="text-xs text-amber-600 font-medium mt-0.5">{daysLeft} يوم متبقي</p>
                                                )}
                                                {isExpired && (
                                                    <p className="text-xs text-muted-foreground/60 mt-0.5">منتهي</p>
                                                )}
                                            </div>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0" onClick={() => handleDelete(menu.id)} disabled={isPending}>
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>

                                        {/* Categories */}
                                        {menu.categories.length > 0 && (
                                            <div>
                                                <p className="text-[10px] font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                                                    <LayoutGrid className="w-3 h-3" /> الأقسام
                                                </p>
                                                <div className="flex flex-wrap gap-1">
                                                    {menu.categories.map(c => (
                                                        <Badge key={c.categoryId} variant="secondary" className="text-xs rounded-full">
                                                            {c.category.nameAr || c.category.name}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Items */}
                                        {menu.items.length > 0 && (
                                            <div>
                                                <p className="text-[10px] font-semibold text-muted-foreground mb-1 flex items-center gap-1">
                                                    <UtensilsCrossed className="w-3 h-3" /> الأصناف ({menu.items.length})
                                                </p>
                                                <div className="flex flex-wrap gap-1">
                                                    {menu.items.slice(0, 5).map(i => (
                                                        <Badge key={i.menuItemId} variant="outline" className="text-xs rounded-full">
                                                            {i.menuItem.nameAr || i.menuItem.name}
                                                        </Badge>
                                                    ))}
                                                    {menu.items.length > 5 && (
                                                        <Badge variant="outline" className="text-xs rounded-full text-muted-foreground">
                                                            +{menu.items.length - 5}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Toggle button */}
                                        <Button
                                            size="sm"
                                            variant={menu.isActive ? 'outline' : 'ghost'}
                                            className={`w-full h-8 gap-1.5 text-xs ${menu.isActive
                                                ? 'border-red-200 text-red-600 hover:bg-red-50'
                                                : 'text-green-600 hover:bg-green-50 hover:text-green-700'
                                            }`}
                                            onClick={() => handleToggle(menu.id, menu.isActive)}
                                            disabled={isPending}
                                        >
                                            {menu.isActive
                                                ? <><XCircle className="w-3.5 h-3.5" /> تعطيل القائمة</>
                                                : <><CheckCircle className="w-3.5 h-3.5" /> تفعيل القائمة</>
                                            }
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
