import { notFound } from 'next/navigation';
import CustomerMenu from '@/components/menu/customer-menu';

export const metadata = {
    title: 'قائمة الطعام',
};

export default async function TenantMenuPage({
    params,
    searchParams,
}: {
    params: { slug: string };
    searchParams: { table?: string; t?: string };
}) {
    const slug = params.slug;
    // دعم كلا الشكلين: ?table=رقم أو ?t=ID
    const tableParam = searchParams.table || searchParams.t;

    // We cannot use layout headers here if this is hitting `app/menu/[slug]`, 
    // because Subdomain routing redirects `tenant.app.com` to `/`. 
    // Wait, the Next.js routing might be set up so that `tenant.domain.com/menu` 
    // maps to `app/menu/page.tsx` with headers injected.
    // Let's just rely on the slug param to fetch the exact menu.
    const _baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Server-side fetch from the API we just created using absolute URL
    // To avoid fetching loop or abs path issues, let's just use Prisma directly here since it's a Server Component!

    const { prisma } = await import('@/lib/prisma');

    const tenant = await prisma.tenant.findUnique({
        where: { slug },
        include: {
            categories: {
                include: {
                    items: {
                        where: { isAvailable: true, isDeleted: false }
                    }
                }
            }
        }
    });

    if (!tenant || !tenant.isActive) {
        notFound();
    }

    // Plan gate — QR public menu is PRO+ only
    const { getEffectiveLimits } = await import('@/lib/plan-limits');
    const planLimits = getEffectiveLimits(tenant as any);
    if (!planLimits.modules.qrMenu) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6">
                <div className="text-center space-y-2">
                    <h1 className="text-2xl font-bold">{tenant.name}</h1>
                    <p className="text-muted-foreground">قائمة الطعام الرقمية غير متاحة حالياً</p>
                </div>
            </div>
        );
    }

    // Pass data to Client Component for interactivity (Cart, ordering)
    return (
        <div className="min-h-screen pb-24" style={{ '--primary': tenant.primaryColor } as any}>
            <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md shadow-sm z-50 p-4 flex justify-between items-center border-b">
                <div className="flex items-center gap-3">
                    {tenant.logoUrl && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={tenant.logoUrl} alt="Logo" className="w-10 h-10 object-contain rounded-full" />
                    )}
                    <h1 className="text-xl font-bold text-gray-900">{tenant.name}</h1>
                </div>
            </header>

            <main className="pt-20 px-4 max-w-2xl mx-auto">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <CustomerMenu
                    categories={(tenant as any).categories}
                    tenantId={tenant.id}
                    slug={tenant.slug}
                    initialTable={tableParam}
                />
            </main>
        </div>
    );
}
