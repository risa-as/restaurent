import { randomBytes, createHash } from 'crypto';
import { prisma } from '@/lib/prisma';

export function generateResetToken(): { raw: string; hash: string } {
    const raw = randomBytes(32).toString('hex');
    const hash = hashToken(raw);
    return { raw, hash };
}

export function hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
}

export async function validateResetToken(raw: string, userId?: string): Promise<{
    valid: boolean;
    token?: { id: string; userId: string };
    error?: string;
}> {
    const tokenHash = hashToken(raw);

    const token = await prisma.passwordResetToken.findFirst({
        where: {
            tokenHash,
            ...(userId ? { userId } : {}),
        },
    });

    if (!token) return { valid: false, error: 'الرمز غير صالح' };
    if (token.usedAt) return { valid: false, error: 'تم استخدام هذا الرمز مسبقاً' };
    if (new Date() > token.expiresAt) return { valid: false, error: 'انتهت صلاحية الرمز، طلب رابطاً جديداً' };

    return { valid: true, token };
}
