import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { slug: string } }) {
    try {
        const slug = params.slug;

        // Find tenant and their menu
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

        if (!tenant || !tenant.isActive || tenant.subscriptionStatus === 'CANCELED') {
            return NextResponse.json({ error: 'Menu unavailable' }, { status: 404 });
        }

        return NextResponse.json({
            restaurant: {
                name: tenant.name,
                logoUrl: tenant.logoUrl,
                primaryColor: tenant.primaryColor
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            categories: (tenant as any).categories
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
