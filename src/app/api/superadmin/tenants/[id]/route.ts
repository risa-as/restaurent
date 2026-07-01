import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { ServiceMode, PlanType } from '@prisma/client';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await auth();
        if (!session || session.user?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: params.id },
            include: {
                users: { where: { role: 'ADMIN' }, take: 1 },
                _count: { select: { orders: true, menuItems: true, users: true, tables: true } }
            }
        });

        if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        return NextResponse.json({ tenant });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
    try {
        const session = await auth();
        if (!session || session.user?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { isActive, serviceMode, plan, subscriptionStatus } = body;

        // Validate serviceMode if provided
        if (serviceMode && !Object.values(ServiceMode).includes(serviceMode)) {
            return NextResponse.json({ error: 'Invalid serviceMode' }, { status: 400 });
        }

        // Validate plan if provided
        if (plan && !Object.values(PlanType).includes(plan)) {
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
        }

        const updateData: Record<string, unknown> = {};
        if (typeof isActive !== 'undefined') updateData.isActive = isActive;
        if (serviceMode) updateData.serviceMode = serviceMode;
        if (plan) updateData.plan = plan;
        if (subscriptionStatus) updateData.subscriptionStatus = subscriptionStatus;

        if (Object.keys(updateData).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const tenant = await prisma.tenant.update({
            where: { id: params.id },
            data: updateData
        });

        return NextResponse.json({ success: true, tenant });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
