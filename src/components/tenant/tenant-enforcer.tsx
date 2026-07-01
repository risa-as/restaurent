import { headers } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

export async function TenantEnforcer() {
    const headersList = headers();
    const slug = headersList.get('x-tenant-slug');
    const isRoot = headersList.get('x-is-root-domain') === 'true';

    // Allow root domain requests to pass through untouched
    if (!slug || isRoot) {
        return null;
    }

    try {
        // Fetch Tenant directly
        const tenant = await prisma.tenant.findUnique({
            where: { slug }
        });

        if (!tenant) {
            // Unregistered subdomain
            const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
            const protocol = rootDomain.includes('localhost') ? 'http' : 'https';
            redirect(`${protocol}://${rootDomain}/not-found`);
        }

        if (!tenant.isActive && tenant.subscriptionStatus !== 'PAST_DUE') {
            const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
            const protocol = rootDomain.includes('localhost') ? 'http' : 'https';
            redirect(`${protocol}://${rootDomain}/suspended`);
        }

        // Grace Period Logic
        if (tenant.subscriptionStatus === 'PAST_DUE') {
            const currentEnd = tenant.currentPeriodEnd ? new Date(tenant.currentPeriodEnd) : new Date();
            const gracePeriodEnds = new Date(currentEnd.getTime() + 3 * 24 * 60 * 60 * 1000);
            const now = new Date();

            if (now > gracePeriodEnds) {
                // Hard lock
                const currentPath = headersList.get('x-invoke-path') || '';
                if (!currentPath.includes('/past-due') && !currentPath.includes('/api/')) {
                    redirect('/past-due');
                }
            } else {
                // Show warning Banner if inside Grace Period
                const daysLeft = Math.ceil((gracePeriodEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                return (
                    <div className="bg-red-600 text-white text-center py-2 px-4 shadow-md sticky top-0 z-[100] flex justify-center items-center gap-3">
                        <AlertCircle className="w-5 h-5" />
                        <span className="font-semibold text-sm sm:text-base">
                            تحذير: لقد فشلت عملية تجديد الاشتراك الخاص بك. الحساب سيتوقف بعد {daysLeft} أيام.
                        </span>
                        <Link href="/dashboard/billing" className="bg-white text-red-600 text-xs sm:text-sm font-bold px-3 py-1 rounded hover:bg-gray-100 transition whitespace-nowrap">
                            تحديث الدفع
                        </Link>
                    </div>
                );
            }
        }
    } catch (error) {
        console.error('TenantEnforcer error:', error);
    }

    return null;
}
