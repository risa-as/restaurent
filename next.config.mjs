import withPWA from '@ducanh2912/next-pwa';

const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';

const cspHeader = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.pusher.com https://cdn.jsdelivr.net",
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

const pwaConfig = withPWA({
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
    register: true,
    skipWaiting: true,
    runtimeCaching: [
        {
            urlPattern: /^\/_next\/static\/.*/i,
            handler: 'CacheFirst',
            options: {
                cacheName: 'next-static',
                expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
        },
        {
            urlPattern: /^\/api\/menu\/.*/i,
            handler: 'NetworkFirst',
            options: {
                cacheName: 'menu-api',
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
            },
        },
        {
            urlPattern: /^\/api\/qr\/order-status.*/i,
            handler: 'NetworkFirst',
            options: {
                cacheName: 'qr-status',
                networkTimeoutSeconds: 5,
            },
        },
        {
            // Operational API endpoints — cache for offline reads
            urlPattern: /^\/api\/(kitchen|cashier|captain|waiter|delivery)\/.*/i,
            handler: 'NetworkFirst',
            options: {
                cacheName: 'operational-api',
                networkTimeoutSeconds: 5,
                expiration: { maxEntries: 100, maxAgeSeconds: 5 * 60 },
            },
        },
        {
            // Operational pages — NetworkFirst with offline fallback
            urlPattern: /^\/(captain|cashier|kitchen|waiter|delivery)(\/.*)?$/i,
            handler: 'NetworkFirst',
            options: {
                cacheName: 'operational-pages',
                networkTimeoutSeconds: 8,
                expiration: { maxEntries: 30, maxAgeSeconds: 24 * 60 * 60 },
            },
        },
        {
            // Management pages — always fresh (no offline support needed)
            urlPattern: /^\/(dashboard|inventory|accountant|superadmin)(\/.*)?$/i,
            handler: 'NetworkOnly',
            options: {
                cacheName: 'management-pages',
            },
        },
        {
            // Static assets (images, fonts)
            urlPattern: /\.(png|jpg|jpeg|svg|gif|webp|ico|woff|woff2)$/i,
            handler: 'CacheFirst',
            options: {
                cacheName: 'static-assets',
                expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
        },
        {
            // Other pages (login, landing, etc.)
            urlPattern: /^\/(?!api\/).*/i,
            handler: 'StaleWhileRevalidate',
            options: {
                cacheName: 'pages',
                expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
            },
        },
    ],
});

export default pwaConfig(nextConfig);
