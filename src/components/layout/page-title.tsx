'use client';
import { usePathname } from 'next/navigation';

const PAGE_TITLES: Record<string, string> = {
    '/dashboard': 'لوحة التحكم',
    '/dashboard/tables': 'إدارة الطاولات',
    '/dashboard/menu/offers': 'العروض الخاصة',
    '/dashboard/menu/analysis': 'تحليل القائمة',
    '/dashboard/menu': 'قائمة الطعام',
    '/dashboard/reservations': 'الحجوزات',
    '/dashboard/finance': 'التقارير المالية',
    '/dashboard/admin': 'إدارة الموظفين',
    '/dashboard/waiter': 'طلبات النادل',
    '/cashier': 'نظام الكاشير',
    '/captain/orders': 'طلبات الكابتن',
    '/captain/tables': 'طاولات الكابتن',
    '/captain/history': 'سجل الطلبات',
    '/captain': 'لوحة الكابتن',
    '/kitchen/recipes': 'الوصفات',
    '/kitchen': 'بوابة المطبخ',
    '/delivery': 'نظام التوصيل',
    '/inventory/stock': 'المخزون',
    '/inventory': 'إدارة المخزون',
    '/accountant/cashier': 'تسوية الكاشير',
    '/accountant/delivery': 'تسوية التوصيل',
    '/accountant/reports': 'التقارير',
    '/accountant': 'لوحة المحاسب',
    '/waiter': 'لوحة النادل',
};

export function PageTitle() {
    const pathname = usePathname();
    const title = Object.entries(PAGE_TITLES)
        .filter(([path]) => pathname.startsWith(path))
        .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? 'لوحة التحكم';

    return <h2 className="font-black text-lg text-foreground leading-none">{title}</h2>;
}
