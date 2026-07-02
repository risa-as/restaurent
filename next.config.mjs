import withPWA from '@ducanh2912/next-pwa';

const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
const isDev = process.env.NODE_ENV === 'development';

const cspHeader = [
    "default-src 'self'",
    // 'unsafe-eval' is needed only by dev tooling (react-refresh) — the
    // production bundle runs without it, so don't ship it in production CSP.
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://js.pusher.com https://cdn.jsdelivr.net`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://utfs.io https://*.supabase.co https://*.cloudinary.com https://*.basemaps.cartocdn.com https://*.tile.openstreetmap.org https://tile.openstreetmap.org",
    `connect-src 'self' wss://*.pusher.com https://*.pusher.com https://api.stripe.com https://*.${rootDomain} https://*.uploadthing.com https://uploadthing.com https://*.ufs.sh https://*.utfs.io https://nominatim.openstreetmap.org`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: process.env.ELECTRON_BUILD === '1' ? 'standalone' : undefined,
    experimental: {
        // Dynamic pages (force-dynamic) should never be served from the client Router Cache.
        // Without this, switching branches and navigating to another page serves stale RSC payload.
        staleTimes: {
            dynamic: 0,
        },
    },
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'utfs.io',
                pathname: '**',
            },
        ],
    },
    typescript: {
        // Type errors MUST fail the build — they hide real bugs (e.g. a page that
        // queried a non-existent Prisma model). Keep this false. Run `npx tsc --noEmit`.
        ignoreBuildErrors: false,
    },
    eslint: {
        // Codebase is lint-clean (0 errors). Keep lint blocking the build so new
        // unused-vars / unsafe patterns are caught before shipping.
        ignoreDuringBuilds: false,
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    { key: 'Content-Security-Policy', value: cspHeader },
                    { key: 'X-Content-Type-Options', value: 'nosniff' },
                    { key: 'X-Frame-Options', value: 'DENY' },
                    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                ],
            },
            {
                // Management pages — never cache (needs fresh data always)
                source: '/(dashboard|inventory|accountant|superadmin)(.*)',
                headers: [
                    { key: 'Cache-Control', value: 'no-store, must-revalidate' },
                ],
            },
            {
                // Operational pages — allow SW to cache for offline support
                source: '/(captain|cashier|kitchen|waiter|delivery)(.*)',
                headers: [
                    { key: 'Cache-Control', value: 'no-cache' },
                ],
            },
        ];
    },
};

// NOTE: with @ducanh2912/next-pwa, runtimeCaching MUST live inside
// workboxOptions — a top-level runtimeCaching key is silently ignored (the
// previous config shipped only the plugin defaults). Matchers are functions:
// Workbox tests RegExp patterns against the FULL URL (https://…), so
// path-anchored regexes like /^\/api\// can never match.
const pwaConfig = withPWA({
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
    register: true,
    workboxOptions: {
        skipWaiting: true,
        clientsClaim: true,
        runtimeCaching: [
            {
                // Management pages — always fresh, never served from SW cache
                urlPattern: ({ url, sameOrigin, request }) =>
                    sameOrigin &&
                    request.destination === 'document' &&
                    /^\/(dashboard|inventory|accountant|superadmin)(\/|$)/.test(url.pathname),
                handler: 'NetworkOnly',
            },
            {
                // Public menu API — cache for QR customers with flaky connections
                urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/api/menu/'),
                handler: 'NetworkFirst',
                options: {
                    cacheName: 'menu-api',
                    networkTimeoutSeconds: 5,
                    expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
                },
            },
            {
                urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/api/qr/order-status'),
                handler: 'NetworkFirst',
                options: {
                    cacheName: 'qr-status',
                    networkTimeoutSeconds: 5,
                    expiration: { maxEntries: 30, maxAgeSeconds: 10 * 60 },
                },
            },
            {
                // Operational data endpoints — short-lived offline fallback
                // (useOfflineData's IndexedDB cache remains the primary fallback)
                urlPattern: ({ url, sameOrigin }) =>
                    sameOrigin && /^\/api\/(kitchen|cashier|captain|waiter|delivery)\//.test(url.pathname),
                handler: 'NetworkFirst',
                options: {
                    cacheName: 'operational-api',
                    networkTimeoutSeconds: 5,
                    expiration: { maxEntries: 100, maxAgeSeconds: 5 * 60 },
                },
            },
            {
                // Other API calls (auth, offline sync, server actions…) — never cache
                urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/api/'),
                handler: 'NetworkOnly',
            },
            {
                // Operational page shells — a hard reload while offline still gets
                // the app shell, which then hydrates from the IndexedDB page cache
                urlPattern: ({ url, sameOrigin, request }) =>
                    sameOrigin &&
                    request.destination === 'document' &&
                    /^\/(captain|cashier|kitchen|waiter|delivery)(\/|$)/.test(url.pathname),
                handler: 'NetworkFirst',
                options: {
                    cacheName: 'operational-pages',
                    networkTimeoutSeconds: 8,
                    expiration: { maxEntries: 30, maxAgeSeconds: 24 * 60 * 60 },
                },
            },
            {
                // Static assets (images, fonts)
                urlPattern: ({ url }) => /\.(png|jpg|jpeg|svg|gif|webp|ico|woff|woff2)$/i.test(url.pathname),
                handler: 'CacheFirst',
                options: {
                    cacheName: 'static-assets',
                    expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
                },
            },
            {
                // Next.js build assets (immutable, hashed filenames)
                urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/_next/static/'),
                handler: 'CacheFirst',
                options: {
                    cacheName: 'next-static',
                    expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
                },
            },
            {
                // Remaining same-origin pages (login, landing…)
                urlPattern: ({ url, sameOrigin, request }) =>
                    sameOrigin && request.destination === 'document' && !url.pathname.startsWith('/api/'),
                handler: 'NetworkFirst',
                options: {
                    cacheName: 'pages',
                    networkTimeoutSeconds: 8,
                    expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
                },
            },
        ],
    },
});

export default pwaConfig(nextConfig);
