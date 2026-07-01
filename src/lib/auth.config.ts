import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
    // Trust the request host — the middleware's NextAuth instance needs this too,
    // otherwise production throws UntrustedHost on every request.
    trustHost: true,
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
            const isOnInventory = nextUrl.pathname.startsWith('/inventory');
            const isOnSuperAdmin = nextUrl.pathname.startsWith('/superadmin');

            const isOnMenu = nextUrl.pathname.startsWith('/menu');
            const isOnCustomerOrder = nextUrl.pathname.match(/^\/[^/]+\/order/);
            const isPublicApi = nextUrl.pathname.startsWith('/api/qr/') || nextUrl.pathname.startsWith('/api/auth/forgot-password') || nextUrl.pathname.startsWith('/api/auth/reset-password');
            const isOn2FA = nextUrl.pathname.startsWith('/auth/2fa');
            const isProtected = isOnDashboard || isOnCashier || isOnKitchen || isOnCaptain || isOnWaiter || isOnDelivery || isOnInventory || isOnSuperAdmin;
            const isApiRoute = nextUrl.pathname.startsWith('/api/');

            // Public pages — never redirect even if logged in
            // /auth/2fa must be accessible to complete 2FA setup/verify (no redirect away from it)
            if (isOnMenu || isOnCustomerOrder || isPublicApi || isOn2FA) return true;

            if (isProtected || isApiRoute) {
                if (!isLoggedIn) return false; // Redirect unauthenticated users to login page
                // Block non-superadmins from /superadmin pages — otherwise the page's
                // requireSuperAdmin() throws an unhandled error and crashes the render.
                if (isOnSuperAdmin && !isApiRoute && auth?.user?.role !== 'SUPER_ADMIN') {
                    return Response.redirect(new URL('/', nextUrl));
                }
                return true;
            } else if (isLoggedIn) {
                const role = auth?.user?.role;
                if (role === 'SUPER_ADMIN' && !isOnSuperAdmin) return Response.redirect(new URL('/superadmin', nextUrl));
                if (role === 'CASHIER' && !isOnCashier) return Response.redirect(new URL('/cashier', nextUrl));
                if (role === 'CHEF' && !isOnKitchen) return Response.redirect(new URL('/kitchen', nextUrl));
                if (role === 'CAPTAIN' && !isOnCaptain) return Response.redirect(new URL('/captain', nextUrl));
                if (role === 'WAITER' && !isOnWaiter) return Response.redirect(new URL('/waiter', nextUrl));
                if ((role === 'DRIVER' || role === 'DELIVERY_MANAGER') && !isOnDelivery) return Response.redirect(new URL('/delivery', nextUrl));
                if (role === 'STORE_MANAGER' && !isOnInventory) return Response.redirect(new URL('/inventory', nextUrl));
                if (role === 'ACCOUNTANT' && !isOnDashboard) return Response.redirect(new URL('/dashboard/accountant/reports', nextUrl));

                // Admin/Manager stay on dashboard
                if ((role === 'ADMIN' || role === 'MANAGER') && !isOnDashboard) {
                    return Response.redirect(new URL('/dashboard', nextUrl));
                }
            }
            return true;
        },
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.role = user.role;
                token.id = user.id;
                // @ts-ignore
                token.tenantId = user.tenantId;
                // @ts-ignore
                token.branchId = (user as any).branchId;
                // @ts-ignore
                token.requires2FA = (user as any).requires2FA ?? false;
                // @ts-ignore
                token.twoFactorEnabled = (user as any).twoFactorEnabled ?? false;
            }
            if (trigger === 'update' && session?.tenantSlug) {
                token.tenantSlug = session.tenantSlug;
            }
            if (trigger === 'update' && session?.twoFactorVerified) {
                token.requires2FA = false;
            }
            if (trigger === 'update' && session?.twoFactorEnabled === true) {
                // @ts-ignore
                token.twoFactorEnabled = true;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.role = token.role as string;
                session.user.id = token.id as string;
                // @ts-ignore
                session.user.tenantId = token.tenantId as string | undefined;
                // @ts-ignore
                session.user.branchId = token.branchId as string | undefined;
                // @ts-ignore
                session.tenantSlug = token.tenantSlug as string | undefined;
                // @ts-ignore
                session.user.twoFactorEnabled = token.twoFactorEnabled as boolean | undefined;
                // @ts-ignore
                session.user.requires2FA = token.requires2FA as boolean | undefined;
            }
            return session;
        },
    },
    providers: [], // Add providers with an empty array for now
} satisfies NextAuthConfig;
