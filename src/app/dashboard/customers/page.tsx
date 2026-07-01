import { getLoyaltySettings, getCustomers } from '@/lib/actions/loyalty';
import { LoyaltySettingsCard } from '@/components/loyalty/loyalty-settings-card';
import { CustomersTable } from '@/components/loyalty/customers-table';

export const metadata = {
    title: 'العملاء',
};

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
    const [settings, customers] = await Promise.all([
        getLoyaltySettings(),
        getCustomers(),
    ]);

    return (
        <div className="space-y-6" dir="rtl">
            <div>
                <h1 className="text-3xl font-bold">نظام الولاء والعملاء</h1>
                <p className="text-muted-foreground mt-1">
                    إدارة إعدادات الولاء وعرض بيانات العملاء ونقاطهم
                </p>
            </div>

            {/* Loyalty Settings */}
            <LoyaltySettingsCard settings={settings} />

            {/* Customers Table */}
            <CustomersTable
                customers={customers}
                loyaltyEnabled={settings.loyaltyEnabled}
                pointValueIqd={settings.loyaltyPointValueIqd}
            />
        </div>
    );
}
