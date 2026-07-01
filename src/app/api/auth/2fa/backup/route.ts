import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { backupCode } = await req.json() as { backupCode: string };
    if (!backupCode) {
        return NextResponse.json({ error: 'الرجاء إدخال رمز الطوارئ' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { twoFactorBackupCodes: true, twoFactorEnabled: true }
    });

    if (!user?.twoFactorEnabled || !user.twoFactorBackupCodes) {
        return NextResponse.json({ error: '2FA غير مفعل' }, { status: 400 });
    }

    const hashes: string[] = JSON.parse(user.twoFactorBackupCodes);
    const normalizedInput = backupCode.trim().toUpperCase();

    // Find matching hash
    let matchedIndex = -1;
    for (let i = 0; i < hashes.length; i++) {
        if (await bcrypt.compare(normalizedInput, hashes[i])) {
            matchedIndex = i;
            break;
        }
    }

    if (matchedIndex === -1) {
        return NextResponse.json({ error: 'رمز الطوارئ غير صحيح أو تم استخدامه' }, { status: 400 });
    }

    // Remove the used code
    const updatedHashes = hashes.filter((_, i) => i !== matchedIndex);
    await prisma.user.update({
        where: { id: session.user.id },
        data: { twoFactorBackupCodes: JSON.stringify(updatedHashes) }
    });

    return NextResponse.json({ success: true });
}
