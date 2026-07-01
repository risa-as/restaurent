import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import TenantsClientPage from './tenants-client';

export const metadata = {
    title: 'المطاعم',
};

export const dynamic = 'force-dynamic';

export default async function SuperAdminTenantsPage() {
    const tenants = await prisma.tenant.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            users: {
                where: { role: 'ADMIN', isDeleted: false },
                take: 1
            },
            _count: {
                select: { orders: true, menuItems: true, users: true }
            }
        }
    });

    const tenantData = tenants.map(tenant => ({
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        isActive: tenant.isActive,
        plan: tenant.plan,
        subscriptionStatus: tenant.subscriptionStatus,
        serviceMode: tenant.serviceMode,
        createdAt: tenant.createdAt,
        trialEndsAt: tenant.trialEndsAt,
        currentPeriodEnd: tenant.currentPeriodEnd,
        adminName: tenant.users[0]?.name || 'غير متوفر',
        adminEmail: tenant.users[0]?.email || 'غير متوفر',
        ordersCount: tenant._count.orders,
        menuItemsCount: tenant._count.menuItems,
        usersCount: tenant._count.users,
        aiDailyLimit: tenant.aiDailyLimit,
    }));

    const stats = {
        total: tenants.length,
        active: tenants.filter(t => t.isActive && t.subscriptionStatus === 'ACTIVE').length,
        trial: tenants.filter(t => t.subscriptionStatus === 'TRIAL').length,
        suspended: tenants.filter(t => !t.isActive).length,
        withAiLimit: tenants.filter(t => t.aiDailyLimit > 0).length,
    };

    return (
        <div className="space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold">إدارة المطاعم</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        {stats.total} مطعم مسجل في المنصة
                    </p>
                </div>
                <Button asChild>
                    <Link href="/superadmin/tenants/new" className="gap-2">
                        <Plus className="w-4 h-4" />
                        إنشاء مطعم جديد
                    </Link>
                </Button>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                    { label: 'الإجمالي', value: stats.total, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', dot: 'bg-slate-400' },
                    { label: 'نشط', value: stats.active, color: 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400', dot: 'bg-green-500' },
                    { label: 'تجريبي', value: stats.trial, color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400', dot: 'bg-blue-500' },
                    { label: 'موقوف', value: stats.suspended, color: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400', dot: 'bg-red-400' },
                    { label: 'بحد ذكي', value: stats.withAiLimit, color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400', dot: 'bg-amber-500' },
                ].map(({ label, value, color, dot }) => (
                    <div key={label} className={`rounded-xl px-4 py-3 flex items-center gap-3 ${color}`}>
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot}`} />
                        <div>
                            <p className="text-2xl font-bold leading-none">{value}</p>
                            <p className="text-xs mt-0.5 opacity-80">{label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <TenantsClientPage tenants={tenantData} />
        </div>
    );
}
