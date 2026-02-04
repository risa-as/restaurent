const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const result = await prisma.$queryRaw`SELECT count(*) FROM "orders"`;
        console.log('Orders table exists. Count:', result);
    } catch (error) {
        if (error.meta && error.meta.code === '42P01') {
            console.log('Orders table DOES NOT exist');
        } else {
            console.log('Error querying orders:', error);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
