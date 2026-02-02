import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
    pages: {
        signIn: '/login',
    },
    callbacks: {
        authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const isOnDashboard = nextUrl.pathname.startsWith('/dashboard');
            const isOnCashier = nextUrl.pathname.startsWith('/cashier');
            const isOnKitchen = nextUrl.pathname.startsWith('/kitchen');
            const isOnCaptain = nextUrl.pathname.startsWith('/captain');
            const isOnWaiter = nextUrl.pathname.startsWith('/waiter');
            const isOnDelivery = nextUrl.pathname.startsWith('/delivery');

            const isProtected = isOnDashboard || isOnCashier || isOnKitchen || isOnCaptain || isOnWaiter || isOnDelivery;

            // Console log for debugging
            console.log(`[Middleware] Path: ${nextUrl.pathname}, LoggedIn: ${isLoggedIn}, Role: ${(auth?.user as any)?.role}`);

            if (isProtected) {
                if (isLoggedIn) return true;
                return false; // Redirect unauthenticated users to login page
            } else if (isLoggedIn) {
                const role = (auth?.user as any)?.role;
                if (role === 'CASHIER' && !isOnCashier) return Response.redirect(new URL('/cashier', nextUrl));
                if (role === 'CHEF' && !isOnKitchen) return Response.redirect(new URL('/kitchen', nextUrl));
                if (role === 'CAPTAIN' && !isOnCaptain) return Response.redirect(new URL('/captain', nextUrl));
                if (role === 'WAITER' && !isOnWaiter) return Response.redirect(new URL('/waiter', nextUrl));
                if ((role === 'DRIVER' || role === 'DELIVERY_MANAGER') && !isOnDelivery) return Response.redirect(new URL('/delivery', nextUrl));

                // Admin/Manager stay on dashboard
                if ((role === 'ADMIN' || role === 'MANAGER') && !isOnDashboard) {
                    return Response.redirect(new URL('/dashboard', nextUrl));
                }
            }
            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                token.role = user.role;
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                // Ensure role is treated correctly
                session.user.role = token.role as "ADMIN" | "MANAGER" | "WAITER" | "CHEF" | "DRIVER" | "CASHIER" | "CAPTAIN" | "DELIVERY_MANAGER";
                session.user.id = token.id as string;
            }
            return session;
        },
    },
    providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;
