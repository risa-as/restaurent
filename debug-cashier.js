const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
    console.log("Fetching cashier orders...");

    const orders = await prisma.order.findMany({
        where: {
            status: {
                in: ['READY', 'SERVED']
            },
        },
        include: {
            items: true,
            bills: true,
            delivery: true,
            table: true
        }
    });

    const filtered = orders.filter(order => order.bills.length === 0 && !order.delivery);

    let log = `Found ${orders.length} total READY/SERVED orders.\n`;
    log += `Found ${filtered.length} filtered orders (No Bill, No Delivery).\n\n`;

    log += "--- ALL READY/SERVED ORDERS ---\n";
    orders.forEach(o => {
        log += `ID: ${o.id} | Status: ${o.status} | Delivery: ${o.delivery ? 'YES' : 'NO'} | Bills: ${o.bills.length}\n`;
        if (o.delivery) log += `   -> Driver: ${o.delivery.driverId}\n`;
        if (o.bills.length > 0) log += `   -> Paid: ${o.bills[0].amount}\n`;
    });

    fs.writeFileSync('cashier-debug.txt', log);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
