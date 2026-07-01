'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WizardSteps } from '@/components/onboarding/wizard-steps';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

const plans = [
    {
        id: 'BASIC',
        name: 'الأساسية',
        price: 'مجاناً للابد',
        features: ['إدارة طلبات المطبخ', 'نقاط بيع أساسية', 'تقارير يومية'],
    },
    {
        id: 'PRO',
        name: 'المتقدمة',
        price: '50$ / شهر',
        features: ['كل ميزات الخطة الأساسية', 'قائمة طعام QR ذكية', 'إدارة المخزون والتكاليف', 'تعدد الفروع (قريباً)'],
        popular: true,
    },
    {
        id: 'ENTERPRISE',
        name: 'المؤسسات',
        price: 'تواصل معنا',
        features: ['كل الميزات المتقدمة', 'تحليلات الذكاء الاصطناعي', 'نظام ولاء العملاء', 'مدير حساب مخصص'],
    }
];

export default function RegisterPlanPage() {
    const router = useRouter();
    const [selectedPlan, setSelectedPlan] = useState('PRO');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!sessionStorage.getItem('onboarding_owner')) {
            router.replace('/register/owner');
        }
    }, [router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const restaurantData = JSON.parse(sessionStorage.getItem('onboarding_restaurant') || '{}');
        const ownerData = JSON.parse(sessionStorage.getItem('onboarding_owner') || '{}');

        try {
            const res = await fetch('/api/tenants/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tenant: restaurantData,
                    owner: ownerData,
                    plan: selectedPlan
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'حدث خطأ أثناء التسجيل');
            }

            // Cleanup session
            sessionStorage.removeItem('onboarding_restaurant');
            sessionStorage.removeItem('onboarding_owner');

            // Redirect to their new dashboard
            const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
            const isLocal = typeof window !== 'undefined' && window.location.hostname.includes('localhost');
            const newDomain = isLocal ? `http://${restaurantData.slug}.localhost:3000/login?registered=true` : `https://${restaurantData.slug}.${rootDomain}/login?registered=true`;

            window.location.href = newDomain;
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto space-y-8">
                <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">اختر الخطة المناسبة (الخطوة 3 من 3)</h2>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">يمكنك الترقية أو الإلغاء في أي وقت.</p>
                </div>

                <WizardSteps currentStep={3} />

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center font-medium max-w-3xl mx-auto border border-red-200">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto">
                    <div className="grid md:grid-cols-3 gap-6">
                        {plans.map((plan) => (
                            <div
                                key={plan.id}
                                onClick={() => setSelectedPlan(plan.id)}
                                className={`relative bg-white dark:bg-slate-800 rounded-2xl p-8 border-2 cursor-pointer transition-all ${selectedPlan === plan.id
                                        ? 'border-orange-500 shadow-xl ring-1 ring-orange-500 scale-105 z-10'
                                        : 'border-transparent shadow-sm hover:border-orange-200 dark:hover:border-slate-600 hover:shadow-md'
                                    }`}
                            >
                                {plan.popular && (
                                    <div className="absolute top-0 right-1/2 translate-x-1/2 -translate-y-1/2 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                        الأكثر طلباً
                                    </div>
                                )}
                                <div className="text-center mb-6">
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                                    <div className="text-2xl font-extrabold text-orange-600">{plan.price}</div>
                                </div>
                                <ul className="space-y-4 mb-8 text-sm text-gray-600 dark:text-gray-400">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-center gap-2">
                                            <Check className="w-5 h-5 text-green-500 shrink-0" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="absolute bottom-8 left-8 right-8">
                                    <div className={`w-full py-2 rounded-lg text-center font-bold ${selectedPlan === plan.id ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white'
                                        }`}>
                                        {selectedPlan === plan.id ? 'تم الاختيار' : 'اختر الخطة'}
                                    </div>
                                </div>
                                {/* Padding to account for absolute button */}
                                <div className="h-10"></div>
                            </div>
                        ))}
                    </div>

                    <div className="pt-8 flex gap-4 max-w-2xl mx-auto">
                        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading} className="w-1/3 py-6">
                            رجوع
                        </Button>
                        <Button type="submit" disabled={loading} className="w-2/3 bg-orange-600 hover:bg-orange-700 text-white text-lg py-6 shadow-lg shadow-orange-500/30">
                            {loading ? 'جاري إنشاء المطعم...' : 'إنشاء الحساب والبدء'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
