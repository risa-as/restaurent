'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { getItemModifiers } from '@/lib/actions/modifiers';
import type { ModifierGroup, ModifierOption } from '@prisma/client';

type GroupWithOptions = ModifierGroup & { options: ModifierOption[] };

export interface SelectedModifier {
    modifierOptionId: string;
    name: string;
    priceAdjustment: number;
    groupId: string;
}

interface ModifierPickerModalProps {
    open: boolean;
    menuItemId: string;
    menuItemName: string;
    onConfirm: (modifiers: SelectedModifier[]) => void;
    onCancel: () => void;
}

export function ModifierPickerModal({ open, menuItemId, menuItemName, onConfirm, onCancel }: ModifierPickerModalProps) {
    const [groups, setGroups] = useState<GroupWithOptions[]>([]);
    const [selected, setSelected] = useState<Record<string, string[]>>({}); // groupId -> selectedOptionIds
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!open || !menuItemId) return;
        let cancelled = false;
        setLoading(true);
        setSelected({});
        setGroups([]);
        getItemModifiers(menuItemId).then(g => {
            if (cancelled) return;
            if (g.length === 0) {
                onConfirm([]);
                return;
            }
            setGroups(g as GroupWithOptions[]);
            const defaults: Record<string, string[]> = {};
            for (const group of g) {
                const defaultOpts = (group as GroupWithOptions).options.filter(o => o.isDefault).map(o => o.id);
                if (defaultOpts.length > 0) defaults[group.id] = defaultOpts;
            }
            setSelected(defaults);
            setLoading(false);
        });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, menuItemId]);

    function toggleOption(groupId: string, optionId: string, isSingleSelect: boolean) {
        setSelected(prev => {
            const current = prev[groupId] ?? [];
            if (isSingleSelect) {
                return { ...prev, [groupId]: current[0] === optionId ? [] : [optionId] };
            }
            const group = groups.find(g => g.id === groupId);
            if (current.includes(optionId)) {
                return { ...prev, [groupId]: current.filter(id => id !== optionId) };
            }
            if (group && current.length >= group.maxSelect) return prev;
            return { ...prev, [groupId]: [...current, optionId] };
        });
    }

    function validate(): string | null {
        for (const group of groups) {
            const sel = selected[group.id] ?? [];
            if (group.isRequired && sel.length < (group.minSelect || 1)) {
                return `يجب اختيار خيار من "${group.name}"`;
            }
            if (sel.length > group.maxSelect) {
                return `يمكن اختيار ${group.maxSelect} خيارات كحد أقصى من "${group.name}"`;
            }
        }
        return null;
    }

    function handleConfirm() {
        const error = validate();
        if (error) {
            alert(error);
            return;
        }
        const result: SelectedModifier[] = [];
        for (const group of groups) {
            const selIds = selected[group.id] ?? [];
            for (const optId of selIds) {
                const opt = group.options.find(o => o.id === optId);
                if (opt) {
                    result.push({
                        modifierOptionId: opt.id,
                        name: opt.name,
                        priceAdjustment: opt.priceAdjustment,
                        groupId: group.id,
                    });
                }
            }
        }
        onConfirm(result);
    }

    if (groups.length === 0 && !loading) {
        // No modifiers — auto-confirm immediately
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
            <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>خيارات: {menuItemName}</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="py-8 text-center text-muted-foreground text-sm">جاري التحميل...</div>
                ) : (
                    <div className="space-y-5 py-2">
                        {groups.map(group => {
                            const isSingle = group.maxSelect === 1;
                            const selIds = selected[group.id] ?? [];
                            return (
                                <div key={group.id} className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-medium text-sm">{group.nameAr || group.name}</h4>
                                        {group.isRequired && <Badge variant="destructive" className="text-xs">إلزامي</Badge>}
                                        {!isSingle && (
                                            <span className="text-xs text-muted-foreground">
                                                (اختر حتى {group.maxSelect})
                                            </span>
                                        )}
                                    </div>
                                    {isSingle ? (
                                        <RadioGroup
                                            value={selIds[0] ?? ''}
                                            onValueChange={(val) => toggleOption(group.id, val, true)}
                                        >
                                            {group.options.map(opt => (
                                                <div key={opt.id} className="flex items-center justify-between px-3 py-2 rounded-lg border hover:bg-muted/50 cursor-pointer">
                                                    <div className="flex items-center gap-2">
                                                        <RadioGroupItem value={opt.id} id={opt.id} />
                                                        <Label htmlFor={opt.id} className="cursor-pointer text-sm">
                                                            {opt.nameAr || opt.name}
                                                        </Label>
                                                    </div>
                                                    {opt.priceAdjustment !== 0 && (
                                                        <span className={`text-sm font-medium ${opt.priceAdjustment > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {opt.priceAdjustment > 0 ? '+' : ''}{opt.priceAdjustment.toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </RadioGroup>
                                    ) : (
                                        <div className="space-y-1">
                                            {group.options.map(opt => {
                                                const checked = selIds.includes(opt.id);
                                                return (
                                                    <div
                                                        key={opt.id}
                                                        className={`flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer ${checked ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}`}
                                                        onClick={() => toggleOption(group.id, opt.id, false)}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <Checkbox checked={checked} tabIndex={-1} className="pointer-events-none" />
                                                            <span className="text-sm">{opt.nameAr || opt.name}</span>
                                                        </div>
                                                        {opt.priceAdjustment !== 0 && (
                                                            <span className={`text-sm font-medium ${opt.priceAdjustment > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                {opt.priceAdjustment > 0 ? '+' : ''}{opt.priceAdjustment.toLocaleString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onCancel}>إلغاء</Button>
                    <Button onClick={handleConfirm} disabled={loading}>تأكيد الإضافة</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
