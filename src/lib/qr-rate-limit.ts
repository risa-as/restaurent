/**
 * Cross-instance rate limiter for the PUBLIC endpoints (QR order creation,
 * customer registration, feedback).
 *
 * Public, unauthenticated endpoints are an abuse/spam surface: anything that
 * presents a `qr_session` cookie can create real kitchen orders. We throttle by
 * BOTH the session cookie (cheap to rotate, but stops the common case) and the
 * client IP (caps a cookie-rotating bot).
 *
 * State lives in the `RateLimit` table (Neon/Postgres) — NOT in-memory — so the
 * limit holds across multiple serverless instances on Vercel. The counter is
 * incremented atomically via a single `INSERT ... ON CONFLICT` upsert that also
 * resets the window when it has expired. See PRELAUNCH-AUDIT.md → section ب-3.
 */
import { prisma } from '@/lib/prisma';

/**
 * Returns true if the request is allowed, false if the limit is exceeded.
 *
 * Fails OPEN (returns true) if the datastore is unreachable: a transient DB
 * blip should never block a paying customer from ordering. Abuse during such a
 * window is bounded and preferable to a hard outage on the order path.
 */
export async function qrRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
    const resetAt = new Date(Date.now() + windowMs);
    try {
        // Atomic increment-or-reset. When the stored window has already expired
        // the row is reset to count=1 with a fresh resetAt; otherwise count++.
        const rows = await prisma.$queryRaw<{ count: number }[]>`
            INSERT INTO "RateLimit" ("key", "count", "resetAt")
            VALUES (${key}, 1, ${resetAt})
            ON CONFLICT ("key") DO UPDATE SET
                "count" = CASE WHEN "RateLimit"."resetAt" < now() THEN 1 ELSE "RateLimit"."count" + 1 END,
                "resetAt" = CASE WHEN "RateLimit"."resetAt" < now() THEN ${resetAt} ELSE "RateLimit"."resetAt" END
            RETURNING "count"
        `;
        const count = Number(rows[0]?.count ?? 1);
        return count <= limit;
    } catch (err) {
        console.error('[qrRateLimit] datastore error, failing open:', err);
        return true;
    }
}

export function getRequestIp(headers: Headers): string {
    return (
        headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        headers.get('x-real-ip') ||
        'unknown'
    );
}
