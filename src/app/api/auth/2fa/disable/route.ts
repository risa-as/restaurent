import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST() {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SUPER_ADMIN cannot disable 2FA
    if (session.user.role === 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'SUPER_ADMIN لا يمكنه إلغاء 2FA' }, { status: 403 });
    }

    await prisma.user.update({
        where: { id: session.user.id },
        data: {
            twoFactorEnabled: false,
            twoFactorSecret: null,
            twoFactorBackupCodes: null,
            twoFactorVerifiedAt: null,
        }
    });

    return NextResponse.json({ success: true });
}
