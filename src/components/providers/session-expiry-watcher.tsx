'use client';

import { useEffect } from 'react';
import { signOut } from 'next-auth/react';

const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

export function SessionExpiryWatcher() {
    useEffect(() => {
        const t = setTimeout(() => {
            signOut({ callbackUrl: '/login' });
        }, SESSION_DURATION_MS);
        return () => clearTimeout(t);
    }, []);

    return null;
}
