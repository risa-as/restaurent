import { getSeasonalMenus } from '@/lib/actions/seasonal-menus';
import { getAdminCategories, getMenuItems } from '@/lib/actions/menu';
import { SeasonalMenuManager } from '@/components/menu/seasonal-menu-manager';
import { CalendarRange } from 'lucide-react';

export const metadata = {
    title: 'القوائم الموسمية',
};

export const dynamic = 'force-dynamic';

export default async function SeasonalMenusPage() {
    const [menus, categories, menuItems] = await Promise.all([
        getSeasonalMenus(),
        getAdminCategories(),
        getMenuItems(),
    ]);

    return (
        <div className="space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-700 shadow-md shrink-0">
                    <CalendarRange className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">القوائم الموسمية</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        قوائم رمضان والمناسبات الخاصة — تُفعَّل تلقائياً حسب التاريخ
                    </p>
                </div>
            </div>

            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <SeasonalMenuManager
                menus={menus as any}
                allCategories={categories as any}
                allMenuItems={menuItems as any}
            />
        </div>
    );
}
