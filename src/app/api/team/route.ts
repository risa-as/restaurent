import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await auth();
    if (!(session?.user as any)?.tenantId) {
        return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const members = await prisma.user.findMany({
        where: { tenantId: (session!.user as any).tenantId, isDeleted: false },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(members);
}

export async function POST(req: Request) {
    const session = await auth();
    if (!(session?.user as any)?.tenantId) {
        return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    // Only ADMIN, MANAGER, SUPER_ADMIN can add team members
    const role = session!.user.role as string;
    if (!['ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(role)) {
        return NextResponse.json({ error: 'لا تملك صلاحية إضافة أعضاء' }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, role: newRole } = body;

    if (!name || !email || !password || !newRole) {
        return NextResponse.json({ error: 'جميع الحقول مطلوبة' }, { status: 400 });
    }

    // Whitelist of roles assignable by tenant admins — SUPER_ADMIN is never assignable
    const ASSIGNABLE_ROLES = [
        'ADMIN', 'MANAGER', 'WAITER', 'CHEF', 'ACCOUNTANT',
        'DRIVER', 'CAPTAIN', 'DELIVERY_MANAGER', 'CASHIER', 'STORE_MANAGER',
    ];
    if (!ASSIGNABLE_ROLES.includes(newRole)) {
        return NextResponse.json({ error: 'دور غير مسموح به' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        return NextResponse.json({ error: 'البريد الإلكتروني مستخدم بالفعل' }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
        data: {
            name,
            email,
            password: hashed,
            role: newRole,
            tenantId: (session!.user as any).tenantId,
        },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
    });

    return NextResponse.json(user, { status: 201 });
}
