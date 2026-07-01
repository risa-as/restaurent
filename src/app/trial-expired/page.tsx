import Link from 'next/link';
import { Clock } from 'lucide-react';

export const metadata = {
    title: 'انتهت الفترة التجريبية',
};

export default function TrialExpiredPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4" dir="rtl">
            <div className="max-w-lg text-center space-y-6">
                <div className="flex justify-center">
                    <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-6">
                        <Clock className="w-16 h-16 text-blue-600" />
                    </div>
                </div>
                <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white">
                    انتهت فترة التجربة
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                    لقد انتهت فترة التجربة المجانية. اشترك الآن للاستمرار في استخدام جميع ميزات النظام.
                </p>
                <div className="grid grid-cols-1 gap-3 text-right">
                    {['الطلبات والمطبخ في الوقت الفعلي', 'إدارة المخزون والموردين', 'تقارير المبيعات والتحليلات', 'نظام نقاط الولاء للعملاء'].map((feature) => (
                        <div key={feature} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                            <span className="text-green-500 font-bold">✓</span>
                            {feature}
                        </div>
                    ))}
                </div>
                <div className="flex justify-center gap-3 pt-4">
                    <Link
                        href="/register/plan"
                        className="inline-block px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition"
                    >
                        اشترك الآن
                    </Link>
                    <Link
                        href="/"
                        className="inline-block px-6 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                    >
                        معرفة المزيد
                    </Link>
                </div>
            </div>
        </div>
    );
}
