import Link from 'next/link';
import { Ban } from 'lucide-react';

export const metadata = {
    title: 'الحساب موقوف',
};

export default function SuspendedPage() {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4" dir="rtl">
            <div className="max-w-lg text-center space-y-6">
                <div className="flex justify-center">
                    <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-6">
                        <Ban className="w-16 h-16 text-red-600" />
                    </div>
                </div>
                <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white">
                    الحساب موقوف
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300">
                    تم إيقاف هذا المطعم من قبل الإدارة. يرجى التواصل مع الدعم الفني لمزيد من المعلومات.
                </p>
                <div className="pt-4">
                    <Link
                        href="/"
                        className="inline-block px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition"
                    >
                        العودة للصفحة الرئيسية
                    </Link>
                </div>
            </div>
        </div>
    );
}
