'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WizardSteps } from '@/components/onboarding/wizard-steps';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function RegisterRestaurantPage() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [color, setColor] = useState('#f97316');

    // Auto-generate slug from name
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setName(val);
        // Simple slugify for Arabic/English
        setSlug(val.trim().toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, '-').replace(/-+/g, '-'));
    };

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        // Save to sessionStorage for multi-step form
        sessionStorage.setItem('onboarding_restaurant', JSON.stringify({ name, slug, primaryColor: color }));
        router.push('/register/owner');
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto space-y-8">
                <div className="text-center">
                    <div className="mx-auto mb-4 flex items-center justify-center w-20 h-20 rounded-2xl bg-[hsl(246,80%,14%)] shadow-lg overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src="/logo.png" alt="نظام المطعم" className="w-full h-full object-contain" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">سجّل مطعمك (الخطوة 1 من 3)</h2>
                    <p className="mt-2 text-gray-600 dark:text-gray-400">لنبدأ بإعداد الهوية البصرية لمطعمك.</p>
                </div>

                <WizardSteps currentStep={1} />

                <div className="bg-white dark:bg-slate-800 p-8 shadow rounded-lg">
                    <form onSubmit={handleNext} className="space-y-6">
                        <div>
                            <Label htmlFor="restaurantName">اسم المطعم</Label>
                            <Input
                                id="restaurantName"
                                required
                                value={name}
                                onChange={handleNameChange}
                                placeholder="مثال: مطعم الأرز، Burger King..."
                                className="mt-2 text-right"
                            />
                        </div>

                        <div>
                            <Label htmlFor="slug">رابط المطعم (Subdomain)</Label>
                            <div className="mt-2 flex rounded-md shadow-sm" dir="ltr">
                                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-500 sm:text-sm">
                                    https://
                                </span>
                                <Input
                                    type="text"
                                    id="slug"
                                    required
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm border-gray-300 dark:border-slate-700 dark:bg-slate-900 text-left"
                                />
                                <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-700 text-gray-500 sm:text-sm">
                                    .your-domain.com
                                </span>
                            </div>
                            <p className="mt-1 text-sm text-gray-500">هذا هو الرابط الذي سيدخل منه الزبائن والموظفون.</p>
                        </div>

                        <div>
                            <Label htmlFor="color">اللون الأساسي للعلامة التجارية</Label>
                            <div className="mt-2 flex items-center space-x-4 space-x-reverse">
                                <input
                                    type="color"
                                    id="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="h-10 w-10 p-0 border-0 rounded cursor-pointer"
                                />
                                <span className="text-sm font-medium">{color}</span>
                            </div>
                        </div>

                        {/* Note: Logo upload omitted for simple MVP, handled later in dashboard */}

                        <div className="pt-4">
                            <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white text-lg py-6">
                                التالي: بيانات المالك
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
