const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
    const bills = await prisma.bill.findMany({
        take: 20,
        orderBy: { paidAt: 'desc' },
        include: {
            order: {
                include: {
                    delivery: true
                }
            }
        }
    });

    let log = "--- Recent Bills ---\n";
    bills.forEach(b => {
        log += `ID: ${b.id}\n`;
        log += `Amount: ${b.amount}\n`;
        log += `Method: ${b.paymentMethod}\n`;
        log += `Settled: ${b.isSettled}\n`;
        log += `Order Status: ${b.order.status}\n`;
        log += `Delivery: ${b.order.delivery ? 'YES' : 'NO'}\n`;
        if (b.order.delivery) {
            log += `  - Cash Handed Over: ${b.order.delivery.isCashHandedOver}\n`;
        }
        log += "--------------------\n";
    });

    fs.writeFileSync('bills-log.txt', log);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
