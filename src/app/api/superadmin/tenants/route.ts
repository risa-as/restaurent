import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET() {
    try {
        const session = await auth();
        if (!session || session.user?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenants = await prisma.tenant.findMany({
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ tenants });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
