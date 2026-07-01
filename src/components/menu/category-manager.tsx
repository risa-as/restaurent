"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Branch } from "@prisma/client";
import { deleteCategory } from "@/lib/actions/menu";
import { assignCategoryToStation } from "@/lib/actions/kitchen-stations";
import { CategoryForm } from "@/components/menu/category-form";
import { AddCategoryDialog } from "@/components/menu/add-category-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Edit2, Trash2, LayoutGrid, UtensilsCrossed, ChefHat } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

interface Category {
    id: string;
    name: string;
    branchId?: string | null;
    stationId?: string | null;
    _count?: { items: number };
    [key: string]: any;
}

interface StationOption {
    id: string;
    name: string;
}

interface CategoryManagerProps {
    categories: Category[];
    branches?: Branch[];
    defaultBranchId?: string | null;
    stations?: StationOption[];
}

export function CategoryManager({
    categories,
    branches,
    defaultBranchId,
    stations = [],
}: CategoryManagerProps) {
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();
    const router = useRouter();
    const showBranch = (branches?.length ?? 0) > 1;
    const showStations = stations.length > 0;

    const handleDelete = (id: string) => {
        startTransition(async () => {
            const res = await deleteCategory(id);
            if (res.success) {
                toast({ title: "تم حذف القسم بنجاح" });
            } else {
                toast({ title: "فشل حذف القسم", description: res.error, variant: "destructive" });
            }
        });
    };

    const handleStationChange = (categoryId: string, stationId: string) => {
        startTransition(async () => {
            const result = await assignCategoryToStation(
                categoryId,
                stationId === "__none__" ? null : stationId
            );
            if (result.error) {
                toast({ title: "خطأ", description: result.error, variant: "destructive" });
            } else {
                router.refresh();
            }
        });
    };

    const totalItems = categories.reduce((sum, c) => sum + (c._count?.items ?? 0), 0);

    return (
        <div className="rounded-[26px] border border-border/60 bg-card shadow-sm overflow-hidden" dir="rtl">
            {/* Header */}
            <div className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between border-b border-border/50">
                <div>
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <LayoutGrid className="w-5 h-5 text-primary" />
                        الأقسام
                    </h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {categories.length} قسم · {totalItems} صنف إجمالاً
                        {showStations && (
                            <span className="mr-2 text-primary/80 font-medium">
                                · وضع المحطات مفعّل
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {showStations && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground border rounded-lg px-3 py-1.5 bg-muted/30">
                            <ChefHat className="w-3 h-3 text-primary" />
                            اربط كل قسم بمحطة مطبخ من العمود على اليسار
                        </div>
                    )}
                    <AddCategoryDialog branches={branches} defaultBranchId={defaultBranchId} />
                </div>
            </div>

            {/* No stations hint */}
            {!showStations && (
                <div className="px-6 py-3 bg-amber-500/5 border-b border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <ChefHat className="w-3.5 h-3.5 shrink-0" />
                    لا توجد محطات مطبخ بعد. أنشئ محطات من{" "}
                    <Link href="/dashboard/admin" className="underline font-semibold hover:text-primary">
                        صفحة الإدارة
                    </Link>{" "}
                    ثم ارجع هنا لربط الأقسام بها.
                </div>
            )}

            {/* Table */}
            {categories.length === 0 ? (
                <div className="p-6">
                    <EmptyState icon={LayoutGrid} title="لا توجد أقسام" description="ابدأ بإضافة أقسام لتنظيم قائمتك" />
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
                        <thead>
                            <tr className="bg-muted/50 border-b border-border/60">
                                <th className="px-6 py-3.5 text-right text-xs font-semibold text-muted-foreground w-12">#</th>
                                <th className="px-4 py-3.5 text-right text-xs font-semibold text-muted-foreground">اسم القسم</th>
                                <th className="px-4 py-3.5 text-right text-xs font-semibold text-muted-foreground w-[160px]">
                                    <span className="flex items-center gap-1">
                                        <UtensilsCrossed className="w-3 h-3" />
                                        عدد الأصناف
                                    </span>
                                </th>
                                {showStations && (
                                    <th className="px-4 py-3.5 text-right text-xs font-semibold text-muted-foreground w-[190px]">
                                        <span className="flex items-center gap-1">
                                            <ChefHat className="w-3 h-3 text-primary" />
                                            محطة المطبخ
                                        </span>
                                    </th>
                                )}
                                {showBranch && (
                                    <th className="px-4 py-3.5 text-right text-xs font-semibold text-muted-foreground w-[150px]">الفرع</th>
                                )}
                                <th className="px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground w-[110px]">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map((cat, idx) => {
                                const branchName = showBranch
                                    ? (branches?.find((b) => b.id === cat.branchId)?.name ?? "كل الفروع")
                                    : null;
                                const itemCount = cat._count?.items ?? 0;
                                const linkedStation = stations.find(s => s.id === cat.stationId);

                                return (
                                    <tr
                                        key={cat.id}
                                        className={`border-b border-border/40 transition-colors hover:bg-muted/30 ${idx % 2 !== 0 ? "bg-muted/10" : ""}`}
                                    >
                                        {/* رقم الصف */}
                                        <td className="px-6 py-3.5">
                                            <span className="text-xs font-mono text-muted-foreground">{idx + 1}</span>
                                        </td>

                                        {/* اسم القسم */}
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-2.5">
                                                <div
                                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                                    style={{ backgroundColor: `hsl(${(idx * 47) % 360}, 65%, 55%)` }}
                                                />
                                                <span className="font-semibold text-foreground">{cat.name}</span>
                                            </div>
                                        </td>

                                        {/* عدد الأصناف */}
                                        <td className="px-4 py-3.5">
                                            {itemCount > 0 ? (
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="secondary" className="rounded-full px-2.5 py-0.5 text-xs font-semibold">
                                                        {itemCount} صنف
                                                    </Badge>
                                                    <div className="h-1.5 rounded-full bg-muted overflow-hidden w-16">
                                                        <div
                                                            className="h-full rounded-full bg-primary/60"
                                                            style={{ width: `${Math.min((itemCount / Math.max(totalItems, 1)) * 100 * 3, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground opacity-40 italic">لا أصناف</span>
                                            )}
                                        </td>

                                        {/* محطة المطبخ */}
                                        {showStations && (
                                            <td className="px-4 py-3.5">
                                                <select
                                                    className="w-full h-8 text-xs border rounded-lg bg-background px-2 disabled:opacity-50"
                                                    value={cat.stationId ?? "__none__"}
                                                    onChange={e => handleStationChange(cat.id, e.target.value)}
                                                    disabled={isPending}
                                                >
                                                    <option value="__none__">— بدون محطة —</option>
                                                    {stations.map(s => (
                                                        <option key={s.id} value={s.id}>{s.name}</option>
                                                    ))}
                                                </select>
                                                {linkedStation && (
                                                    <p className="text-[10px] text-primary mt-0.5 px-1">
                                                        ✓ {linkedStation.name}
                                                    </p>
                                                )}
                                            </td>
                                        )}

                                        {/* الفرع */}
                                        {showBranch && (
                                            <td className="px-4 py-3.5">
                                                <Badge variant="outline" className="rounded-full px-2.5 py-0.5 text-xs">
                                                    {branchName}
                                                </Badge>
                                            </td>
                                        )}

                                        {/* الإجراءات */}
                                        <td className="px-4 py-3.5 text-left">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                                                    onClick={() => setEditingCategory(cat as any)}
                                                >
                                                    <Edit2 className="h-3.5 w-3.5" />
                                                </Button>

                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                                                            disabled={isPending}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>حذف القسم</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                هل أنت متأكد من حذف قسم <strong>{cat.name}</strong>؟
                                                                {itemCount > 0 && (
                                                                    <span className="block mt-1 text-destructive font-medium">
                                                                        ⚠️ هذا القسم يحتوي على {itemCount} صنف، لا يمكن حذفه.
                                                                    </span>
                                                                )}
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => handleDelete(cat.id)}
                                                                className="bg-destructive hover:bg-destructive/90"
                                                                disabled={itemCount > 0}
                                                            >
                                                                حذف
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={!!editingCategory} onOpenChange={(open) => !open && setEditingCategory(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>تعديل القسم</DialogTitle>
                    </DialogHeader>
                    {editingCategory && (
                        <CategoryForm
                            initialData={editingCategory as any}
                            onSuccess={() => setEditingCategory(null)}
                            branches={branches}
                            defaultBranchId={defaultBranchId}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
