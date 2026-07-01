/**
 * One-time backfill script: populate Bill.tenantId from Bill.order.tenantId
 * Run once after schema migration: npx tsx prisma/backfill-bill-tenant.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Bill.tenantId backfill...');

    const billsWithoutTenant = await prisma.bill.findMany({
        where: { tenantId: null },
        include: { order: { select: { tenantId: true } } }
    });

    console.log(`Found ${billsWithoutTenant.length} bills without tenantId`);

    let updated = 0;
    let skipped = 0;

    for (const bill of billsWithoutTenant) {
        if (bill.order?.tenantId) {
            await prisma.bill.update({
                where: { id: bill.id },
                data: { tenantId: bill.order.tenantId }
            });
            updated++;
        } else {
            skipped++;
        }
    }

    console.log(`Done: ${updated} updated, ${skipped} skipped (no order tenantId)`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
