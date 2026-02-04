import { getCategories } from '@/lib/actions/menu';
import { CategoryList } from '@/components/inventory/category-list';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { UtensilsCrossed } from 'lucide-react';

export default async function FoodCategoriesPage() {
    const categories = await getCategories();

    return (
        <div className="h-full flex flex-col space-y-6">
            <CategoryList categories={categories} />
        </div>
    );
}