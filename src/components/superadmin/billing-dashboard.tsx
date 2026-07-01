'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Clock, AlertTriangle, Users, CreditCard } from 'lucide-react';
import UpgradeRequestActions from './upgrade-request-actions';
import { useFmt } from '@/contexts/number-locale-context';

const PLAN_LABELS: Record<string, string> = {
    TRIAL: 'تجريبية', BASIC: 'الأساسية', PRO: 'المتقدمة', ENTERPRISE: 'المؤسسات',
};

interface Props {
    data: {
        mrr: number;
        mrrThisMonth: number;
        totalActiveTenants: number;
        totalTenants: number;
        pendingRequestsCount: number;
        pendingRequests: Array<{
            id: string;
            amount: number;
            plan: string;
            months: number;
            createdAt: Date;
            tenant: { name: string; plan: string };
        }>;
        expiringTenants: Array<{
            id: string;
            name: string;
            plan: string;
            expiresAt: Date | null;
            hasPendingRequest: boolean;
        }>;
        planBreakdown: Array<{ plan: string; count: number }>;
    };
}

export default function SuperAdminBillingDashboard({ data }: Props) {
    const fmt = useFmt();
    const { mrr, mrrThisMonth, totalActiveTenants, totalTenants, pendingRequestsCount, pendingRequests, expiringTenants, planBreakdown } = data;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <CreditCard className="w-7 h-7" />
                    لوحة الفوترة
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">الإيرادات والاشتراكات والطلبات المعلقة</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-muted-foreground">MRR الشهري</span>
                            <TrendingUp className="w-4 h-4 text-green-500" />
                        </div>
                        <p className="text-2xl font-black">{fmt(mrr)}</p>
                        <p className="text-xs text-muted-foreground">د.ع / شهر</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-muted-foreground">إيرادات الشهر</span>
                            <CreditCard className="w-4 h-4 text-blue-500" />
                        </div>
                        <p className="text-2xl font-black">{fmt(mrrThisMonth)}</p>
                        <p className="text-xs text-muted-foreground">مقبوض هذا الشهر</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-muted-foreground">المطاعم النشطة</span>
                            <Users className="w-4 h-4 text-purple-500" />
                        </div>
                        <p className="text-2xl font-black">{totalActiveTenants}</p>
                        <p className="text-xs text-muted-foreground">من أصل {totalTenants}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-5">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-muted-foreground">طلبات معلقة</span>
                            <Clock className="w-4 h-4 text-yellow-500" />
                        </div>
                        <p className="text-2xl font-black">{pendingRequestsCount}</p>
                        <p className="text-xs text-muted-foreground">بانتظار المراجعة</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
                {/* Plan breakdown */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base">توزيع الخطط</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {planBreakdown.map(({ plan, count }) => (
                            <div key={plan} className="flex items-center justify-between text-sm">
                                <span>{PLAN_LABELS[plan] || plan}</span>
                                <span className="font-bold">{count} مطعم</span>
                            </div>
                        ))}
                        {planBreakdown.length === 0 && (
                            <p className="text-muted-foreground text-sm">لا توجد بيانات</p>
                        )}
                    </CardContent>
                </Card>

                {/* Expiring soon */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                            منتهية الصلاحية خلال 7 أيام
                            {expiringTenants.length > 0 && (
                                <Badge variant="destructive" className="text-xs">{expiringTenants.length}</Badge>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {expiringTenants.length === 0 ? (
                            <p className="text-muted-foreground text-sm">لا توجد اشتراكات منتهية قريباً</p>
                        ) : (
                            expiringTenants.map(t => (
                                <div key={t.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                                    <div>
                                        <span className="font-medium">{t.name}</span>
                                        <span className="text-xs text-muted-foreground mr-1">— {PLAN_LABELS[t.plan] || t.plan}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {t.hasPendingRequest && (
                                            <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">طلب معلق</Badge>
                                        )}
                                        {t.expiresAt && (
                                            <span className="text-xs text-orange-700 font-semibold">
                                                {new Date(t.expiresAt).toLocaleDateString('ar-SA')}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Pending upgrade requests */}
            {pendingRequests.length > 0 && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Clock className="w-4 h-4 text-yellow-500" />
                            طلبات الترقية المعلقة
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {pendingRequests.map(req => (
                            <div key={req.id} className="flex items-center justify-between p-3 border rounded-xl">
                                <div className="text-sm">
                                    <p className="font-semibold">{req.tenant.name}</p>
                                    <p className="text-muted-foreground text-xs">
                                        {PLAN_LABELS[req.tenant.plan] || req.tenant.plan} → {PLAN_LABELS[req.plan] || req.plan}
                                        {' · '}
                                        {req.months} شهر
                                        {' · '}
                                        {new Date(req.createdAt).toLocaleDateString('ar-SA')}
                                    </p>
                                </div>
                                <UpgradeRequestActions paymentId={req.id} />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
