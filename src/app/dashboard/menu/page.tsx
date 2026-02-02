import { getMenuItems, getCategories } from '@/lib/actions/menu';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { MenuItemActions } from '@/components/menu/menu-item-actions';
import { Badge } from '@/components/ui/badge';
import { Search } from 'lucide-react';
import { AddCategoryDialog } from '@/components/menu/add-category-dialog';
import { AddItemSheet } from '@/components/menu/add-item-sheet';

export default async function MenuPage({
    searchParams,
}: {
    searchParams?: { query?: string };
}) {
    const query = searchParams?.query || '';
    const menuItems = await getMenuItems(query);
    const categories = await getCategories();

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">إدارة القائمة</h1>
                <div className="flex gap-2">
                    <AddCategoryDialog />
                    <AddItemSheet categories={categories} />
                </div>
            </div>

            <div className="flex items-center gap-2">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <form>
                        <Input
                            name="query"
                            placeholder="بحث في القائمة..."
                            defaultValue={query}
                            className="pl-8"
                        />
                    </form>
                </div>
            </div>

            <div className="border rounded-md">
                <Table className="table-fixed">
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[80px] text-right">الصورة</TableHead>
                            <TableHead className="w-[20%] text-right">الاسم</TableHead>
                            <TableHead className="w-[15%] text-right">القسم</TableHead>
                            <TableHead className="w-[15%] text-right">السعر</TableHead>
                            <TableHead className="w-[40%] text-right">المكونات</TableHead>
                            <TableHead className="w-[100px] text-left">الإجراءات</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {menuItems.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                    لا توجد عناصر.
                                </TableCell>
                            </TableRow>
                        ) : (
                            menuItems.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <div className="h-10 w-10 bg-gray-100 rounded-md overflow-hidden">
                                            <img
                                                src={item.image || "https://placehold.co/100x100/e2e8f0/64748b?text=img"}
                                                alt={item.name}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium align-middle">
                                        {item.name}
                                        {!item.isAvailable && <Badge variant="destructive" className="mr-2">غير متوفر</Badge>}
                                    </TableCell>
                                    <TableCell className="align-middle">
                                        <Badge variant="outline">{item.category.name}</Badge>
                                    </TableCell>
                                    <TableCell className="align-middle">{item.price.toFixed(0)} د.ع</TableCell>
                                    <TableCell className="text-sm text-gray-500 truncate align-middle" title={item.recipe.map(r => r.material.name).join(', ')}>
                                        {item.recipe.map(r => r.material.name).join(', ')}
                                    </TableCell>
                                    <TableCell className="text-left align-middle">
                                        <MenuItemActions item={item} categories={categories} />
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
