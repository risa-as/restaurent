import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function DELETE(
    _req: Request,
    { params }: { params: { id: string } }
) {
    const session = await auth();
    if (!(session?.user as any)?.tenantId) {
        return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    const role = session!.user.role as string;
    if (!['ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(role)) {
        return NextResponse.json({ error: 'لا تملك صلاحية الحذف' }, { status: 403 });
    }

    // Prevent deleting yourself
    if (params.id === session!.user.id) {
        return NextResponse.json({ error: 'لا يمكنك حذف حسابك الخاص' }, { status: 400 });
    }

    // Soft delete — with tenant isolation check
    const updated = await prisma.user.updateMany({
        where: { id: params.id, tenantId: (session!.user as any).tenantId, isDeleted: false },
        data: { isDeleted: true, deletedAt: new Date() },
    });

    if (updated.count === 0) {
        return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
}
