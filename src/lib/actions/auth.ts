'use server';

import { signIn, signOut as authSignOut } from '@/lib/auth';
import { AuthError } from 'next-auth';

// Authenticate user
export async function authenticate(
    prevState: string | undefined,
    formData: FormData,
) {
    try {
        await signIn('credentials', formData);
    } catch (error) {
        if (error instanceof AuthError) {
            switch (error.type) {
                case 'CredentialsSignin':
                    return 'Invalid credentials.';
                default:
                    return 'Something went wrong.';
            }
        }
        throw error;
    }
}

// Sign out user
export async function signOut() {
    await authSignOut({ redirectTo: '/login' });
}
