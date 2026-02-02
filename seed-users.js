
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

const users = [
    {
        email: 'admin@example.com',
        name: 'Admin User',
        password: '123456',
        role: 'ADMIN',
    },
    {
        email: 'manager@example.com',
        name: 'Restaurant Manager',
        password: '123456',
        role: 'MANAGER',
    },
    {
        email: 'chef@example.com',
        name: 'Chief Chef',
        password: '123456',
        role: 'CHEF',
    },
    {
        email: 'waiter@example.com',
        name: 'John Waiter',
        password: '123456',
        role: 'WAITER',
    },
    {
        email: 'accountant@example.com',
        name: 'Accountant User',
        password: '123456',
        role: 'ACCOUNTANT',
    },
    {
        email: 'driver@example.com',
        name: 'Fast Driver',
        password: '123456',
        role: 'DRIVER',
    },
    {
        email: 'captain@example.com',
        name: 'Captain Hook',
        password: '123456',
        role: 'CAPTAIN',
    },
    {
        email: 'delivery.mgr@example.com',
        name: 'Delivery Manager',
        password: '123456',
        role: 'DELIVERY_MANAGER',
    },
    {
        email: 'cashier@example.com',
        name: 'Cashier User',
        password: '123456',
        role: 'CASHIER',
    },
];

async function main() {
    console.log(`Start seeding ...`);
    for (const u of users) {
        const hashedPassword = await bcrypt.hash(u.password, 10);
        const user = await prisma.user.upsert({
            where: { email: u.email },
            update: {
                password: hashedPassword // Update password in case we re-seed
            },
            create: {
                email: u.email,
                name: u.name,
                password: hashedPassword,
                role: u.role,
            },
        });
        console.log(`Created user with id: ${user.id}`);
    }
    console.log(`Seeding finished.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
