import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding initial tenant...');

    // Create or find the default tenant
    const tenant = await prisma.tenant.upsert({
        where: { slug: 'default' },
        update: {},
        create: {
            name: 'My Restaurant (Default)',
            slug: 'default',
            primaryColor: '#f97316',
            plan: 'ENTERPRISE',
            subscriptionStatus: 'ACTIVE',
            isActive: true,
        },
    });

    console.log(`Using tenant: ${tenant.slug} (ID: ${tenant.id})`);

    // Link all existing data to this tenant
    const models = [
        prisma.user,
        prisma.category,
        prisma.menuItem,
        prisma.table,
        prisma.order,
        prisma.reservation,
        prisma.rawMaterial,
        prisma.supplier
    ];

    for (const model of models) {
        // Cannot strongly type this because updateMany signatures differ slightly
        // but the underlying structure { where: { tenantId: null }, data: { tenantId: tenant.id } } is identical
        await (model as any).updateMany({
            where: { tenantId: null },
            data: { tenantId: tenant.id },
        });
    }

    console.log('Successfully linked all existing records to the default tenant.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
