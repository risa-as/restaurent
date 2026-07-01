import Link from 'next/link';
import { CreditCard } from 'lucide-react';

export const metadata = {
    title: 'متأخر السداد',
};

export default function PastDuePage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4" dir="rtl">
            <div className="max-w-lg text-center space-y-6">
                <div className="flex justify-center">
                    <div className="bg-amber-100 dark:bg-amber-900/30 rounded-full p-6">
                        <CreditCard className="w-16 h-16 text-amber-600" />
                    </div>
                </div>
                <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white">
                    انتهت صلاحية الاشتراك
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                    لقد انتهت فترة السماح لاشتراكك. يرجى تحديث بيانات الدفع للاستمرار في استخدام النظام.
                </p>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 text-right text-sm text-amber-800 dark:text-amber-200">
                    <strong>ملاحظة:</strong> بياناتك محفوظة ولم يتم حذفها. بعد تجديد الاشتراك ستعود جميع الخدمات للعمل فوراً.
                </div>
                <div className="flex justify-center gap-3 pt-4">
                    <Link
                        href="/dashboard/billing"
                        className="inline-block px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition"
                    >
                        تجديد الاشتراك الآن
                    </Link>
                    <Link
                        href="/"
                        className="inline-block px-6 py-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-300 font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                    >
                        الصفحة الرئيسية
                    </Link>
                </div>
            </div>
        </div>
    );
}
