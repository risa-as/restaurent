import { getCategories } from '@/lib/actions/menu';
import { CategoryList } from '@/components/inventory/category-list';

export default async function FoodCategoriesPage() {
    const categories = await getCategories();

    return (
        <div className="h-full flex flex-col space-y-6">
            <CategoryList categories={categories} />
        </div>
    );
}