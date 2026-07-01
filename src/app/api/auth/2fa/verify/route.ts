import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyTotp, encryptSecret, decryptSecret } from '@/lib/totp';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
    // Parse body first so TOTP check runs before any potentially-slow DB/auth call
    const { code, secret, backupCodes, isSetup } = await req.json() as {
        code: string;
        secret?: string;
        backupCodes?: string[];
        isSetup?: boolean;
    };

    if (!code) {
        return NextResponse.json({ error: 'الرجاء إدخال الرمز' }, { status: 400 });
    }

    if (isSetup && secret) {
        // Verify TOTP immediately — before auth() or any DB call — to avoid clock-drift
        // caused by Neon cold-start latency (25-30 s)
        const valid = await verifyTotp(code, secret);
        if (!valid) {
            return NextResponse.json({ error: 'الرمز غير صحيح، حاول مرة أخرى' }, { status: 400 });
        }

        // TOTP is valid — now authenticate and persist (slow DB ops happen after the check)
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Encrypt and persist (bcrypt cost 8 is sufficient for random backup codes)
        const encryptedSecret = encryptSecret(secret);
        const hashedBackupCodes = backupCodes
            ? await Promise.all(backupCodes.map(c => bcrypt.hash(c, 8)))
            : [];

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                twoFactorEnabled: true,
                twoFactorSecret: encryptedSecret,
                twoFactorBackupCodes: JSON.stringify(hashedBackupCodes),
                twoFactorVerifiedAt: new Date(),
            }
        });

        return NextResponse.json({ success: true });
    }

    // Login verification flow — auth() needed to get user ID for DB lookup
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Login verification flow — fetch stored encrypted secret
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { twoFactorSecret: true, twoFactorEnabled: true }
    });

    if (!user?.twoFactorEnabled || !user.twoFactorSecret) {
        return NextResponse.json({ error: '2FA غير مفعل' }, { status: 400 });
    }

    const plainSecret = decryptSecret(user.twoFactorSecret);
    const valid = await verifyTotp(code, plainSecret);

    if (!valid) {
        return NextResponse.json({ error: 'الرمز غير صحيح' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
}
