import { RecipeManager } from '@/components/inventory/recipe-manager';
import { getRecipes, getRawMaterials } from '@/lib/actions/inventory';

export default async function RecipesPage() {
    const [menuItems, rawMaterials] = await Promise.all([
        getRecipes(),
        getRawMaterials()
    ]);

    return (
        <div className="h-full flex flex-col space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-black text-gray-800">إدارة الوصفات</h1>
            </div>
            <RecipeManager menuItems={menuItems} rawMaterials={rawMaterials} />
        </div>
    );
}
