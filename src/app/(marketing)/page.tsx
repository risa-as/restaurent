import Link from 'next/link';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export const metadata = {
    title: 'منصة إدارة المطاعم',
};

export default async function MarketingPage() {
  const session = await auth();

  // Logged-in users skip the public landing and go straight to their workspace.
  if (session?.user) {
    const role = session.user.role;
    if (role === 'STORE_MANAGER') redirect('/inventory');
    else if (role === 'CASHIER') redirect('/cashier');
    else if (role === 'CHEF') redirect('/kitchen');
    else if (role === 'CAPTAIN') redirect('/captain');
    else if (role === 'WAITER') redirect('/waiter');
    else if (role === 'DRIVER' || role === 'DELIVERY_MANAGER') redirect('/delivery');
    else redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-4 dark:bg-slate-900">
      <div className="max-w-3xl space-y-8 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-6xl">
          منصة إدارة المطاعم المتكاملة
        </h1>
        <p className="mx-auto max-w-2xl text-xl text-gray-600 dark:text-gray-300">
          ارفع كفاءة مطعمك بنظام سحابي يدير كل شيء: من المطبخ إلى الطاولات والتوصيل والمخزون، مع
          تحليلات ذكية.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/register"
            className="rounded-lg bg-orange-600 px-8 py-4 text-lg font-bold text-white transition-transform hover:scale-105 hover:bg-orange-700"
          >
            سجّل مطعمك الآن
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-gray-200 bg-white px-8 py-4 text-lg font-bold text-gray-900 transition hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
          >
            تسجيل الدخول
          </Link>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-gray-600 dark:text-gray-300">
          <Link
            href="/privacy-policy"
            className="rounded-full border border-gray-200 bg-white px-4 py-2 font-semibold hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms-of-service"
            className="rounded-full border border-gray-200 bg-white px-4 py-2 font-semibold hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}
