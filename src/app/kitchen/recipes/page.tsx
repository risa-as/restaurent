export const metadata = {
    title: 'الوصفات',
};

export const dynamic = 'force-dynamic';

import { RecipeManager } from '@/components/inventory/recipe-manager';
import { getRecipes, getRawMaterials } from '@/lib/actions/inventory';
import { PageHeader } from '@/components/ui/page-header';

interface RecipesPageProps {
    searchParams?: { itemId?: string };
}

export default async function RecipesPage({ searchParams }: RecipesPageProps) {
    const [menuItems, rawMaterials] = await Promise.all([
        getRecipes(),
        getRawMaterials()
    ]);

    // استخدام الـ ID مباشرة من الـ URL للاختيار التلقائي للصنف
    const defaultItemId = searchParams?.itemId ?? '';

    return (
        <div className="h-full flex flex-col space-y-6">
            <PageHeader
                title="إدارة الوصفات"
                subtitle="ربط الأصناف بمكوناتها الخام لحساب التكلفة وهامش الربح"
                breadcrumbs={[
                    { label: 'المطبخ', href: '/kitchen' },
                    { label: 'الوصفات' }
                ]}
            />
            <RecipeManager
                menuItems={menuItems}
                rawMaterials={rawMaterials}
                defaultItemId={defaultItemId}
            />
        </div>
    );
}
