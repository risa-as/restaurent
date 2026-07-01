'use client';

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Trash2, ChevronDown, ChevronRight, Info, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createModifierGroup, deleteModifierGroup, createModifierOption, deleteModifierOption } from '@/lib/actions/modifiers';
import { toast } from 'sonner';
import type { ModifierGroup, ModifierOption } from '@prisma/client';

type GroupWithOptions = ModifierGroup & { options: ModifierOption[] };

interface Props {
    groups: GroupWithOptions[];
    rawMaterials: { id: string; name: string; unit: string }[];
}

export function ModifierGroupsClient({ groups: initial, rawMaterials }: Props) {
    const [groups, setGroups] = useState<GroupWithOptions[]>(initial);
    const [expanded, setExpanded] = useState<string[]>([]);
    const [newGroupOpen, setNewGroupOpen] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [isPending, startTransition] = useTransition();

    // New group form state
    const [newGroupData, setNewGroupData] = useState({
        name: '', nameAr: '', nameKu: '', nameEn: '',
        isRequired: false, isVariant: false,
        minSelect: 0, maxSelect: 1, sortOrder: 0,
    });

    // New option form state per group
    const [newOptionData, setNewOptionData] = useState<Record<string, {
        name: string; nameAr: string; priceAdjustment: number; isDefault: boolean;
        rawMaterialId: string; rawMaterialQty: number;
    }>>({});

    function getOptionData(groupId: string) {
        return newOptionData[groupId] ?? { name: '', nameAr: '', priceAdjustment: 0, isDefault: false, rawMaterialId: '', rawMaterialQty: 0 };
    }

    function handleCreateGroup() {
        if (!newGroupData.name) return;
        startTransition(async () => {
            const res = await createModifierGroup(newGroupData);
            if (res.error) {
                toast.error(res.error);
            } else if (res.group) {
                setGroups(prev => [...prev, { ...res.group, options: [] } as GroupWithOptions]);
                setNewGroupData({ name: '', nameAr: '', nameKu: '', nameEn: '', isRequired: false, isVariant: false, minSelect: 0, maxSelect: 1, sortOrder: 0 });
                setNewGroupOpen(false);
                toast.success('تم إنشاء المجموعة');
            }
        });
    }

    function handleDeleteGroup(id: string) {
        startTransition(async () => {
            const res = await deleteModifierGroup(id);
            if (res.error) toast.error(res.error);
            else {
                setGroups(prev => prev.filter(g => g.id !== id));
                toast.success('تم حذف المجموعة');
            }
        });
    }

    function handleAddOption(groupId: string) {
        const data = getOptionData(groupId);
        if (!data.name) return;
        startTransition(async () => {
            const res = await createModifierOption({
                groupId,
                name: data.name,
                nameAr: data.nameAr || undefined,
                priceAdjustment: data.priceAdjustment,
                isDefault: data.isDefault,
                rawMaterialId: data.rawMaterialId || undefined,
                rawMaterialQty: data.rawMaterialQty || undefined,
            });
            if (res.error) {
                toast.error(res.error);
            } else if (res.option) {
                setGroups(prev => prev.map(g =>
                    g.id === groupId ? { ...g, options: [...g.options, res.option as ModifierOption] } : g
                ));
                setNewOptionData(prev => ({ ...prev, [groupId]: { name: '', nameAr: '', priceAdjustment: 0, isDefault: false, rawMaterialId: '', rawMaterialQty: 0 } }));
                toast.success('تم إضافة الخيار');
            }
        });
    }

    function handleDeleteOption(groupId: string, optionId: string) {
        startTransition(async () => {
            const res = await deleteModifierOption(optionId);
            if (res.error) toast.error(res.error);
            else {
                setGroups(prev => prev.map(g =>
                    g.id === groupId ? { ...g, options: g.options.filter(o => o.id !== optionId) } : g
                ));
            }
        });
    }

    return (
        <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">الخيارات والإضافات المشتركة</h1>
                    <p className="text-muted-foreground text-sm">أنشئ خيارات التخصيص والإضافات وأرفقها بأصناف القائمة</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => setShowHelp(!showHelp)} className={showHelp ? "bg-primary/10 border-primary/20 text-primary" : ""}>
                        <Info className="h-4 w-4 ml-2" /> كيف تعمل؟
                    </Button>
                    <Dialog open={newGroupOpen} onOpenChange={setNewGroupOpen}>
                        <DialogTrigger asChild>
                            <Button><Plus className="h-4 w-4 mr-1" /> مجموعة جديدة</Button>
                        </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>إنشاء مجموعة تعديل</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-3">
                            <div>
                                <Label>الاسم *</Label>
                                <Input value={newGroupData.name} onChange={e => setNewGroupData(p => ({ ...p, name: e.target.value }))} placeholder="مثال: حجم الحصة" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label>الحد الأدنى</Label>
                                    <Input type="number" min={0} value={newGroupData.minSelect} onChange={e => setNewGroupData(p => ({ ...p, minSelect: Number(e.target.value) }))} />
                                </div>
                                <div>
                                    <Label>الحد الأقصى</Label>
                                    <Input type="number" min={1} value={newGroupData.maxSelect} onChange={e => setNewGroupData(p => ({ ...p, maxSelect: Number(e.target.value) }))} />
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-2">
                                    <Switch checked={newGroupData.isRequired} onCheckedChange={v => setNewGroupData(p => ({ ...p, isRequired: v }))} />
                                    <Label>إلزامي</Label>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Switch checked={newGroupData.isVariant} onCheckedChange={v => setNewGroupData(p => ({ ...p, isVariant: v }))} />
                                    <Label>نوع (variant)</Label>
                                </div>
                            </div>
                            <Button onClick={handleCreateGroup} disabled={isPending || !newGroupData.name} className="w-full">
                                إنشاء
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
                </div>
            </div>

            {showHelp && (
                <Card className="bg-primary/5 border-primary/20 animate-in fade-in slide-in-from-top-2 duration-300">
                    <CardContent className="pt-6 text-sm space-y-4">
                        <div className="flex justify-between items-start">
                            <h3 className="font-bold text-base text-primary flex items-center gap-2">
                                <Info className="h-5 w-5" />
                                دليل الاستخدام السريع للخيارات والإضافات
                            </h3>
                            <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-primary/10" onClick={() => setShowHelp(false)}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <h4 className="font-semibold text-foreground">ما هي الخيارات والإضافات؟</h4>
                                <p className="text-muted-foreground leading-relaxed">
                                    هي طريقة ذكية لإدارة تخصيصات الأصناف بشكل مركزي. تفيدك في إنشاء خيارات (مثل الإضافات أو الأحجام) وربطها بعشرات الأصناف بضغطة زر، بدلاً من تكرار إدخالها لكل صنف على حدة.
                                </p>
                            </div>
                            <div className="space-y-2 bg-background/50 p-3 rounded-lg border border-primary/5">
                                <h4 className="font-semibold text-foreground mb-2">معاني الحقول:</h4>
                                <ul className="text-muted-foreground leading-relaxed space-y-2 text-sm">
                                    <li className="flex items-start gap-2">
                                        <span className="font-bold text-primary shrink-0">الحد الأدنى:</span>
                                        <span>أقل عدد يجب اختياره (مثلاً <code className="bg-muted px-1 rounded">1</code> يعني إجبار الزبون على الاختيار).</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="font-bold text-primary shrink-0">الحد الأقصى:</span>
                                        <span>أعلى عدد مسموح للزبون باختياره معاً.</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="font-bold text-primary shrink-0">إلزامي:</span>
                                        <span>اختصار سريع يجعل المجموعة إجبارية (الحد الأدنى = 1).</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="font-bold text-primary shrink-0">نوع (variant):</span>
                                        <span>يُعلم النظام أن هذه الخيارات تمثل (أحجام أساسية) للصنف وليست إضافات جانبية، مما يضمن دقة التقارير.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="bg-background/80 rounded-lg p-4 border border-primary/10 space-y-3 shadow-sm">
                            <h4 className="font-semibold text-foreground">الخطوات العملية:</h4>
                            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                                <li><strong>إنشاء مجموعة:</strong> اضغط على "مجموعة جديدة" وسمّها (مثال: إضافات البيتزا).</li>
                                <li><strong>تحديد القواعد:</strong> اضبط "الحد الأدنى" (مثلاً 1 للإلزام بالاختيار)، و"الحد الأقصى" لتقييد عدد الإضافات المسموحة.</li>
                                <li><strong>إضافة الخيارات:</strong> اضغط على المجموعة لتتوسع، ثم أضف الخيارات بداخلها (مثال: جبنة بـ 1000، هلابينو بـ 500).</li>
                                <li><strong>الربط بالأصناف:</strong> اذهب لصفحة "إدارة القائمة"، عدّل أي صنف (مثلاً بيتزا مارغريتا)، ومن تبويب "التعديلات"، فعّل المجموعة المطلوبة.</li>
                            </ol>
                        </div>
                    </CardContent>
                </Card>
            )}

            {groups.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                        لا توجد خيارات أو إضافات بعد. أنشئ مجموعة لتبدأ.
                    </CardContent>
                </Card>
            )}

            {groups.map(group => {
                const isExpanded = expanded.includes(group.id);
                const optData = getOptionData(group.id);
                return (
                    <Card key={group.id}>
                        <CardHeader
                            className="cursor-pointer pb-3"
                            onClick={() => setExpanded(prev => prev.includes(group.id) ? prev.filter(x => x !== group.id) : [...prev, group.id])}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                    <CardTitle className="text-base">{group.name}</CardTitle>
                                    {group.isRequired && <Badge variant="destructive" className="text-xs">إلزامي</Badge>}
                                    {group.isVariant && <Badge variant="secondary" className="text-xs">نوع</Badge>}
                                    <span className="text-xs text-muted-foreground">
                                        ({group.options.length} خيار · {group.minSelect}–{group.maxSelect})
                                    </span>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive"
                                    onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                                    disabled={isPending}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </CardHeader>
                        {isExpanded && (
                            <CardContent className="pt-0 space-y-3">
                                {/* Options list */}
                                {group.options.map(opt => (
                                    <div key={opt.id} className="flex items-center justify-between bg-muted/30 rounded px-3 py-2 text-sm">
                                        <div className="flex items-center gap-2">
                                            <span>{opt.name}</span>
                                            {opt.nameAr && <span className="text-muted-foreground">({opt.nameAr})</span>}
                                            {opt.isDefault && <Badge variant="outline" className="text-xs">افتراضي</Badge>}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {opt.priceAdjustment !== 0 && (
                                                <span className={opt.priceAdjustment > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                                                    {opt.priceAdjustment > 0 ? '+' : ''}{opt.priceAdjustment.toLocaleString()}
                                                </span>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-destructive"
                                                onClick={() => handleDeleteOption(group.id, opt.id)}
                                                disabled={isPending}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}

                                {/* Add option inline form */}
                                <div className="border rounded-lg p-3 bg-muted/10 space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground">إضافة خيار جديد</p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <Input
                                            placeholder="الاسم"
                                            value={optData.name}
                                            onChange={e => setNewOptionData(p => ({ ...p, [group.id]: { ...getOptionData(group.id), name: e.target.value } }))}
                                            className="h-8 text-sm col-span-1"
                                        />
                                        <Input
                                            placeholder="الاسم العربي"
                                            value={optData.nameAr}
                                            onChange={e => setNewOptionData(p => ({ ...p, [group.id]: { ...getOptionData(group.id), nameAr: e.target.value } }))}
                                            className="h-8 text-sm col-span-1"
                                            dir="rtl"
                                        />
                                        <Input
                                            type="number"
                                            placeholder="تعديل السعر"
                                            value={optData.priceAdjustment || ''}
                                            onChange={e => setNewOptionData(p => ({ ...p, [group.id]: { ...getOptionData(group.id), priceAdjustment: Number(e.target.value) } }))}
                                            className="h-8 text-sm col-span-1"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        <Select
                                            value={optData.rawMaterialId || undefined}
                                            onValueChange={(val) => setNewOptionData(p => ({ ...p, [group.id]: { ...getOptionData(group.id), rawMaterialId: val === 'none' ? '' : val } }))}
                                        >
                                            <SelectTrigger className="h-8 text-xs bg-background">
                                                <SelectValue placeholder="ربط بمادة خام من المخزن لحساب التكلفة (اختياري)" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">بدون ربط</SelectItem>
                                                {rawMaterials.map(rm => (
                                                    <SelectItem key={rm.id} value={rm.id}>{rm.name} ({rm.unit})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        {optData.rawMaterialId && (
                                            <Input
                                                type="number"
                                                step="0.001"
                                                placeholder={`الكمية المسحوبة (${rawMaterials.find(r => r.id === optData.rawMaterialId)?.unit || ''})`}
                                                value={optData.rawMaterialQty || ''}
                                                onChange={e => setNewOptionData(p => ({ ...p, [group.id]: { ...getOptionData(group.id), rawMaterialQty: Number(e.target.value) } }))}
                                                className="h-8 text-sm"
                                            />
                                        )}
                                    </div>
                                    <Button size="sm" className="h-7 text-xs w-fit mt-2" onClick={() => handleAddOption(group.id)} disabled={isPending || !optData.name}>
                                        <Plus className="h-3 w-3 mr-1" /> إضافة
                                    </Button>
                                </div>
                            </CardContent>
                        )}
                    </Card>
                );
            })}
        </div>
    );
}
