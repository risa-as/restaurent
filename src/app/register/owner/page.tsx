'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WizardSteps } from '@/components/onboarding/wizard-steps';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function RegisterOwnerPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        // Enforce flow: if no restaurant data, go back
        if (!sessionStorage.getItem('onboarding_restaurant')) {
            router.replace('/register');
        }
    }, [router]);

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        sessionStorage.setItem('onboarding_owner', JSON.stringify({ name, email, password }));
        router.push('/register/plan');
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">حساب المدير العام (الخطوة 2 من 3)</h2>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">ستستخدم هذا الحساب لإدارة المطعم وإضافة الموظفين.</p>
                </div>

                <WizardSteps currentStep={2} />

                <div className="bg-white dark:bg-slate-800 p-8 shadow rounded-lg">
                    <form onSubmit={handleNext} className="space-y-6">
                        <div>
                            <Label htmlFor="ownerName">اسم المدير (مالك المطعم)</Label>
                            <Input
                                id="ownerName"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="مثال: أحمد محمد"
                                className="mt-2"
                            />
                        </div>

                        <div>
                            <Label htmlFor="ownerEmail">البريد الإلكتروني</Label>
                            <Input
                                id="ownerEmail"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@example.com"
                                className="mt-2 text-left"
                                dir="ltr"
                            />
                        </div>

                        <div>
                            <Label htmlFor="password">كلمة المرور</Label>
                            <Input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                minLength={6}
                                className="mt-2 text-left"
                                dir="ltr"
                            />
                        </div>

                        <div className="pt-4 flex gap-4">
                            <Button type="button" variant="outline" onClick={() => router.back()} className="w-1/3 py-6">
                                رجوع
                            </Button>
                            <Button type="submit" className="w-2/3 bg-orange-600 hover:bg-orange-700 text-white text-lg py-6">
                                التالي: اختيار الخطة
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
