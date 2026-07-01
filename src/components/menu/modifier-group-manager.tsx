'use client';

import { useState, useTransition, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { assignModifierGroupToItem, removeModifierGroupFromItem } from '@/lib/actions/modifiers';
import { toast } from 'sonner';
import type { ModifierGroup, ModifierOption } from '@prisma/client';

type GroupWithOptions = ModifierGroup & { options: ModifierOption[]; sortOrder?: number };

interface ModifierGroupManagerProps {
    menuItemId: string;
    allGroups: GroupWithOptions[];
    attachedGroups: GroupWithOptions[];
    isLoading?: boolean;
}

export function ModifierGroupManager({ menuItemId, allGroups, attachedGroups, isLoading }: ModifierGroupManagerProps) {
    const [attached, setAttached] = useState<GroupWithOptions[]>(attachedGroups);
    const [expanded, setExpanded] = useState<string[]>([]);
    const [isPending, startTransition] = useTransition();

    // Sync state if props change after loading
    useEffect(() => {
        if (!isLoading) {
            setAttached(attachedGroups);
        }
    }, [attachedGroups, isLoading]);

    const availableToAdd = allGroups.filter(g => !attached.some(a => a.id === g.id));

    function toggleExpanded(id: string) {
        setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    }

    function handleAdd(group: GroupWithOptions) {
        startTransition(async () => {
            const res = await assignModifierGroupToItem(menuItemId, group.id, attached.length);
            if (res.error) {
                toast.error(res.error);
            } else {
                setAttached(prev => [...prev, group]);
                toast.success('تم إضافة الخيارات والإضافات');
            }
        });
    }

    function handleRemove(groupId: string) {
        startTransition(async () => {
            const res = await removeModifierGroupFromItem(menuItemId, groupId);
            if (res.error) {
                toast.error(res.error);
            } else {
                setAttached(prev => prev.filter(g => g.id !== groupId));
                toast.success('تم إزالة الخيارات والإضافات من هذا الصنف');
            }
        });
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
                <p className="text-sm text-muted-foreground">جاري تحميل الخيارات...</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Attached groups */}
            {attached.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">لا توجد خيارات أو إضافات مرتبطة بهذا الصنف</p>
            ) : (
                <div className="space-y-2">
                    {attached.map(group => (
                        <div key={group.id} className="border rounded-lg overflow-hidden">
                            <div
                                className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-muted/50"
                                onClick={() => toggleExpanded(group.id)}
                            >
                                <div className="flex items-center gap-2">
                                    {expanded.includes(group.id) ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    <span className="font-medium text-sm">{group.name}</span>
                                    {group.isRequired && <Badge variant="destructive" className="text-xs">إلزامي</Badge>}
                                    {group.isVariant && <Badge variant="secondary" className="text-xs">نوع</Badge>}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={(e) => { e.stopPropagation(); handleRemove(group.id); }}
                                    disabled={isPending}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                            {expanded.includes(group.id) && (
                                <div className="px-3 pb-3 pt-1 border-t bg-muted/20">
                                    {group.options.length === 0 ? (
                                        <p className="text-xs text-muted-foreground">لا توجد خيارات</p>
                                    ) : (
                                        <div className="space-y-1">
                                            {group.options.map(opt => (
                                                <div key={opt.id} className="flex items-center justify-between text-sm">
                                                    <span>{opt.name}</span>
                                                    {opt.priceAdjustment !== 0 && (
                                                        <span className={opt.priceAdjustment > 0 ? 'text-green-600' : 'text-red-600'}>
                                                            {opt.priceAdjustment > 0 ? '+' : ''}{opt.priceAdjustment.toLocaleString()}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <p className="text-xs text-muted-foreground mt-2">
                                        اختيار: {group.minSelect}–{group.maxSelect}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Add group selector */}
            {availableToAdd.length > 0 && (
                <div className="border-t pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">إضافة مجموعة خيارات/إضافات جديدة للصنف</p>
                    <div className="flex flex-wrap gap-2">
                        {availableToAdd.map(group => (
                            <Button
                                key={group.id}
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleAdd(group)}
                                disabled={isPending}
                            >
                                <Plus className="h-3 w-3 mr-1" />
                                {group.name}
                            </Button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
