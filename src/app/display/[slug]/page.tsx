import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { MenuBoard } from '@/components/display/menu-board';
import { activeBranchOr } from '@/lib/utils/branch-where';

export const metadata = {
    title: 'شاشة العرض',
};

export const dynamic = 'force-dynamic';

interface Props {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ theme?: string; kiosk?: string }>;
}

export default async function DisplayPage({ params, searchParams }: Props) {
    const { slug } = await params;
    const { theme = 'dark', kiosk } = await searchParams;

    // Resolve tenant
    const tenant = await prisma.tenant.findFirst({
        where: { slug },
        select: { id: true, name: true, nightMenuStartTime: true, nightMenuEndTime: true }
    });
    if (!tenant) notFound();

    const categoriesRaw = await prisma.category.findMany({
        where: { tenantId: tenant.id, ...activeBranchOr() },
        include: {
            items: {
                where: { isAvailable: true, isDeleted: false },
                select: {
                    id: true,
                    name: true,
                    nameAr: true,
                    price: true,
                    image: true,
                    isAvailable: true,
                }
            }
        },
        orderBy: { name: 'asc' }
    });

    // Map DB `image` → component's `imageUrl` prop shape
    const categories = categoriesRaw.map((c) => ({
        id: c.id,
        name: c.name,
        nameAr: c.nameAr,
        items: c.items.map((it) => ({
            id: it.id,
            name: it.name,
            nameAr: it.nameAr,
            price: it.price,
            imageUrl: it.image,
            isAvailable: it.isAvailable,
        })),
    }));

    return (
        <MenuBoard
            tenantId={tenant.id}
            tenantName={tenant.name}
            categories={categories}
            theme={theme as 'dark' | 'light'}
            isKiosk={kiosk === 'true'}
            nightMenuStartTime={tenant.nightMenuStartTime ?? undefined}
            nightMenuEndTime={tenant.nightMenuEndTime ?? undefined}
        />
    );
}
