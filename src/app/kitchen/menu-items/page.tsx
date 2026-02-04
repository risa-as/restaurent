import { prisma } from '@/lib/prisma';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChefHat, Utensils } from 'lucide-react';
import Image from 'next/image';
import { AddMenuItemDialog } from '@/components/menu/add-menu-item-dialog';
import { MenuItemActions } from '@/components/menu/menu-item-actions';

export default async function KitchenMenuItemsPage() {
    const categories = await prisma.category.findMany({
        include: {
            items: {
                orderBy: { name: 'asc' },
                include: {
                    recipe: {
                        include: {
                            material: true
                        }
                    }
                }
            }
        },
        orderBy: { name: 'asc' }
    });

    return (
        <div className="h-full flex flex-col space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-full">
                        <Utensils className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">أصناف الطعام</h2>
                        <p className="text-muted-foreground">قائمة بجميع المأكولات والمشروبات المتوفرة</p>
                    </div>
                </div>
                <AddMenuItemDialog categories={categories} />
            </div>

            <div className="grid grid-cols-1 gap-8 pb-10">
                {categories.map((category) => (
                    <div key={category.id} className="space-y-4">
                        <div className="flex items-center gap-2 border-b pb-2">
                            <h3 className="text-xl font-bold text-gray-800">{category.name}</h3>
                            <Badge variant="outline">
                                {category.items.length} صنف
                            </Badge>
                        </div>

                        {category.items.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                {category.items.map((item) => (
                                    <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow group relative">
                                        <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur rounded-lg shadow-sm">
                                            <MenuItemActions item={item} categories={categories} />
                                        </div>
                                        <div className="aspect-video relative bg-muted flex items-center justify-center">
                                            {item.image ? (
                                                <Image
                                                    src={item.image}
                                                    alt={item.name}
                                                    fill
                                                    className="object-cover"
                                                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                                />
                                            ) : (
                                                <ChefHat className="w-10 h-10 text-muted-foreground/40" />
                                            )}
                                        </div>
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start gap-2 mb-2">
                                                <h4 className="font-bold line-clamp-1" title={item.name}>{item.name}</h4>
                                                <Badge variant={item.isAvailable ? "secondary" : "destructive"} className="text-[10px] px-1.5 h-5">
                                                    {item.isAvailable ? 'متوفر' : 'غير متوفر'}
                                                </Badge>
                                            </div>
                                            {item.description && (
                                                <p className="text-xs text-muted-foreground line-clamp-2 h-8 mb-2">
                                                    {item.description}
                                                </p>
                                            )}
                                            <div className="flex justify-between items-center mt-2">
                                                <span className="font-bold text-primary">
                                                    {item.price.toLocaleString()} د.ع
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed">
                                <p className="text-muted-foreground">لا توجد أصناف في هذا القسم</p>
                            </div>
                        )}
                    </div>
                ))}

                {categories.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground text-lg">لا توجد أقسام مسجلة في النظام</p>
                    </div>
                )}
            </div>
        </div>
    );
}
