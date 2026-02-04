const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function main() {
    const categories = await prisma.category.findMany();
    let log = "--- Current Categories ---\n";
    categories.forEach(c => log += `${c.name}: ${c.type}\n`);
    log += "--------------------------\n";

    for (const cat of categories) {
        let newType = 'EASTERN'; // Default
        const name = cat.name.toLowerCase();

        if (name.includes('غربية') || name.includes('western') || name.includes('بركر') || name.includes('بيتزا') || name.includes('burger') || name.includes('pizza') || name.includes('sandwich') || name.includes('سندويش')) {
            newType = 'WESTERN';
        } else if (name.includes('مشروبات') || name.includes('عصائر') || name.includes('beverage') || name.includes('drink') || name.includes('قهوة') || name.includes('شاي') || name.includes('water') || name.includes('سفن') || name.includes('بيبسي')) {
            newType = 'BEVERAGE';
        } else if (name.includes('حلويات') || name.includes('dessert') || name.includes('sweet') || name.includes('كيك') || name.includes('cake') || name.includes('وافل') || name.includes('كرسب') || name.includes('كريب')) {
            newType = 'DESSERT';
        } else {
            // Assume Eastern if no other match (default)
            if (cat.type !== 'EASTERN') continue;
        }

        if (cat.type !== newType) {
            log += `Updating ${cat.name} from ${cat.type} to ${newType}\n`;
            await prisma.category.update({
                where: { id: cat.id },
                data: { type: newType }
            });
        }
    }

    const updatedCategories = await prisma.category.findMany();
    log += "\n--- Updated Categories ---\n";
    updatedCategories.forEach(c => log += `${c.name}: ${c.type}\n`);
    log += "--------------------------\n";

    fs.writeFileSync('categories-log.txt', log);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
