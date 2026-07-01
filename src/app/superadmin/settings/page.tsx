import { getPlatformSettingsForAdmin, getTwoFactorEmail } from '@/lib/actions/superadmin';
import PlatformSettingsForm from '@/components/superadmin/platform-settings-form';
import TwoFactorEmailForm from '@/components/superadmin/two-factor-email-form';
import { Settings } from 'lucide-react';

export const metadata = {
    title: 'الإعدادات',
};

export const dynamic = 'force-dynamic';

export default async function SuperAdminSettingsPage() {
    const [settings, twoFactorData] = await Promise.all([
        getPlatformSettingsForAdmin(),
        getTwoFactorEmail(),
    ]);

    return (
        <div className="space-y-6 max-w-2xl">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Settings className="w-7 h-7" />
                    إعدادات المنصة
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    تعديل معلومات الدفع وإعدادات الاشتراك — تُحدَّث فوراً في صفحة الفوترة
                </p>
            </div>

            <TwoFactorEmailForm
                currentEmail={twoFactorData.twoFactorEmail}
                loginEmail={twoFactorData.loginEmail}
            />

            <PlatformSettingsForm settings={{
                bankName: settings.bankName,
                bankAccount: settings.bankAccount,
                bankAccountName: settings.bankAccountName,
                bankIban: settings.bankIban,
                zainCashNumber: settings.zainCashNumber,
                supportPhone: settings.supportPhone,
                welcomeMessage: settings.welcomeMessage,
                trialDurationDays: settings.trialDurationDays,
                gracePeriodDays: settings.gracePeriodDays,
                maintenanceMode: settings.maintenanceMode,
                usdToIqdRate: settings.usdToIqdRate,
            }} />
        </div>
    );
}
