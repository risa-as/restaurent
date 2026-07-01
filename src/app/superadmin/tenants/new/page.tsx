import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Building2 } from 'lucide-react';
import CreateTenantForm from '@/components/superadmin/create-tenant-form';

export const metadata = {
    title: 'إضافة مطعم',
};

export default function NewTenantPage() {
    return (
        <div className="space-y-6 max-w-4xl" dir="rtl">
            {/* Back */}
            <Link href="/superadmin/tenants">
                <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                    <ArrowRight className="w-4 h-4" />
                    العودة إلى المطاعم
                </Button>
            </Link>

            {/* Header */}
            <div className="relative rounded-2xl overflow-hidden border bg-card">
                <div className="h-1.5 w-full bg-gradient-to-l from-primary to-primary/60" />
                <div className="px-6 py-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold">إنشاء حساب مطعم جديد</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            أنشئ حساباً جديداً للمطعم مع بيانات المدير والإعدادات الأولية
                        </p>
                    </div>
                </div>
            </div>

            <CreateTenantForm />
        </div>
    );
}
