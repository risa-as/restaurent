import NextAuth from 'next-auth';
import { authConfig } from './auth.config';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { prisma } from './prisma';
import bcrypt from 'bcryptjs';

const LOCKOUT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_FAILURES = 10;

async function getUser(email: string) {
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        return user;
    } catch (error) {
        console.error('Failed to fetch user:', error);
        throw new Error('Failed to fetch user.');
    }
}

async function isAccountLocked(email: string): Promise<boolean> {
    const count = await prisma.loginAttempt.count({
        where: {
            email,
            success: false,
            createdAt: { gte: new Date(Date.now() - LOCKOUT_WINDOW_MS) },
        },
    });
    return count >= MAX_FAILURES;
}

async function recordLoginAttempt(email: string, success: boolean, ipAddress = 'unknown') {
    await prisma.loginAttempt.create({
        data: { email, success, ipAddress },
    });
}


export const { auth, signIn, signOut, handlers } = NextAuth({
    secret: process.env.AUTH_SECRET,
    // NOTE: trustHost is provided by authConfig (spread below). It is required
    // because the self-hosted / desktop app runs on localhost (and dynamic
    // Electron ports); without it production throws UntrustedHost on every call.
    session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 }, // 30 days — desktop local app
    ...authConfig,
    providers: [
        Credentials({
            async authorize(credentials, request) {
                const parsedCredentials = z
                    .object({ email: z.string().email(), password: z.string().min(6) })
                    .safeParse(credentials);

                if (!parsedCredentials.success) return null;

                const { email, password } = parsedCredentials.data;
                const ipAddress = (request as any)?.headers?.get?.('x-forwarded-for') || 'unknown';

                // Check lockout before attempting password verification
                if (await isAccountLocked(email)) {
                    // Signal lockout via thrown error (NextAuth maps this to errorMessage)
                    throw new Error('الحساب مقفل مؤقتاً بسبب محاولات دخول متكررة. حاول بعد 15 دقيقة.');
                }

                const user = await getUser(email);
                if (!user) {
                    await recordLoginAttempt(email, false, ipAddress);
                    return null;
                }

                const passwordsMatch = await bcrypt.compare(password, user.password);

                if (passwordsMatch) {
                    // Clean up failed attempts on success
                    await prisma.loginAttempt.deleteMany({
                        where: { email, success: false },
                    });
                    await recordLoginAttempt(email, true, ipAddress);
                    return {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        tenantId: user.tenantId,
                        branchId: user.branchId,
                        twoFactorEnabled: user.twoFactorEnabled ?? false,
                        requires2FA: user.twoFactorEnabled ?? false,
                    };
                }

                await recordLoginAttempt(email, false, ipAddress);
                return null;
            },
        }),
    ],
});
