const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const password = await bcrypt.hash('123456', 10);

    const users = [
        { email: 'admin@test.com', name: 'Admin User', role: 'ADMIN' },
        { email: 'manager@test.com', name: 'Manager User', role: 'MANAGER' },
        { email: 'waiter@test.com', name: 'Waiter User', role: 'WAITER' },
        { email: 'chef@test.com', name: 'Chef User', role: 'CHEF' },
        { email: 'accountant@test.com', name: 'Accountant User', role: 'ACCOUNTANT' },
        { email: 'driver@test.com', name: 'Driver User', role: 'DRIVER' },
        { email: 'captain@test.com', name: 'Captain User', role: 'CAPTAIN' },
        { email: 'delivery_manager@test.com', name: 'Delivery Manager User', role: 'DELIVERY_MANAGER' },
        { email: 'cashier@test.com', name: 'Cashier User', role: 'CASHIER' },
    ];

    console.log('Seeding users...');

    for (const user of users) {
        const upsertedUser = await prisma.user.upsert({
            where: { email: user.email },
            update: {},
            create: {
                email: user.email,
                name: user.name,
                password: password,
                role: user.role,
            },
        });
        console.log(`Created/Updated user: ${upsertedUser.email} (${upsertedUser.role})`);
    }

    // ... existing user seeding ...

    // 1. Seed Raw Materials (Inventory)
    console.log('Seeding inventory in Arabic...');
    const rawMaterials = [
        { name: 'أرز', unit: 'كغم', cost: 1.5, stock: 100 },
        { name: 'دجاج', unit: 'كغم', cost: 5.0, stock: 50 },
        { name: 'لحم', unit: 'كغم', cost: 12.0, stock: 40 },
        { name: 'طحين', unit: 'كغم', cost: 0.8, stock: 100 },
        { name: 'سكر', unit: 'كغم', cost: 1.0, stock: 50 },
        { name: 'شاي', unit: 'كغم', cost: 15.0, stock: 10 },
        { name: 'قهوة', unit: 'كغم', cost: 20.0, stock: 10 },
        { name: 'زيت', unit: 'لتر', cost: 3.0, stock: 50 },
        { name: 'بهارات', unit: 'كغم', cost: 25.0, stock: 5 },
        { name: 'بطاطا', unit: 'كغم', cost: 1.0, stock: 80 },
        { name: 'طماطم', unit: 'كغم', cost: 1.2, stock: 40 },
        { name: 'بصل', unit: 'كغم', cost: 0.9, stock: 40 },
        { name: 'جبن', unit: 'كغم', cost: 8.0, stock: 20 },
        { name: 'حليب', unit: 'لتر', cost: 1.5, stock: 30 },
    ];

    const materialMap = new Map();

    for (const mat of rawMaterials) {
        // Check if exists
        const existing = await prisma.rawMaterial.findFirst({ where: { name: mat.name } });
        if (existing) {
            materialMap.set(mat.name, existing);
            console.log(`Material already exists: ${mat.name}`);
        } else {
            const created = await prisma.rawMaterial.create({
                data: {
                    name: mat.name,
                    unit: mat.unit,
                    costPerUnit: mat.cost,
                    currentStock: mat.stock,
                },
            });
            materialMap.set(mat.name, created);
            console.log(`Created material: ${mat.name}`);
        }
    }

    // 2. Seed Categories
    console.log('Seeding categories in Arabic...');
    const categories = [
        { name: 'مأكولات شرقية', type: 'EASTERN' },
        { name: 'مأكولات غربية', type: 'WESTERN' },
        { name: 'مشروبات', type: 'BEVERAGE' },
        { name: 'حلويات', type: 'DESSERT' },
    ];

    const categoryMap = new Map();

    for (const cat of categories) {
        const existing = await prisma.category.findFirst({ where: { name: cat.name } });
        if (existing) {
            categoryMap.set(cat.type, existing);
            console.log(`Category already exists: ${cat.name}`);
        } else {
            const created = await prisma.category.create({
                data: {
                    name: cat.name,
                    type: cat.type,
                },
            });
            categoryMap.set(cat.type, created);
            console.log(`Created category: ${cat.name}`);
        }
    }

    // 3. Seed Menu Items and Recipes
    console.log('Seeding menu items and recipes in Arabic...');

    const menuItems = [
        {
            name: 'كبسة دجاج',
            description: 'أرز تقليدي مع دجاج محمر',
            price: 15.0,
            categoryType: 'EASTERN',
            recipe: [
                { materialName: 'أرز', quantity: 0.25 },
                { materialName: 'دجاج', quantity: 0.4 },
                { materialName: 'بهارات', quantity: 0.01 },
                { materialName: 'زيت', quantity: 0.05 },
            ]
        },
        {
            name: 'مندي لحم',
            description: 'أرز مع لحم غنم طري مطبوخ في التنور',
            price: 25.0,
            categoryType: 'EASTERN',
            recipe: [
                { materialName: 'أرز', quantity: 0.3 },
                { materialName: 'لحم', quantity: 0.4 },
                { materialName: 'بهارات', quantity: 0.02 },
            ]
        },
        {
            name: 'برجر لحم',
            description: 'شريحة لحم بقري عصارية مع جبن وبطاطا مقلية',
            price: 12.0,
            categoryType: 'WESTERN',
            recipe: [
                { materialName: 'لحم', quantity: 0.2 },
                { materialName: 'جبن', quantity: 0.05 },
                { materialName: 'بطاطا', quantity: 0.3 }, // Fries
                { materialName: 'زيت', quantity: 0.1 }, // Frying
            ]
        },
        {
            name: 'كرسبي دجاج',
            description: 'صدر دجاج مقلي مع سلطة كول سلو',
            price: 10.0,
            categoryType: 'WESTERN',
            recipe: [
                { materialName: 'دجاج', quantity: 0.3 },
                { materialName: 'طحين', quantity: 0.1 },
                { materialName: 'زيت', quantity: 0.2 },
            ]
        },
        {
            name: 'كنافة',
            description: 'عجينة بالجبن الحلو مع القطر',
            price: 8.0,
            categoryType: 'DESSERT',
            recipe: [
                { materialName: 'طحين', quantity: 0.1 },
                { materialName: 'جبن', quantity: 0.15 },
                { materialName: 'سكر', quantity: 0.1 },
                { materialName: 'زيت', quantity: 0.05 },
            ]
        },
        {
            name: 'شاي عراقي',
            description: 'شاي أسود ثقيل مع هيل',
            price: 1.0,
            categoryType: 'BEVERAGE',
            recipe: [
                { materialName: 'شاي', quantity: 0.01 },
                { materialName: 'سكر', quantity: 0.02 },
            ]
        },
        {
            name: 'قهوة',
            description: 'قهوة طازجة',
            price: 3.0,
            categoryType: 'BEVERAGE',
            recipe: [
                { materialName: 'قهوة', quantity: 0.02 },
                { materialName: 'سكر', quantity: 0.01 },
            ]
        },
    ];

    for (const item of menuItems) {
        const category = categoryMap.get(item.categoryType);
        if (!category) {
            console.error(`Category not found for type: ${item.categoryType}`);
            continue;
        }

        const existing = await prisma.menuItem.findFirst({ where: { name: item.name } });
        if (existing) {
            console.log(`Menu item already exists: ${item.name}`);
        } else {
            const createData = {
                name: item.name,
                description: item.description,
                price: item.price,
                categoryId: category.id,
                recipe: {
                    create: item.recipe.map(r => {
                        const material = materialMap.get(r.materialName);
                        if (!material) {
                            throw new Error(`Material not found: ${r.materialName} for item ${item.name}`);
                        }
                        return {
                            materialId: material.id,
                            quantity: r.quantity
                        };
                    })
                }
            };

            const created = await prisma.menuItem.create({ data: createData });
            console.log(`Created menu item: ${item.name} with recipe`);
        }
    }

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
