import { getTalabatConfig } from '@/lib/actions/talabat';
import { TalabatSettingsForm } from '@/components/tenant/talabat-settings-form';
import { ShoppingCart } from 'lucide-react';
import { headers } from 'next/headers';

export const metadata = {
    title: 'تكامل طلبات',
};

export const dynamic = 'force-dynamic';

export default async function TalabatSettingsPage() {
    const config = await getTalabatConfig();

    // Build webhook URL from request host
    const headersList = await headers();
    const host = headersList.get('host') ?? 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const webhookUrl = `${protocol}://${host}/api/webhooks/talabat`;

    return (
        <div className="space-y-6" dir="rtl">
            {/* Header */}
            <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 shadow-md shrink-0">
                    <ShoppingCart className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold">تكامل Talabat</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        ربط المطعم بمنصة Talabat لاستقبال الطلبات ومزامنة القائمة تلقائياً
                    </p>
                </div>
            </div>

            <TalabatSettingsForm config={config} webhookUrl={webhookUrl} />
        </div>
    );
}
