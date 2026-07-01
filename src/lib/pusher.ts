/**
 * Pusher real-time helper — graceful fallback when not configured.
 *
 * Server setup: npm install pusher pusher-js
 * Add to .env:
 *   PUSHER_APP_ID=...
 *   NEXT_PUBLIC_PUSHER_KEY=...
 *   PUSHER_SECRET=...
 *   NEXT_PUBLIC_PUSHER_CLUSTER=eu
 *   PUSHER_CLUSTER=eu
 */

// ── Server-side trigger (Node.js only) ───────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pusherServer: any = null;

export async function triggerPusher(channel: string, event: string, data: object) {
    if (
        !process.env.PUSHER_APP_ID ||
        !process.env.NEXT_PUBLIC_PUSHER_KEY ||
        !process.env.PUSHER_SECRET ||
        !process.env.PUSHER_CLUSTER
    ) {
        return; // Not configured — silently skip
    }
    try {
        if (!_pusherServer) {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const Pusher = require('pusher');
            _pusherServer = new Pusher({
                appId: process.env.PUSHER_APP_ID,
                key: process.env.NEXT_PUBLIC_PUSHER_KEY,
                secret: process.env.PUSHER_SECRET,
                cluster: process.env.PUSHER_CLUSTER,
                useTLS: true,
            });
        }
        await _pusherServer.trigger(channel, event, data);
    } catch {
        // Never crash a server action because of Pusher
    }
}

// ── Client-side subscription ──────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _pusherClient: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getPusherClient(): any | null {
    if (typeof window === 'undefined') return null;
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!key || !cluster) return null;

    if (!_pusherClient) {
        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const PusherJs = require('pusher-js');
            _pusherClient = new PusherJs(key, { cluster });
        } catch {
            return null;
        }
    }
    return _pusherClient;
}
