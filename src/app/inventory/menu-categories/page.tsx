import { getCategories } from '@/lib/actions/menu';
import { AddCategoryDialog } from '@/components/menu/add-category-dialog';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UtensilsCrossed } from 'lucide-react';

export default async function FoodCategoriesPage() {
    const categories = await getCategories();

    return (
        <div className="h-full flex flex-col space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <UtensilsCrossed className="w-6 h-6 text-primary" />
                        أقسام الطعام (القائمة)
                    </CardTitle>
                    <AddCategoryDialog />
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {categories.map((category) => (
                            <div key={category.id} className="p-4 border rounded-lg flex items-center justify-between bg-card text-card-foreground shadow-sm">
                                <div>
                                    <h3 className="font-bold">{category.name}</h3>
                                    <Badge variant="secondary" className="mt-1">
                                        {category.type === 'EASTERN' ? 'شرقي' :
                                            category.type === 'WESTERN' ? 'غربي' :
                                                category.type === 'BEVERAGE' ? 'مشروبات' :
                                                    category.type === 'DESSERT' ? 'حلويات' : category.type}
                                    </Badge>
                                </div>
                            </div>
                        ))}
                        {categories.length === 0 && (
                            <p className="text-muted-foreground col-span-full text-center py-8">
                                لا توجد أقسام حالياً.
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
