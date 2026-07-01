-- Cross-instance rate-limit buckets for public endpoints (QR ordering,
-- customer registration, feedback). Replaces the in-memory limiter that did
-- not hold across multiple serverless instances. See PRELAUNCH-AUDIT.md → ب-3.
-- Written idempotently (IF NOT EXISTS) so it is safe regardless of how the
-- baseline schema was first applied.
CREATE TABLE IF NOT EXISTS "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

CREATE INDEX IF NOT EXISTS "RateLimit_resetAt_idx" ON "RateLimit"("resetAt");
