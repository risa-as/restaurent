import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { NextResponse, NextRequest } from 'next/server';

const { auth } = NextAuth(authConfig);

// ---------------------------------------------------------------------------
// T063 — Rate Limiting (sliding window, in-memory per Edge instance)
// ---------------------------------------------------------------------------
interface RateLimitEntry {
    count: number;
    resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically (every ~500 requests)
let cleanupCounter = 0;
function maybeCleanup() {
    if (++cleanupCounter < 500) return;
    cleanupCounter = 0;
    const now = Date.now();
    const keys = Array.from(rateLimitStore.keys());
    for (const key of keys) {
        const entry = rateLimitStore.get(key);
        if (entry && now > entry.resetAt) rateLimitStore.delete(key);
    }
}

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
    maybeCleanup();
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetAt) {
        rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
        return true;
    }

    if (entry.count >= limit) return false;

    entry.count++;
    return true;
}

// ---------------------------------------------------------------------------
// Durable rate limiting for AUTH endpoints (T15). The in-memory Map above is
// per Edge instance — fine for the high-traffic general limits, but login/2FA
// brute-force protection must survive across instances. When an Upstash-
// compatible REST store is configured (Vercel KV / Upstash Redis env vars),
// auth counters live there; otherwise we fall back to the per-instance Map.
// Only auth paths pay the extra network hop — general limits stay in-memory.
// ---------------------------------------------------------------------------
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function checkRateLimitDurable(key: string, limit: number, windowMs: number): Promise<boolean> {
    if (!KV_URL || !KV_TOKEN) return checkRateLimit(key, limit, windowMs);
    try {
        // Fixed window: INCR + set expiry only when the key is new (NX).
        const res = await fetch(`${KV_URL}/pipeline`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify([
                ['INCR', key],
                ['PEXPIRE', key, windowMs, 'NX'],
            ]),
        });
        if (!res.ok) throw new Error(`KV ${res.status}`);
        const data = (await res.json()) as Array<{ result?: number }>;
        const count = Number(data?.[0]?.result ?? 0);
        if (count < 1) throw new Error('KV bad INCR result');
        return count <= limit;
    } catch {
        // Store unreachable → degrade to per-instance limiting rather than
        // blocking all logins (availability over strictness for a limiter).
        return checkRateLimit(key, limit, windowMs);
    }
}

function getClientIP(req: NextRequest): string {
    return (
        req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        req.headers.get('x-real-ip') ||
        'unknown'
    );
}

function isLocalRequest(req: NextRequest): boolean {
    const host = req.headers.get('host') || '';
    const ip = getClientIP(req);
    return (
        host.includes('localhost') ||
        ip === '127.0.0.1' ||
        ip === '::1' ||
        // An absent client IP only bypasses rate limiting OUTSIDE production —
        // in production a direct connection without x-forwarded-for would
        // otherwise skip every limit.
        (ip === 'unknown' && process.env.NODE_ENV !== 'production')
    );
}

function rateLimitResponse(retryAfterMs: number): NextResponse {
    return new NextResponse(
        JSON.stringify({ error: 'Too Many Requests — حد الطلبات تجاوز' }),
        {
            status: 429,
            headers: {
                'Content-Type': 'application/json',
                'Retry-After': String(Math.ceil(retryAfterMs / 1000)),
            },
        }
    );
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export default auth(async (req) => {
    const ip = getClientIP(req);
    const pathname = req.nextUrl.pathname;

    // ---------------------------------------------------------------------------
    // CORS check for /api/* routes
    // ---------------------------------------------------------------------------
    if (pathname.startsWith('/api/')) {
        const origin = req.headers.get('origin');
        const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';
        if (origin) {
            const allowedOrigins = [
                `https://${rootDomain}`,
                `http://${rootDomain}`,
            ];
            // Allow any localhost port — covers Electron standalone server on dynamic ports
            const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
            const isAllowedOrigin = isLocalhost ||
                allowedOrigins.some(o => origin === o) ||
                origin.endsWith(`.${rootDomain}`);

            if (!isAllowedOrigin) {
                return new NextResponse(JSON.stringify({ error: 'CORS not allowed' }), {
                    status: 403,
                    headers: { 'Content-Type': 'application/json' },
                });
            }
        }
    }

    // Skip rate limiting entirely for local development / desktop app
    if (isLocalRequest(req)) {
        // fall through to auth checks below
    } else {
        // 1. Strict limit on auth/login endpoints: 10 attempts / minute
        //    (durable store when configured — survives multi-instance/serverless)
        if ((pathname.startsWith('/api/auth') || pathname === '/login') && !pathname.startsWith('/api/auth/2fa')) {
            if (!(await checkRateLimitDurable(`auth:${ip}`, 10, 60_000))) {
                return rateLimitResponse(60_000);
            }
        }

        // 1b. Separate 2FA limit: 20 attempts / 5 minutes
        if (pathname.startsWith('/api/auth/2fa')) {
            if (!(await checkRateLimitDurable(`2fa:${ip}`, 20, 5 * 60_000))) {
                return rateLimitResponse(5 * 60_000);
            }
        }

        // 2. General API limit: 120 requests / minute
        if (pathname.startsWith('/api/')) {
            if (!checkRateLimit(`api:${ip}`, 120, 60_000)) {
                return rateLimitResponse(60_000);
            }
        }

        // 3. General page limit: 200 requests / minute
        if (!checkRateLimit(`page:${ip}`, 200, 60_000)) {
            return rateLimitResponse(60_000);
        }
    }

    // ---------------------------------------------------------------------------
    // T147: 2FA enforcement
    // ---------------------------------------------------------------------------
    const is2FAPage = pathname.startsWith('/auth/2fa');
    const session = (req as any).auth;
    if (session?.user) {
        const requires2FA = (session as any).requires2FA || session?.user?.requires2FA;
        const twoFactorEnabled = (session as any).twoFactorEnabled || session?.user?.twoFactorEnabled;
        const role = session.user?.role;

        // SUPER_ADMIN without 2FA → forced setup
        // Exclude /api/auth/* so the 2FA setup/verify API calls are not redirected
        if (role === 'SUPER_ADMIN' && !twoFactorEnabled && !is2FAPage && !pathname.startsWith('/api/auth')) {
            return NextResponse.redirect(new URL('/auth/2fa?setup=true', req.url));
        }

        // User with pending 2FA verification
        if (requires2FA && !is2FAPage && !pathname.startsWith('/api/auth')) {
            return NextResponse.redirect(new URL('/auth/2fa', req.url));
        }
    }

    // ---------------------------------------------------------------------------
    // Tenant subdomain resolution
    // ---------------------------------------------------------------------------
    const hostname = req.headers.get('host') || '';
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000';

    const isLocalhost = hostname.includes('localhost');
    const slug = isLocalhost
        ? hostname.replace(`.localhost:3000`, '').replace('localhost:3000', '')
        : hostname.replace(`.${rootDomain}`, '');

    const isRootDomain = slug === '' || slug === 'www' || slug === 'app' || slug === 'api';

    const requestHeaders = new Headers(req.headers);
    // Strip any client-supplied x-tenant-id — it is set authoritatively below only when resolved
    requestHeaders.delete('x-tenant-id');
    requestHeaders.set('x-tenant-slug', slug);
    requestHeaders.set('x-is-root-domain', isRootDomain ? 'true' : 'false');
    requestHeaders.set('x-pathname', pathname);

    return NextResponse.next({
        request: { headers: requestHeaders },
    });
});

export const config = {
    matcher: ['/((?!_next/static|_next/image|.*\\.png$|.*\\.ico$).*)'],
};
