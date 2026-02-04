const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
    const items = await prisma.menuItem.findMany({
        include: {
            category: true
        }
    });

    let log = String(items.length) + " items found.\n";
    log += "Item Name | Category Name | Category Type\n";
    log += "---------------------------------------\n";

    items.forEach(item => {
        log += `${item.name} | ${item.category.name} | ${item.category.type}\n`;
    });

    fs.writeFileSync('items-log.txt', log);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
