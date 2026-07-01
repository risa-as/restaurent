import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateTotpSecret, generateQrUrl, generateBackupCodes } from '@/lib/totp';
import QRCode from 'qrcode';

export async function POST() {
    const session = await auth();
    if (!session?.user?.id || !session?.user?.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use twoFactorEmail if set, otherwise fall back to login email
    let label = session.user.email;
    try {
        const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { twoFactorEmail: true } as any,
        });
        if ((user as any)?.twoFactorEmail) {
            label = (user as any).twoFactorEmail;
        }
    } catch { /* column not yet migrated — use login email */ }

    const secret = await generateTotpSecret();
    const otpauthUrl = await generateQrUrl(label, secret);
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);
    const backupCodes = generateBackupCodes(8);

    // Return secret and backup codes in plaintext — client must verify before we persist
    return NextResponse.json({
        secret,
        qrDataUrl,
        otpauthUrl,
        backupCodes,
    });
}
