import { verifyRole, getCurrentUser } from '@/lib/auth-guard';
import { getTenantWithPlan, getEffectiveLimits } from '@/lib/plan-limits';
import { PlanUpgradePrompt } from '@/components/plan/plan-upgrade-prompt';
import { getBranches } from '@/lib/actions/branches';
import { BranchesManager } from '@/components/branch/branches-manager';
import { GitBranch, Crown } from 'lucide-react';

export const metadata = {
    title: 'الفروع',
};

export const dynamic = 'force-dynamic';

export default async function BranchesPage() {
    await verifyRole(['ADMIN', 'MANAGER']);
    const user = await getCurrentUser();
    if (!user?.tenantId) return <div>غير مصرح</div>;

    const tenant = await getTenantWithPlan(user.tenantId);

    // Plan gate — multi-branch is ENTERPRISE only
    if (!tenant || !getEffectiveLimits(tenant).modules.multiBranch) {
        return (
            <div className="space-y-6 max-w-4xl" dir="rtl">
                <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shrink-0">
                        <GitBranch className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">إدارة الأفرع</h1>
                        <p className="text-muted-foreground mt-1 text-sm">إدارة أفرع مطعمك المتعددة</p>
                    </div>
                </div>
                <PlanUpgradePrompt
                    feature="الأفرع المتعددة"
                    requiredPlan="ENTERPRISE"
                    description="ميزة الأفرع المتعددة متاحة حصراً في خطة المؤسسات. قم بترقية اشتراكك للاستفادة من إدارة أفرع متعددة مستقلة لكل منها مخزون وتقارير وموظفون."
                />
            </div>
        );
    }

    if (!tenant.multiBranchEnabled) {
        return (
            <div className="space-y-6 max-w-4xl" dir="rtl">
                <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shrink-0">
                        <GitBranch className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold">إدارة الأفرع</h1>
                        <p className="text-muted-foreground mt-1 text-sm">الأفرع المتعددة غير مفعّلة لهذا المطعم</p>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-amber-300 bg-amber-50/50 dark:bg-amber-950/10 p-12 text-center">
                    <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30">
                        <Crown className="w-7 h-7 text-amber-600" />
                    </div>
                    <div>
                        <p className="font-semibold text-amber-800 dark:text-amber-300">ميزة الأفرع غير مفعّلة</p>
                        <p className="text-sm text-muted-foreground mt-1">
                            يرجى التواصل مع مدير النظام لتفعيل خاصية الأفرع المتعددة لحسابك.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const branches = await getBranches();

    return (
        <div className="space-y-6 max-w-4xl" dir="rtl">
            <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shrink-0">
                    <GitBranch className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">إدارة الأفرع</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        إنشاء وإدارة أفرع مطعمك المتعددة — {branches.length} {branches.length === 1 ? 'فرع' : 'أفرع'} مسجّل
                    </p>
                </div>
            </div>
            <BranchesManager branches={branches} />
        </div>
    );
}
