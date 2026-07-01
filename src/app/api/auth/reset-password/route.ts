import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { validateResetToken } from '@/lib/password-reset';
import { resend, getEmailFrom } from '@/lib/resend';
import { render } from '@react-email/components';
import { PasswordChangedEmail } from '@/emails/PasswordChangedEmail';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
    try {
        const { token, newPassword, confirmPassword } = await req.json();

        if (!token || !newPassword || !confirmPassword) {
            return NextResponse.json({ error: 'جميع الحقول مطلوبة' }, { status: 400 });
        }

        if (newPassword !== confirmPassword) {
            return NextResponse.json({ error: 'كلمتا المرور غير متطابقتين' }, { status: 400 });
        }

        if (newPassword.length < 8) {
            return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' }, { status: 400 });
        }

        const validation = await validateResetToken(token);
        if (!validation.valid || !validation.token) {
            return NextResponse.json({ error: validation.error || 'الرمز غير صالح' }, { status: 400 });
        }

        const { id: tokenId, userId } = validation.token;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, name: true, email: true },
        });

        if (!user) {
            return NextResponse.json({ error: 'المستخدم غير موجود' }, { status: 404 });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password and mark token as used in a transaction
        await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { password: hashedPassword },
            }),
            prisma.passwordResetToken.update({
                where: { id: tokenId },
                data: { usedAt: new Date() },
            }),
        ]);

        // Send confirmation email
        if (resend) {
            const html = await render(PasswordChangedEmail({
                userName: user.name || 'المستخدم',
                changedAt: new Date().toLocaleString('ar-IQ', { timeZone: 'Asia/Baghdad' }),
            }));
            await resend.emails.send({
                from: getEmailFrom(),
                to: user.email,
                subject: 'تم تغيير كلمة مرورك',
                html,
            });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
    }
}
