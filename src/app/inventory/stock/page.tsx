import { StockList } from '@/components/inventory/stock-list';
import { getRawMaterials } from '@/lib/actions/inventory';
import { getBranches, getSelectedBranchId } from '@/lib/actions/branches';
import { getExpiringBatchesSummary } from '@/lib/actions/purchase-orders';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Package, PackageX, AlertTriangle, TrendingUp, Warehouse } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata = {
    title: 'إدارة المخزون',
};

export const dynamic = 'force-dynamic';

function fmt(n: number) {
    return n.toLocaleString('ar-IQ', { maximumFractionDigits: 0 });
}

export default async function StockPage() {
    const session = await auth();
    const tenantId = (session?.user as any)?.tenantId as string | undefined;

    const [materials, branches, selectedBranchId, expiringAlert] = await Promise.all([
        getRawMaterials(),
        (async () => {
            if (!tenantId) return [];
            const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { multiBranchEnabled: true } });
            return tenant?.multiBranchEnabled ? getBranches() : [];
        })(),
        getSelectedBranchId(),
        getExpiringBatchesSummary(7),
    ]);

    const totalMaterials = materials.length;
    const outOfStock  = materials.filter(m => m.currentStock <= 0).length;
    const lowStock    = materials.filter(m => m.currentStock > 0 && m.currentStock <= m.minStockLevel).length;
    const totalValue  = materials.reduce((s, m) => s + m.currentStock * m.costPerUnit, 0);

    return (
        <div className="space-y-6" dir="rtl">

            {/* ── Header ── */}
            <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                    <Warehouse className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">إدارة المخزون</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">متابعة المواد الخام وإدارة الرصيد والدفعات</p>
                </div>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">إجمالي المواد</CardTitle>
                        <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{totalMaterials}</div>
                        <p className="text-xs text-muted-foreground mt-1">مادة خام مسجلة</p>
                    </CardContent>
                </Card>

                <Card className="border-primary/30 bg-primary/5">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">قيمة المخزون</CardTitle>
                        <TrendingUp className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-primary tabular-nums">{fmt(totalValue)}</div>
                        <p className="text-xs text-muted-foreground mt-1">دينار عراقي</p>
                    </CardContent>
                </Card>

                <Card className="border-amber-200 dark:border-amber-800">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">مخزون منخفض</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-amber-600">{lowStock}</div>
                        <p className="text-xs text-muted-foreground mt-1">تحت حد التنبيه</p>
                    </CardContent>
                </Card>

                <Card className="border-red-200 dark:border-red-800">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium text-muted-foreground">نفد المخزون</CardTitle>
                        <PackageX className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-600">{outOfStock}</div>
                        <p className="text-xs text-muted-foreground mt-1">مادة نفدت تماماً</p>
                    </CardContent>
                </Card>
            </div>

            {/* ── Stock List ── */}
            <StockList
                materials={materials}
                branches={branches}
                defaultBranchId={selectedBranchId}
                expiringAlert={expiringAlert}
            />
        </div>
    );
}
