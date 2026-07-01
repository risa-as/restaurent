'use client';

import { useState, useTransition } from 'react';
import { Offer, MenuItem, Branch } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { toggleOfferStatus, deleteOffer } from '@/lib/actions/menu';
import { OfferForm } from './offer-form';
import { Edit2, Trash2, CalendarDays, Tag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OfferWithItems extends Offer {
    menuItems: MenuItem[];
}

interface OfferListProps {
    offers: OfferWithItems[];
    menuItems?: MenuItem[];
    categories?: { id: string; name: string }[];
    branches?: Branch[];
    defaultBranchId?: string | null;
}

export function OfferList({ offers, menuItems = [], categories = [], branches, defaultBranchId }: OfferListProps) {
    const [editingOffer, setEditingOffer] = useState<OfferWithItems | null>(null);
    const [isPending, startTransition] = useTransition();
    const { toast } = useToast();

    const handleToggle = async (id: string, val: boolean) => {
        await toggleOfferStatus(id, val);
    };

    const handleDelete = (id: string) => {
        startTransition(async () => {
            const res = await deleteOffer(id);
            if (res.error) {
                toast({ title: 'خطأ', description: res.error, variant: 'destructive' });
            } else {
                toast({ title: '✅ تم حذف العرض' });
            }
        });
    };

    return (
        <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" dir="rtl">
                {offers.map((offer) => (
                    <Card
                        key={offer.id}
                        className={`transition-opacity ${!offer.isActive ? 'opacity-60' : ''}`}
                    >
                        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                            <div className="flex-1 min-w-0">
                                <CardTitle className="text-base font-bold truncate">{offer.name}</CardTitle>
                                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                                    <CalendarDays className="w-3 h-3" />
                                    {format(new Date(offer.startDate), 'dd/MM')} ← {format(new Date(offer.endDate), 'dd/MM/yyyy')}
                                </div>
                            </div>
                            <Switch
                                dir="ltr"
                                checked={offer.isActive}
                                onCheckedChange={(val) => handleToggle(offer.id, val)}
                                className="shrink-0 mt-1 ms-3"
                            />
                        </CardHeader>

                        <CardContent className="space-y-3">
                            {/* نسبة الخصم */}
                            <div className="flex items-center gap-2">
                                <Tag className="w-4 h-4 text-primary" />
                                <span className="text-2xl font-black text-primary">{offer.discountPct}%</span>
                                <span className="text-sm text-muted-foreground">خصم</span>
                            </div>

                            {/* الأصناف المشمولة */}
                            <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                                {offer.menuItems.length === 0 ? (
                                    <span className="text-xs text-muted-foreground italic">لا أصناف مرتبطة</span>
                                ) : (
                                    offer.menuItems.map(item => (
                                        <Badge key={item.id} variant="secondary" className="text-xs">
                                            {item.name}
                                        </Badge>
                                    ))
                                )}
                            </div>

                            {/* أزرار التعديل والحذف */}
                            <div className="flex items-center gap-2 pt-1 border-t border-border/40">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 h-7 text-xs gap-1"
                                    onClick={() => setEditingOffer(offer)}
                                >
                                    <Edit2 className="w-3 h-3" />
                                    تعديل
                                </Button>

                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 h-7 text-xs gap-1 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                                            disabled={isPending}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                            حذف
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent dir="rtl">
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>حذف العرض</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                هل أنت متأكد من حذف عرض <strong>{offer.name}</strong>؟
                                                لا يمكن التراجع عن هذا الإجراء.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={() => handleDelete(offer.id)}
                                                className="bg-destructive hover:bg-destructive/90"
                                            >
                                                حذف
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {offers.length === 0 && (
                    <div className="col-span-full text-center py-10 text-muted-foreground">
                        لا توجد عروض حالياً. أنشئ عرضاً للبدء.
                    </div>
                )}
            </div>

            {/* Sheet تعديل العرض */}
            <Sheet open={!!editingOffer} onOpenChange={(open) => !open && setEditingOffer(null)}>
                <SheetContent className="sm:max-w-md overflow-y-auto" dir="rtl">
                    <SheetHeader>
                        <SheetTitle>تعديل العرض — {editingOffer?.name}</SheetTitle>
                    </SheetHeader>
                    <div className="mt-4">
                        {editingOffer && (
                            <OfferForm
                                menuItems={menuItems}
                                categories={categories}
                                branches={branches}
                                defaultBranchId={defaultBranchId}
                                initialData={editingOffer}
                                onSuccess={() => setEditingOffer(null)}
                            />
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
