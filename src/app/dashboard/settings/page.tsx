import { getSystemSettings } from '@/lib/actions/admin';
import { getRestaurantConfig } from '@/lib/actions/config';
import { SettingsForm } from '@/components/admin/settings-form';
import { TwoFactorSettings } from '@/components/auth/two-factor-settings';
import { TenantProfileForm } from '@/components/admin/tenant-profile-form';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Settings, Store, Globe, Shield, PlayCircle, Bot } from 'lucide-react';
import { TourRestartButton } from '@/components/onboarding/tour-restart-button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata = {
    title: 'الإعدادات',
};

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
    const [settings, config, session] = await Promise.all([
        getSystemSettings(),
        getRestaurantConfig(),
        auth(),
    ]);

    const userId = (session?.user as any)?.id;
    const tenantId = (session?.user as any)?.tenantId;

    const todayStr = new Date().toISOString().split('T')[0];
    const [userWith2FA, tenant, aiUsageLog] = await Promise.all([
        userId ? prisma.user.findUnique({ where: { id: userId }, select: { twoFactorEnabled: true } }) : null,
        tenantId ? prisma.tenant.findUnique({ where: { id: tenantId }, select: { googlePlaceId: true, nightMenuStartTime: true, nightMenuEndTime: true, aiDailyLimit: true } }) : null,
        tenantId ? prisma.aiUsageLog.findUnique({ where: { tenantId_date: { tenantId, date: todayStr } } }) : null,
    ]);
    const aiDailyLimit = tenant?.aiDailyLimit ?? 0;
    const aiUsageToday = aiUsageLog?.count ?? 0;
    const aiRemaining = aiDailyLimit > 0 ? Math.max(0, aiDailyLimit - aiUsageToday) : null;

    return (
        <div className="space-y-8" dir="rtl">
            {/* Header */}
            <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/80 to-primary shadow-md shrink-0">
                    <Settings className="w-6 h-6 text-primary-foreground" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">الإعدادات العامة</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        إدارة إعدادات المطعم والنظام والأمان
                    </p>
                </div>
            </div>

            {/* Quick navigation pills */}
            <div className="flex flex-wrap gap-2">
                {[
                    { icon: Store, label: 'إعدادات النظام', href: '#system' },
                    { icon: Globe, label: 'الإعدادات الرقمية', href: '#digital' },
                    { icon: Shield, label: 'الأمان', href: '#security' },
                    { icon: Bot, label: 'المساعد الذكي', href: '#ai' },
                    { icon: PlayCircle, label: 'الجولة التعريفية', href: '#tour' },
                ].map(({ icon: Icon, label, href }) => (
                    <a
                        key={href}
                        href={href}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors font-medium"
                    >
                        <Icon className="w-3 h-3" />
                        {label}
                    </a>
                ))}
            </div>

            {/* Sections */}
            <div id="system">
                <SettingsForm settings={settings} config={config} />
            </div>

            <div id="digital">
                <TenantProfileForm
                    googlePlaceId={tenant?.googlePlaceId ?? ''}
                    nightMenuStartTime={tenant?.nightMenuStartTime ?? ''}
                    nightMenuEndTime={tenant?.nightMenuEndTime ?? ''}
                />
            </div>

            <div id="security">
                <TwoFactorSettings twoFactorEnabled={userWith2FA?.twoFactorEnabled ?? false} />
            </div>

            {/* AI assistant daily limit */}
            <div id="ai">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Bot className="w-5 h-5 text-primary" />
                            المساعد الذكي
                        </CardTitle>
                        <CardDescription>
                            الحد اليومي لاستخدام المساعد الذكي المحدد من قِبل إدارة المنصة
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                            <div className="bg-muted/50 rounded-lg px-4 py-3 flex flex-col gap-1 min-w-[140px]">
                                <span className="text-xs text-muted-foreground">الحد اليومي</span>
                                <span className="font-bold text-lg">
                                    {aiDailyLimit === 0 ? (
                                        <Badge variant="secondary">غير محدود</Badge>
                                    ) : (
                                        `${aiDailyLimit} محادثة`
                                    )}
                                </span>
                            </div>
                            {aiDailyLimit > 0 && (
                                <>
                                    <div className="bg-muted/50 rounded-lg px-4 py-3 flex flex-col gap-1 min-w-[140px]">
                                        <span className="text-xs text-muted-foreground">المستخدم اليوم</span>
                                        <span className="font-bold text-lg">{aiUsageToday}</span>
                                    </div>
                                    <div className={`rounded-lg px-4 py-3 flex flex-col gap-1 min-w-[140px] ${aiRemaining === 0 ? 'bg-red-50 dark:bg-red-950/30' : 'bg-green-50 dark:bg-green-950/30'}`}>
                                        <span className="text-xs text-muted-foreground">المتبقي اليوم</span>
                                        <span className={`font-bold text-lg ${aiRemaining === 0 ? 'text-red-600' : 'text-green-600'}`}>
                                            {aiRemaining}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                        {aiDailyLimit > 0 && (
                            <p className="text-xs text-muted-foreground mt-3">
                                يتجدد العداد تلقائياً كل يوم. للتغيير تواصل مع إدارة المنصة.
                            </p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Tour restart */}
            <div id="tour">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <PlayCircle className="w-5 h-5 text-primary" />
                            الجولة التعريفية
                        </CardTitle>
                        <CardDescription>
                            استعرض جميع ميزات النظام وصفحاته من خلال جولة تفاعلية مفصلة
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <TourRestartButton />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
