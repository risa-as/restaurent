'use server';

import { signIn, signOut as authSignOut } from '@/lib/auth';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';

// Authenticate user
export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    let redirectTo = '/dashboard';

    try {
        const email = formData.get('email') as string;

        // Dynamic import to avoid edge runtime issues if this file is shared (though 'use server' usually runs on node)
        // Using require or import based on environment? Next.js server actions are Node.
        // We import prisma from lib.
        const { prisma } = await import('@/lib/prisma');
        const user = await prisma.user.findUnique({
            where: { email },
            select: { role: true, email: true }
        });

        if (user) {
            console.log('[Authenticate Action] Found user:', user.email, 'Role:', user.role);
            switch (user.role as any) {
                case 'STORE_MANAGER':
                    redirectTo = '/inventory';
                    break;
                case 'CASHIER':
                    redirectTo = '/cashier';
                    break;
                case 'CHEF':
                    redirectTo = '/kitchen';
                    break;
                case 'CAPTAIN':
                    redirectTo = '/captain';
                    break;
                case 'WAITER':
                    redirectTo = '/waiter';
                    break;
                case 'DRIVER':
                case 'DELIVERY_MANAGER':
                    redirectTo = '/delivery';
                    break;
                case 'ACCOUNTANT':
                    redirectTo = '/accountant';
                    break;
                case 'ADMIN':
                case 'MANAGER':
                    redirectTo = '/dashboard';
                    break;
                default:
                    redirectTo = '/dashboard';
            }
        } else {
            console.log('[Authenticate Action] User not found during pre-fetch');
        }

        console.log('[Authenticate Action] Calling signIn with redirectTo:', redirectTo);

        // Use redirect: false to prevent NextAuth from managing the redirect.
        // We will handle it manually to ensure it goes where we want.
        const result = await signIn('credentials', formData, { redirect: false } as any);

        console.log('[Authenticate Action] SignIn result:', result);

        // If we get here, it means no error was thrown (if redirect: false works as expected in this version)
        // or we need to check the result. 
        // In some versions, it returns { ok: true, url: ... } or { error: ... }

        console.log('[Authenticate Action] Manually redirecting to:', redirectTo);
        redirect(redirectTo);

    } catch (error) {
        const err = error as any;

        // Next.js handles redirects by throwing an error with code 'NEXT_REDIRECT' or message 'NEXT_REDIRECT'
        if (err.message === 'NEXT_REDIRECT' || (typeof err.digest === 'string' && err.digest.startsWith('NEXT_REDIRECT'))) {

            // Extract the target URL from the error digest to check if it's an error redirect
            // Format is usually: NEXT_REDIRECT;type;url;status
            const redirectUrl = err.digest.split(';')[2] || '';
            console.log('[Authenticate Action] Caught redirect to:', redirectUrl);

            // If the redirect URL contains an error parameter (e.g. ?error=CredentialsSignin), it means login failed.
            // We should let this redirect happen so the user sees the error message.
            if (redirectUrl.includes('error=') || redirectUrl.includes('code=')) {
                console.log('[Authenticate Action] Passing through error redirect');
                throw error;
            }

            // If it's a "success" redirect (e.g. to /login or /dashboard default), we override it.
            // This fixes the issue where NextAuth or Middleware forces the user back to /login.
            console.log('[Authenticate Action] Overriding default redirect. Forcing:', redirectTo);
            redirect(redirectTo);
        }

        if (error instanceof AuthError) {
            // If error has a redirect property, we let it pass
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'بيانات الدخول غير صحيحة';
                default:
                    return 'حدث خطأ ما';
            }
        }
        throw error;
    }
}

// Sign out user
export async function signOut() {
    await authSignOut({ redirectTo: '/login' });
}
