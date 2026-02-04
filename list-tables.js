const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const result = await prisma.$queryRaw`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public';`;
        const names = result.map(t => t.tablename);
        console.log('Tables found:', names.join(', '));
        console.log('Contains "Order":', names.includes('Order'));
        console.log('Contains "order":', names.includes('order'));
    } catch (error) {
        console.error('Error listing tables:', error);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
