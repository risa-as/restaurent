/**
 * Run with: npx tsx prisma/setup-superadmin-2fa-email.ts
 *
 * Uses direct (unpooled) Neon URL with retry — handles sleeping DB.
 */
import { PrismaClient } from '@prisma/client';

// Direct URL avoids the pooler and properly wakes sleeping Neon DB
const DIRECT_URL =
    'postgresql://neondb_owner:npg_6Grcm3ZtbaEs@ep-tiny-field-ahsq3clm.c-3.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function createClientWithRetry(maxAttempts = 5): Promise<PrismaClient> {
    for (let i = 1; i <= maxAttempts; i++) {
        const prisma = new PrismaClient({ datasources: { db: { url: DIRECT_URL } } });
        try {
            process.stdout.write(`Connecting (attempt ${i}/${maxAttempts})... `);
            // Ping DB to confirm connection
            await prisma.$queryRaw`SELECT 1`;
            console.log('OK');
            return prisma;
        } catch (e: any) {
            console.log(`failed — ${e.message}`);
            await prisma.$disconnect().catch(() => {});
            if (i < maxAttempts) {
                console.log('Waiting 5 seconds for DB to wake up...');
                await new Promise(r => setTimeout(r, 5000));
            }
        }
    }
    throw new Error('Could not connect after ' + maxAttempts + ' attempts');
}

async function main() {
    const prisma = await createClientWithRetry();

    try {
        // 1. Add column (safe — does nothing if already exists)
        await prisma.$executeRaw`ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "twoFactorEmail" TEXT`;
        console.log('✓ Column twoFactorEmail ready');

        // 2. Set 2FA display email for SUPER_ADMIN
        const updated = await prisma.$executeRaw`
            UPDATE "User"
            SET "twoFactorEmail" = 'ayadqaid12345@gmail.com'
            WHERE role = 'SUPER_ADMIN'
        `;
        console.log(`✓ Updated ${updated} SUPER_ADMIN account(s)`);

        // 3. Verify
        const rows = await prisma.$queryRaw<Array<{
            email: string;
            twoFactorEmail: string | null;
            twoFactorEnabled: boolean;
        }>>`
            SELECT email, "twoFactorEmail", "twoFactorEnabled"
            FROM "User" WHERE role = 'SUPER_ADMIN'
        `;

        console.log('\nResult:');
        for (const r of rows) {
            console.log(`  Login email    : ${r.email}`);
            console.log(`  2FA label email: ${r.twoFactorEmail ?? '(not set)'}`);
            console.log(`  2FA enabled    : ${r.twoFactorEnabled}`);
        }
        console.log('\n✓ Done! Restart dev server then visit /auth/2fa?setup=true');
    } finally {
        await prisma.$disconnect();
    }
}

main().catch(e => { console.error('\nFailed:', e.message); process.exit(1); });
