import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateResetToken } from '@/lib/password-reset';
import { resend, getEmailFrom } from '@/lib/resend';
import { render } from '@react-email/components';
import { PasswordResetEmail } from '@/emails/PasswordResetEmail';

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX = 3;

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();
        if (!email || typeof email !== 'string') {
            return NextResponse.json({ success: true }); // Always return success to prevent email enumeration
        }

        const normalizedEmail = email.toLowerCase().trim();

        // Rate limit: check LoginAttempt table for recent forgot-password requests
        const recentAttempts = await prisma.loginAttempt.count({
            where: {
                email: normalizedEmail,
                createdAt: { gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
            },
        });

        if (recentAttempts >= RATE_LIMIT_MAX) {
            // Still return success to prevent enumeration, but don't send
            return NextResponse.json({ success: true });
        }

        // Record the attempt
        await prisma.loginAttempt.create({
            data: { email: normalizedEmail, ipAddress: req.headers.get('x-forwarded-for') || 'unknown', success: false },
        });

        const user = await prisma.user.findFirst({
            where: { email: normalizedEmail },
            select: { id: true, name: true, email: true },
        });

        if (user) {
            // Expire any existing tokens
            await prisma.passwordResetToken.updateMany({
                where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
                data: { expiresAt: new Date() }, // expire immediately
            });

            const { raw, hash } = generateResetToken();
            await prisma.passwordResetToken.create({
                data: {
                    tokenHash: hash,
                    userId: user.id,
                    expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
                },
            });

            const rootDomain = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
            const resetUrl = `${rootDomain}/reset-password?token=${raw}`;

            const html = await render(PasswordResetEmail({ userName: user.name || 'المستخدم', resetUrl }));

            if (resend) {
                await resend.emails.send({
                    from: getEmailFrom(),
                    to: user.email,
                    subject: 'إعادة تعيين كلمة المرور',
                    html,
                });
            }
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json({ success: true }); // Always success to prevent leaking info
    }
}
