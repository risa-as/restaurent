import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────
function daysAgo(n: number) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
}
function hoursAgo(n: number) {
    return new Date(Date.now() - n * 60 * 60 * 1000);
}
function hoursFromNow(n: number) {
    return new Date(Date.now() + n * 60 * 60 * 1000);
}

async function main() {
    console.log('🗑  Cleaning up existing data...');
    await prisma.loginAttempt.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.customerFeedback.deleteMany({});
    await prisma.voidRequest.deleteMany({});
    await prisma.orderItemModifier.deleteMany({});
    await prisma.billSplitItem.deleteMany({});
    await prisma.billSplit.deleteMany({});
    await prisma.bill.deleteMany({});
    await prisma.delivery.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.cashierShift.deleteMany({});
    await prisma.reservation.deleteMany({});
    await prisma.customer.deleteMany({});
    await prisma.table.deleteMany({});
    await prisma.menuItemModifierGroup.deleteMany({});
    await prisma.modifierOption.deleteMany({});
    await prisma.modifierGroup.deleteMany({});
    await prisma.menuItemStation.deleteMany({});
    await prisma.kitchenStation.deleteMany({});
    await prisma.recipeItem.deleteMany({});
    await prisma.offer.deleteMany({});
    await prisma.menuItem.deleteMany({});
    await prisma.seasonalMenuCategory.deleteMany({});
    await prisma.seasonalHours.deleteMany({});
    await prisma.seasonalMenu.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.inventoryBatch.deleteMany({});
    await prisma.purchaseOrderItem.deleteMany({});
    await prisma.purchaseOrder.deleteMany({});
    await prisma.inventoryTransaction.deleteMany({});
    await prisma.rawMaterial.deleteMany({});
    await prisma.supplier.deleteMany({});
    await prisma.expense.deleteMany({});
    await prisma.dailyClose.deleteMany({});
    await prisma.passwordResetToken.deleteMany({});
    await prisma.announcement.deleteMany({});
    await prisma.manualPayment.deleteMany({});
    await prisma.talabatOrder.deleteMany({});
    await prisma.talabatConfig.deleteMany({});
    await prisma.deliveryTrackingToken.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.branch.deleteMany({});
    await prisma.restaurantConfig.deleteMany({});
    await prisma.systemSetting.deleteMany({});
    await prisma.platformSettings.deleteMany({});
    await prisma.tenant.deleteMany({});

    console.log('✅ Cleanup done\n');

    const password = await bcrypt.hash('123456', 10);

    // ─── Platform Settings ──────────────────────────────────────────────────
    console.log('⚙️  Seeding Platform Settings...');
    await prisma.platformSettings.create({
        data: {
            id: 'singleton',
            trialDurationDays: 14,
            gracePeriodDays: 3,
            bankName: 'مصرف الرشيد',
            bankAccount: '1234567890',
            bankAccountName: 'شركة المنصة التقنية',
            bankIban: 'IQ12RASH0123456789',
            zainCashNumber: '07700000001',
            welcomeMessage: 'أهلاً بك في منصة إدارة المطاعم',
            usdToIqdRate: 1310,
        }
    });

    // ─── Super Admin ────────────────────────────────────────────────────────
    console.log('👑 Seeding Super Admin...');
    await prisma.user.create({
        data: {
            name: 'Super Admin',
            email: 'superadmin@restaurant.com',
            password,
            role: 'SUPER_ADMIN',
            tenantId: null,
            twoFactorEmail: 'ayadqaid12345@gmail.com',
        }
    });

    // ─── Announcement ───────────────────────────────────────────────────────
    console.log('📢 Seeding Announcements...');
    await prisma.announcement.create({
        data: {
            title: 'مرحباً بكم في النظام الجديد',
            body: 'تم إطلاق النسخة الجديدة من نظام إدارة المطاعم مع ميزات رائعة!',
            type: 'INFO',
            isActive: true,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        }
    });
    await prisma.announcement.create({
        data: {
            title: 'صيانة مجدولة',
            body: 'سيتم إجراء صيانة للنظام يوم الجمعة القادم من 2 إلى 4 صباحاً',
            type: 'WARNING',
            targetPlan: 'BASIC',
            isActive: true,
        }
    });

    // ─── Tenant ─────────────────────────────────────────────────────────────
    console.log('🏢 Seeding Tenant...');
    const tenant = await prisma.tenant.create({
        data: {
            name: 'مطعم الضيافة',
            slug: 'default',
            primaryColor: '#f97316',
            plan: 'ENTERPRISE',
            subscriptionStatus: 'ACTIVE',
            isActive: true,
            serviceMode: 'TABLE_SERVICE',
            multiBranchEnabled: true,
            loyaltyEnabled: true,
            loyaltyPointsPerThousand: 1,
            loyaltyPointValueIqd: 100,
            loyaltyMinRedeemPoints: 100,
        },
    });

    // ─── Branches ───────────────────────────────────────────────────────────
    console.log('🏪 Seeding Branches...');
    const branchMain = await prisma.branch.create({
        data: {
            tenantId: tenant.id,
            name: 'الفرع الرئيسي',
            address: 'بغداد، المنصور',
            phone: '07701000001',
            isActive: true,
            isMainBranch: true,
            serviceMode: 'TABLE_SERVICE',
        }
    });
    const branchTwo = await prisma.branch.create({
        data: {
            tenantId: tenant.id,
            name: 'فرع الكرادة',
            address: 'بغداد، الكرادة',
            phone: '07701000002',
            isActive: true,
            isMainBranch: false,
            serviceMode: 'QUICK_SERVICE',
        }
    });

    // ─── System Settings ────────────────────────────────────────────────────
    await prisma.systemSetting.create({
        data: { tenantId: tenant.id, restaurantName: 'مطعم الضيافة', currency: 'IQD', taxRate: 5, serviceFee: 10 }
    });
    await prisma.restaurantConfig.create({
        data: { serviceMode: 'TABLE_SERVICE' }
    });

    // ─── Users ──────────────────────────────────────────────────────────────
    console.log('👥 Seeding Users...');
    const roles = [
        { email: 'admin@restaurant.com',            name: 'أدمن النظام',      role: 'ADMIN' },
        { email: 'manager@restaurant.com',           name: 'مدير المطعم',      role: 'MANAGER' },
        { email: 'waiter@restaurant.com',            name: 'نادل أول',         role: 'WAITER' },
        { email: 'waiter2@restaurant.com',           name: 'نادل ثاني',        role: 'WAITER' },
        { email: 'chef@restaurant.com',              name: 'شيف رئيسي',        role: 'CHEF' },
        { email: 'accountant@restaurant.com',        name: 'محاسب',            role: 'ACCOUNTANT' },
        { email: 'driver@restaurant.com',            name: 'سائق أول',         role: 'DRIVER' },
        { email: 'driver2@restaurant.com',           name: 'سائق ثاني',        role: 'DRIVER' },
        { email: 'captain@restaurant.com',           name: 'كابتن الصالة',     role: 'CAPTAIN' },
        { email: 'delivery_manager@restaurant.com',  name: 'مدير التوصيل',     role: 'DELIVERY_MANAGER' },
        { email: 'cashier@restaurant.com',           name: 'كاشير',            role: 'CASHIER' },
        { email: 'cashier2@restaurant.com',          name: 'كاشير ثاني',       role: 'CASHIER' },
        { email: 'store_manager@restaurant.com',     name: 'مدير المخزن',      role: 'STORE_MANAGER' },
    ];

    const u: Record<string, any> = {};
    for (const r of roles) {
        u[r.role] = await prisma.user.create({
            data: { ...r, password, role: r.role as any, tenantId: tenant.id, branchId: branchMain.id }
        });
    }
    // Override to have a second waiter and cashier stored distinctly
    const waiter2  = await prisma.user.findUnique({ where: { email: 'waiter2@restaurant.com' } });
    const driver2  = await prisma.user.findUnique({ where: { email: 'driver2@restaurant.com' } });
    const cashier2 = await prisma.user.findUnique({ where: { email: 'cashier2@restaurant.com' } });

    // ─── Suppliers ──────────────────────────────────────────────────────────
    console.log('🚚 Seeding Suppliers...');
    const supplier1 = await prisma.supplier.create({
        data: { name: 'شركة دجلة للمواد الغذائية', contact: 'محمد علي', phone: '07701234567', email: 'dijla@example.com', tenantId: tenant.id }
    });
    const supplier2 = await prisma.supplier.create({
        data: { name: 'مزارع الخير والبركة', contact: 'علي حسين', phone: '07801234567', email: 'alkhair@example.com', tenantId: tenant.id }
    });

    // ─── Raw Materials ──────────────────────────────────────────────────────
    console.log('📦 Seeding Raw Materials...');
    const matsData = [
        { name: 'أرز بسمتي',   unit: 'كغم',  currentStock: 250, minStockLevel: 50,  costPerUnit: 2000,  sid: supplier1.id },
        { name: 'دجاج كامل',   unit: 'كغم',  currentStock: 100, minStockLevel: 20,  costPerUnit: 4500,  sid: supplier2.id },
        { name: 'لحم غنم',     unit: 'كغم',  currentStock: 80,  minStockLevel: 15,  costPerUnit: 18000, sid: supplier2.id },
        { name: 'طماطم',       unit: 'كغم',  currentStock: 40,  minStockLevel: 10,  costPerUnit: 1000,  sid: supplier1.id },
        { name: 'زيت قلي',     unit: 'لتر',  currentStock: 60,  minStockLevel: 20,  costPerUnit: 2500,  sid: supplier1.id },
        { name: 'بطاطا',       unit: 'كغم',  currentStock: 100, minStockLevel: 30,  costPerUnit: 1200,  sid: supplier1.id },
        { name: 'قهوة',        unit: 'كغم',  currentStock: 20,  minStockLevel: 5,   costPerUnit: 15000, sid: supplier1.id },
        { name: 'سكر',         unit: 'كغم',  currentStock: 50,  minStockLevel: 10,  costPerUnit: 1500,  sid: supplier1.id },
        { name: 'خبز عربي',    unit: 'رغيف', currentStock: 200, minStockLevel: 50,  costPerUnit: 250,   sid: supplier1.id },
        { name: 'جبن موزاريلا', unit: 'كغم', currentStock: 15,  minStockLevel: 5,   costPerUnit: 12000, sid: supplier2.id },
        { name: 'عجينة بيتزا', unit: 'قطعة', currentStock: 50,  minStockLevel: 10,  costPerUnit: 2000,  sid: supplier1.id },
        { name: 'مشروب غازي',  unit: 'علبة', currentStock: 120, minStockLevel: 30,  costPerUnit: 750,   sid: supplier1.id },
    ];

    const mats: Record<string, any> = {};
    for (const md of matsData) {
        const mat = await prisma.rawMaterial.create({
            data: { name: md.name, unit: md.unit, currentStock: md.currentStock, minStockLevel: md.minStockLevel, costPerUnit: md.costPerUnit, tenantId: tenant.id, branchId: branchMain.id }
        });
        mats[md.name] = mat;
        await prisma.inventoryTransaction.create({
            data: { type: 'PURCHASE', quantity: md.currentStock, cost: md.costPerUnit * md.currentStock, notes: 'رصيد افتتاحي', materialId: mat.id, supplierId: md.sid }
        });
        // Inventory batch for FIFO/expiry tracking
        await prisma.inventoryBatch.create({
            data: {
                materialId: mat.id,
                receivedQty: md.currentStock,
                remainingQty: md.currentStock,
                unitCost: md.costPerUnit,
                expiryDate: md.name === 'دجاج كامل' || md.name === 'لحم غنم' ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
                tenantId: tenant.id,
                branchId: branchMain.id,
            }
        });
    }

    // ─── Purchase Order ─────────────────────────────────────────────────────
    console.log('📋 Seeding Purchase Orders...');
    const po = await prisma.purchaseOrder.create({
        data: {
            poNumber: 'PO-2026-001',
            status: 'RECEIVED',
            supplierId: supplier1.id,
            expectedDate: daysAgo(2),
            receivedDate: daysAgo(1),
            totalCost: 300000,
            notes: 'طلب أسبوعي',
            createdById: u.MANAGER.id,
            tenantId: tenant.id,
            branchId: branchMain.id,
            items: {
                create: [
                    { materialId: mats['أرز بسمتي'].id, orderedQty: 100, receivedQty: 100, unitCost: 2000 },
                    { materialId: mats['بطاطا'].id,      orderedQty: 50,  receivedQty: 50,  unitCost: 1200 },
                    { materialId: mats['سكر'].id,        orderedQty: 20,  receivedQty: 20,  unitCost: 1500 },
                ]
            }
        }
    });

    // ─── Categories ─────────────────────────────────────────────────────────
    console.log('🗂  Seeding Categories...');
    const catEastern  = await prisma.category.create({ data: { name: 'مأكولات شرقية',  tenantId: tenant.id, branchId: branchMain.id, nameAr: 'مأكولات شرقية',  nameEn: 'Eastern Food',   nameKu: 'خواردنی ڕۆژهەڵاتی' } });
    const catWestern  = await prisma.category.create({ data: { name: 'مأكولات غربية',  tenantId: tenant.id, branchId: branchMain.id, nameAr: 'مأكولات غربية',  nameEn: 'Western Food',   nameKu: 'خواردنی ڕۆژئاواتی' } });
    const catBeverage = await prisma.category.create({ data: { name: 'مشروبات',        tenantId: tenant.id, branchId: branchMain.id, nameAr: 'مشروبات',        nameEn: 'Beverages',      nameKu: 'خواردنەوە'         } });
    const catDessert  = await prisma.category.create({ data: { name: 'حلويات',         tenantId: tenant.id, branchId: branchMain.id, nameAr: 'حلويات',         nameEn: 'Desserts',       nameKu: 'شیرینی'            } });

    // ─── Menu Items ─────────────────────────────────────────────────────────
    console.log('🍽  Seeding Menu Items...');
    const mi = {
        qouzi: await prisma.menuItem.create({ data: { name: 'قوزي لحم', description: 'لحم غنم مع الرز البسمتي والمقبلات', price: 25000, categoryId: catEastern.id, tenantId: tenant.id, branchId: branchMain.id, prepTimeMins: 25, recipe: { create: [{ materialId: mats['لحم غنم'].id, quantity: 0.5 }, { materialId: mats['أرز بسمتي'].id, quantity: 0.3 }] } } }),
        chicken: await prisma.menuItem.create({ data: { name: 'دجاج مشوي مع الرز', description: 'نصف دجاجة مشوية بالتوابل', price: 15000, categoryId: catEastern.id, tenantId: tenant.id, branchId: branchMain.id, prepTimeMins: 20, recipe: { create: [{ materialId: mats['دجاج كامل'].id, quantity: 0.5 }, { materialId: mats['أرز بسمتي'].id, quantity: 0.25 }] } } }),
        fries:   await prisma.menuItem.create({ data: { name: 'بطاطا مقلية', description: 'بطاطا مقرمشة محلية الصنع', price: 5000, categoryId: catWestern.id, tenantId: tenant.id, branchId: branchMain.id, prepTimeMins: 10, recipe: { create: [{ materialId: mats['بطاطا'].id, quantity: 0.3 }, { materialId: mats['زيت قلي'].id, quantity: 0.05 }] } } }),
        pizza:   await prisma.menuItem.create({ data: { name: 'بيتزا مارغريتا', description: 'عجينة طازجة بصوص الطماطم والجبن', price: 18000, categoryId: catWestern.id, tenantId: tenant.id, branchId: branchMain.id, prepTimeMins: 20, recipe: { create: [{ materialId: mats['عجينة بيتزا'].id, quantity: 1 }, { materialId: mats['جبن موزاريلا'].id, quantity: 0.2 }, { materialId: mats['طماطم'].id, quantity: 0.1 }] } } }),
        coffee:  await prisma.menuItem.create({ data: { name: 'قهوة تركية', description: 'قهوة مطحونة ناعمة', price: 3000, categoryId: catBeverage.id, tenantId: tenant.id, branchId: branchMain.id, prepTimeMins: 5, recipe: { create: [{ materialId: mats['قهوة'].id, quantity: 0.02 }, { materialId: mats['سكر'].id, quantity: 0.01 }] } } }),
        soda:    await prisma.menuItem.create({ data: { name: 'مشروب غازي', description: 'بيبسي / كولا / سبرايت', price: 2000, categoryId: catBeverage.id, tenantId: tenant.id, branchId: branchMain.id, prepTimeMins: 2, recipe: { create: [{ materialId: mats['مشروب غازي'].id, quantity: 1 }] } } }),
        baklava: await prisma.menuItem.create({ data: { name: 'بقلاوة بالمكسرات', description: 'حلوى شرقية بالمكسرات والعسل', price: 8000, categoryId: catDessert.id, tenantId: tenant.id, branchId: branchMain.id, prepTimeMins: 5 } }),
        shawarma: await prisma.menuItem.create({ data: { name: 'شاورما دجاج', description: 'شاورما دجاج بالخضار والصوص', price: 7000, categoryId: catEastern.id, tenantId: tenant.id, branchId: branchMain.id, prepTimeMins: 12, recipe: { create: [{ materialId: mats['دجاج كامل'].id, quantity: 0.2 }, { materialId: mats['خبز عربي'].id, quantity: 2 }] } } }),
    };

    // ─── Modifier Groups ────────────────────────────────────────────────────
    console.log('🔧 Seeding Modifier Groups...');
    const mgSize = await prisma.modifierGroup.create({
        data: {
            name: 'الحجم', nameAr: 'الحجم', nameEn: 'Size', nameKu: 'قەبارە',
            isRequired: true, isVariant: true, minSelect: 1, maxSelect: 1, sortOrder: 0,
            tenantId: tenant.id,
            options: { create: [
                { name: 'صغير',  nameAr: 'صغير',  nameEn: 'Small',  priceAdjustment: 0,    sortOrder: 0 },
                { name: 'وسط',   nameAr: 'وسط',   nameEn: 'Medium', priceAdjustment: 2000, sortOrder: 1 },
                { name: 'كبير',  nameAr: 'كبير',  nameEn: 'Large',  priceAdjustment: 4000, sortOrder: 2 },
            ]}
        }
    });

    const mgAddons = await prisma.modifierGroup.create({
        data: {
            name: 'الإضافات', nameAr: 'الإضافات', nameEn: 'Add-ons', nameKu: 'زیادەکردن',
            isRequired: false, isVariant: false, minSelect: 0, maxSelect: 3, sortOrder: 1,
            tenantId: tenant.id,
            options: { create: [
                { name: 'جبن إضافي',   nameAr: 'جبن إضافي',   nameEn: 'Extra Cheese', priceAdjustment: 2000 },
                { name: 'مشروم',       nameAr: 'مشروم',       nameEn: 'Mushroom',     priceAdjustment: 1500 },
                { name: 'زيتون',       nameAr: 'زيتون',       nameEn: 'Olives',       priceAdjustment: 1000 },
                { name: 'فلفل حار',    nameAr: 'فلفل حار',    nameEn: 'Jalapeño',     priceAdjustment: 500  },
            ]}
        }
    });

    const mgCook = await prisma.modifierGroup.create({
        data: {
            name: 'درجة الطهي', nameAr: 'درجة الطهي', nameEn: 'Doneness', nameKu: 'ئاستی لەلایینان',
            isRequired: false, isVariant: false, minSelect: 0, maxSelect: 1, sortOrder: 2,
            tenantId: tenant.id,
            options: { create: [
                { name: 'نادر',       nameEn: 'Rare',        priceAdjustment: 0 },
                { name: 'متوسط',      nameEn: 'Medium',      priceAdjustment: 0 },
                { name: 'مطهو جيداً', nameEn: 'Well Done',   priceAdjustment: 0 },
            ]}
        }
    });

    // Link modifiers to menu items
    await prisma.menuItemModifierGroup.createMany({ data: [
        { menuItemId: mi.pizza.id,    modifierGroupId: mgSize.id,   sortOrder: 0 },
        { menuItemId: mi.pizza.id,    modifierGroupId: mgAddons.id, sortOrder: 1 },
        { menuItemId: mi.qouzi.id,    modifierGroupId: mgCook.id,   sortOrder: 0 },
        { menuItemId: mi.chicken.id,  modifierGroupId: mgCook.id,   sortOrder: 0 },
        { menuItemId: mi.shawarma.id, modifierGroupId: mgAddons.id, sortOrder: 0 },
    ]});

    // ─── Kitchen Stations ───────────────────────────────────────────────────
    console.log('🍳 Seeding Kitchen Stations...');
    const stGrill    = await prisma.kitchenStation.create({ data: { name: 'المشويات', nameAr: 'المشويات', colour: '#ef4444', sortOrder: 0, tenantId: tenant.id, branchId: branchMain.id } });
    const stFry      = await prisma.kitchenStation.create({ data: { name: 'المقلى',   nameAr: 'المقلى',   colour: '#f97316', sortOrder: 1, tenantId: tenant.id, branchId: branchMain.id } });
    const stCold     = await prisma.kitchenStation.create({ data: { name: 'البارد',   nameAr: 'البارد',   colour: '#3b82f6', sortOrder: 2, tenantId: tenant.id, branchId: branchMain.id } });
    const stDesserts = await prisma.kitchenStation.create({ data: { name: 'الحلويات', nameAr: 'الحلويات', colour: '#a855f7', sortOrder: 3, tenantId: tenant.id, branchId: branchMain.id } });
    const stDrinks   = await prisma.kitchenStation.create({ data: { name: 'المشروبات',nameAr: 'المشروبات',colour: '#22c55e', sortOrder: 4, tenantId: tenant.id, branchId: branchMain.id } });

    await prisma.menuItemStation.createMany({ data: [
        { menuItemId: mi.qouzi.id,    stationId: stGrill.id    },
        { menuItemId: mi.chicken.id,  stationId: stGrill.id    },
        { menuItemId: mi.shawarma.id, stationId: stGrill.id    },
        { menuItemId: mi.fries.id,    stationId: stFry.id      },
        { menuItemId: mi.pizza.id,    stationId: stFry.id      },
        { menuItemId: mi.baklava.id,  stationId: stDesserts.id },
        { menuItemId: mi.coffee.id,   stationId: stDrinks.id   },
        { menuItemId: mi.soda.id,     stationId: stDrinks.id   },
    ]});

    // ─── Offers ─────────────────────────────────────────────────────────────
    console.log('🎁 Seeding Offers...');
    await prisma.offer.create({
        data: {
            name: 'عرض العائلة الذهبي',
            description: 'خصم 15% على المأكولات الشرقية',
            discountPct: 15,
            startDate: daysAgo(7),
            endDate: hoursFromNow(24 * 30),
            isActive: true,
            tenantId: tenant.id,
            menuItems: { connect: [{ id: mi.qouzi.id }, { id: mi.chicken.id }] }
        }
    });
    await prisma.offer.create({
        data: {
            name: 'عرض اليوم',
            description: 'بيتزا + مشروب بسعر مخفض',
            discountPct: 10,
            startDate: daysAgo(1),
            endDate: hoursFromNow(8),
            isActive: true,
            tenantId: tenant.id,
            menuItems: { connect: [{ id: mi.pizza.id }, { id: mi.soda.id }] }
        }
    });

    // ─── Tables ─────────────────────────────────────────────────────────────
    console.log('🪑 Seeding Tables...');
    const tables: any[] = [];
    const tableStatuses = ['OCCUPIED', 'RESERVED', 'DIRTY', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE', 'AVAILABLE'];
    for (let i = 1; i <= 8; i++) {
        tables.push(await prisma.table.create({
            data: { number: `T${i}`, capacity: i % 3 === 0 ? 6 : (i % 2 === 0 ? 4 : 2), status: tableStatuses[i - 1] as any, x: ((i - 1) % 4) * 150, y: Math.floor((i - 1) / 4) * 150, tenantId: tenant.id, branchId: branchMain.id }
        }));
    }
    for (let i = 1; i <= 4; i++) {
        tables.push(await prisma.table.create({
            data: { number: `K${i}`, capacity: 4, status: 'AVAILABLE', x: (i - 1) * 150, y: 0, tenantId: tenant.id, branchId: branchTwo.id }
        }));
    }

    // ─── Customers ──────────────────────────────────────────────────────────
    console.log('👤 Seeding Customers...');
    const cust1 = await prisma.customer.create({ data: { phone: '07711234567', name: 'أحمد محمود',   totalPoints: 150, totalSpent: 450000, tenantId: tenant.id } });
    const cust2 = await prisma.customer.create({ data: { phone: '07811234567', name: 'سارة خالد',   totalPoints: 50,  totalSpent: 120000, tenantId: tenant.id } });
    const cust3 = await prisma.customer.create({ data: { phone: '07901234567', name: 'عمر العبيدي', totalPoints: 200, totalSpent: 800000, tenantId: tenant.id } });

    // ─── Reservations ───────────────────────────────────────────────────────
    console.log('📅 Seeding Reservations...');
    await prisma.reservation.create({ data: { customerName: cust1.name!, customerPhone: cust1.phone, guests: 4, reservationTime: hoursFromNow(2),  notes: 'طاولة هادئة رجاءً',  status: 'CONFIRMED', tenantId: tenant.id, tables: { connect: [{ id: tables[1].id }] } } });
    await prisma.reservation.create({ data: { customerName: cust3.name!, customerPhone: cust3.phone, guests: 6, reservationTime: hoursFromNow(5),  notes: 'حفلة عيد ميلاد',    status: 'CONFIRMED', tenantId: tenant.id, tables: { connect: [{ id: tables[4].id }] } } });
    await prisma.reservation.create({ data: { customerName: 'زينب علي',   customerPhone: '07751111222', guests: 2, reservationTime: hoursFromNow(24), notes: '',                  status: 'PENDING',   tenantId: tenant.id } });

    // ─── Cashier Shifts ─────────────────────────────────────────────────────
    console.log('🕐 Seeding Cashier Shifts...');
    const shiftClosed = await prisma.cashierShift.create({
        data: { cashierId: u.CASHIER.id, tenantId: tenant.id, branchId: branchMain.id, openedAt: daysAgo(1), closedAt: hoursAgo(2), openingCash: 50000, closingCashEntered: 420000, expectedCash: 425000, cashVariance: -5000, totalCash: 370000, totalCard: 80000, totalSales: 450000, note: 'وردية ناجحة' }
    });
    const shiftOpen = await prisma.cashierShift.create({
        data: { cashierId: u.CASHIER.id, tenantId: tenant.id, branchId: branchMain.id, openedAt: hoursAgo(3), openingCash: 50000, totalCash: 0, totalCard: 0, totalSales: 0 }
    });

    // ─── Orders ─────────────────────────────────────────────────────────────
    console.log('🛒 Seeding Orders...');

    // Order 1: PREPARING (dine-in T1)
    const ord1 = await prisma.order.create({
        data: { status: 'PREPARING', totalAmount: 30000, tax: 1500, serviceFee: 3000, tenantId: tenant.id, branchId: branchMain.id, tableId: tables[0].id, waiterId: u.WAITER.id, customerId: cust2.id,
            items: { create: [
                { menuItemId: mi.qouzi.id,   quantity: 1, unitPrice: 25000, totalPrice: 25000, cost: 10000, status: 'PREPARING' },
                { menuItemId: mi.fries.id,   quantity: 1, unitPrice: 5000,  totalPrice: 5000,  cost: 1000,  status: 'PREPARING' },
            ]}
        }
    });

    // Order 2: READY (dine-in T3, waiting for cashier)
    const ord2 = await prisma.order.create({
        data: { status: 'READY', totalAmount: 18000, tax: 900, serviceFee: 1800, tenantId: tenant.id, branchId: branchMain.id, tableId: tables[2].id, waiterId: u.WAITER.id,
            items: { create: [
                { menuItemId: mi.chicken.id, quantity: 1, unitPrice: 15000, totalPrice: 15000, cost: 7000, status: 'COMPLETED' },
                { menuItemId: mi.coffee.id,  quantity: 1, unitPrice: 3000,  totalPrice: 3000,  cost: 500,  status: 'COMPLETED' },
            ]}
        }
    });

    // Order 3: COMPLETED + BILL (yesterday)
    const ord3 = await prisma.order.create({
        data: { status: 'COMPLETED', totalAmount: 43000, tax: 2150, serviceFee: 4300, tenantId: tenant.id, branchId: branchMain.id, tableId: tables[3].id, waiterId: u.WAITER.id, customerId: cust1.id, createdAt: daysAgo(1),
            items: { create: [
                { menuItemId: mi.qouzi.id,   quantity: 1, unitPrice: 25000, totalPrice: 25000, cost: 10000, status: 'COMPLETED' },
                { menuItemId: mi.pizza.id,   quantity: 1, unitPrice: 18000, totalPrice: 18000, cost: 6000,  status: 'COMPLETED' },
            ]}
        }
    });
    await prisma.bill.create({ data: { amount: 49450, paymentMethod: 'CASH', orderId: ord3.id, isSettled: true, settledAt: daysAgo(1), collectedById: u.CASHIER.id, tenantId: tenant.id, shiftId: shiftClosed.id } });

    // Order 4: COMPLETED + CARD (3 days ago)
    const ord4 = await prisma.order.create({
        data: { status: 'COMPLETED', totalAmount: 38000, tax: 1900, serviceFee: 3800, tenantId: tenant.id, branchId: branchMain.id, tableId: tables[4].id, waiterId: u.WAITER.id, customerId: cust3.id, createdAt: daysAgo(3),
            items: { create: [
                { menuItemId: mi.qouzi.id,   quantity: 1, unitPrice: 25000, totalPrice: 25000, cost: 10000, status: 'COMPLETED' },
                { menuItemId: mi.baklava.id, quantity: 1, unitPrice: 8000,  totalPrice: 8000,  cost: 2000,  status: 'COMPLETED' },
                { menuItemId: mi.soda.id,    quantity: 2, unitPrice: 2000,  totalPrice: 4000,  cost: 750,   status: 'COMPLETED' },
            ]}
        }
    });
    await prisma.bill.create({ data: { amount: 43700, paymentMethod: 'CARD', orderId: ord4.id, isSettled: true, settledAt: daysAgo(3), collectedById: u.CASHIER.id, tenantId: tenant.id, shiftId: shiftClosed.id } });

    // Order 5: PENDING — delivery order
    const ord5 = await prisma.order.create({
        data: { status: 'PREPARING', totalAmount: 25000, tax: 1250, serviceFee: 0, tenantId: tenant.id, branchId: branchMain.id, customerId: cust1.id,
            items: { create: [
                { menuItemId: mi.chicken.id, quantity: 1, unitPrice: 15000, totalPrice: 15000, cost: 7000, status: 'PREPARING' },
                { menuItemId: mi.fries.id,   quantity: 2, unitPrice: 5000,  totalPrice: 10000, cost: 1000, status: 'PREPARING' },
            ]}
        }
    });
    const delivTok = 'tok_' + Math.random().toString(36).slice(2);
    await prisma.delivery.create({
        data: { customerName: cust1.name!, customerPhone: cust1.phone, address: 'بغداد، المنصور، حي دراغ', deliveryFee: 3000, estimatedTime: 45, status: 'ON_THE_WAY', orderId: ord5.id, driverId: u.DRIVER.id, lat: 33.315, lng: 44.366,
            trackingToken: { create: { tokenHash: delivTok } }
        }
    });

    // Order 6: COMPLETED — delivery (2 days ago)
    const ord6 = await prisma.order.create({
        data: { status: 'COMPLETED', totalAmount: 22000, tax: 1100, serviceFee: 0, tenantId: tenant.id, branchId: branchMain.id, customerId: cust2.id, createdAt: daysAgo(2),
            items: { create: [
                { menuItemId: mi.shawarma.id, quantity: 2, unitPrice: 7000,  totalPrice: 14000, cost: 2000, status: 'COMPLETED' },
                { menuItemId: mi.soda.id,     quantity: 2, unitPrice: 2000,  totalPrice: 4000,  cost: 750,  status: 'COMPLETED' },
            ]}
        }
    });
    await prisma.bill.create({ data: { amount: 26100, paymentMethod: 'CASH', orderId: ord6.id, isSettled: true, settledAt: daysAgo(2), tenantId: tenant.id } });
    await prisma.customerFeedback.create({ data: { orderId: ord6.id, rating: 5, comment: 'ممتاز جداً، شاورما لا تُنسى!', tenantId: tenant.id, branchId: branchMain.id } });

    // Order 7: READY with modifiers (pizza with extra cheese)
    const modOpts = await prisma.modifierOption.findMany({ where: { group: { tenantId: tenant.id } } });
    const extraCheese = modOpts.find(o => o.name === 'جبن إضافي');
    const ord7 = await prisma.order.create({
        data: { status: 'READY', totalAmount: 21000, tax: 1050, serviceFee: 2100, tenantId: tenant.id, branchId: branchMain.id, tableId: tables[5].id, waiterId: u.WAITER.id,
            items: { create: [
                { menuItemId: mi.pizza.id, quantity: 1, unitPrice: 18000, totalPrice: 20000, cost: 6000, status: 'COMPLETED',
                    modifiers: extraCheese ? { create: [{ modifierOptionId: extraCheese.id, appliedPrice: extraCheese.priceAdjustment }] } : undefined
                },
                { menuItemId: mi.soda.id, quantity: 1, unitPrice: 2000, totalPrice: 2000, cost: 750, status: 'COMPLETED' },
            ]}
        }
    });

    // Order 8: COMPLETED 5 days ago (for revenue chart)
    const ord8 = await prisma.order.create({
        data: { status: 'COMPLETED', totalAmount: 15000, tax: 750, serviceFee: 1500, tenantId: tenant.id, branchId: branchMain.id, createdAt: daysAgo(5),
            items: { create: [{ menuItemId: mi.chicken.id, quantity: 1, unitPrice: 15000, totalPrice: 15000, cost: 7000, status: 'COMPLETED' }] }
        }
    });
    await prisma.bill.create({ data: { amount: 17250, paymentMethod: 'CASH', orderId: ord8.id, isSettled: true, settledAt: daysAgo(5), tenantId: tenant.id } });

    // ─── Expenses ───────────────────────────────────────────────────────────
    console.log('💰 Seeding Expenses...');
    const expenseData = [
        { description: 'رواتب عمال النظافة',  amount: 50000, category: 'رواتب',     daysBack: 1 },
        { description: 'فاتورة كهرباء الشهر', amount: 75000, category: 'فواتير',    daysBack: 2 },
        { description: 'صيانة أجهزة المطبخ',  amount: 30000, category: 'صيانة',     daysBack: 3 },
        { description: 'مواد تنظيف',          amount: 15000, category: 'مستلزمات',  daysBack: 4 },
        { description: 'إيجار شهري',           amount: 500000, category: 'إيجار',   daysBack: 5 },
    ];
    for (const e of expenseData) {
        await prisma.expense.create({ data: { description: e.description, amount: e.amount, category: e.category, date: daysAgo(e.daysBack), recordedById: u.ACCOUNTANT.id, tenantId: tenant.id, branchId: branchMain.id } });
    }

    // ─── Daily Close (last 5 days) ──────────────────────────────────────────
    console.log('📊 Seeding Daily Closes...');
    const closesData = [
        { daysBack: 1, sales: 450000, cash: 300000, card: 150000,      expenses: 75000 },
        { daysBack: 2, sales: 320000, cash: 200000, card: 100000,  expenses: 45000 },
        { daysBack: 3, sales: 510000, cash: 350000, card: 130000,  expenses: 80000 },
        { daysBack: 4, sales: 280000, cash: 180000, card: 80000,  online: 20000,  expenses: 40000 },
        { daysBack: 5, sales: 390000, cash: 250000, card: 120000,  expenses: 60000 },
    ];
    for (const c of closesData) {
        await prisma.dailyClose.create({
            data: { date: daysAgo(c.daysBack), totalSales: c.sales, totalCash: c.cash, totalCard: c.card, totalExpenses: c.expenses, netProfit: c.sales - c.expenses, closedById: u.MANAGER.id, tenantId: tenant.id, notes: 'مغلق تلقائياً' }
        });
    }

    // ─── Seasonal Menu (Ramadan) ─────────────────────────────────────────────
    console.log('🌙 Seeding Seasonal Menu...');
    const ramadan = await prisma.seasonalMenu.create({
        data: { name: 'قائمة رمضان 2026', startDate: new Date('2026-02-28'), endDate: new Date('2026-03-29'), isActive: false, tenantId: tenant.id, branchId: branchMain.id,
            categories: { create: [{ categoryId: catEastern.id }, { categoryId: catBeverage.id }] },
            hours: { create: [{ dayOfWeek: null, openTime: '17:00', closeTime: '03:00' }] }
        }
    });

    // ─── Void Request ────────────────────────────────────────────────────────
    console.log('🚫 Seeding Void Request...');
    await prisma.voidRequest.create({
        data: { orderId: ord2.id, reason: 'طلب العميل إلغاء الطلب', status: 'PENDING', requestedById: u.WAITER.id, tenantId: tenant.id }
    });

    // ─── Audit Log ───────────────────────────────────────────────────────────
    console.log('📝 Seeding Audit Logs...');
    await prisma.auditLog.createMany({ data: [
        { action: 'LOGIN',          details: 'تسجيل دخول ناجح', userId: u.ADMIN.id },
        { action: 'CREATE_ORDER',   details: `إنشاء طلب ORD-001`, userId: u.WAITER.id },
        { action: 'COMPLETE_ORDER', details: `إتمام الطلب ORD-003`, userId: u.CASHIER.id },
        { action: 'CLOSE_SHIFT',    details: `إغلاق وردية الكاشير`, userId: u.CASHIER.id },
    ]});

    // ─── Login Attempts ──────────────────────────────────────────────────────
    await prisma.loginAttempt.createMany({ data: [
        { email: 'admin@restaurant.com',     ipAddress: '192.168.1.10', success: true,  createdAt: hoursAgo(1) },
        { email: 'cashier@restaurant.com',   ipAddress: '192.168.1.11', success: true,  createdAt: hoursAgo(2) },
        { email: 'unknown@hacker.com',       ipAddress: '1.2.3.4',      success: false, createdAt: hoursAgo(3) },
        { email: 'unknown@hacker.com',       ipAddress: '1.2.3.4',      success: false, createdAt: hoursAgo(3) },
        { email: 'unknown@hacker.com',       ipAddress: '1.2.3.4',      success: false, createdAt: hoursAgo(3) },
    ]});

    // ─── Talabat Config ──────────────────────────────────────────────────────
    console.log('🟡 Seeding Talabat Config...');
    await prisma.talabatConfig.create({
        data: { tenantId: tenant.id, branchId: branchMain.id, storeId: 'TLB-12345', apiKey: 'tlb_test_key_xxx', webhookSecret: 'whsec_test_xxx', isEnabled: false }
    });

    console.log('\n✅ Database seeding completed successfully! 🚀');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👑 Super Admin  : superadmin@restaurant.com  / 123456');
    console.log('🔐 2FA email    : ayadqaid12345@gmail.com');
    console.log('👔 Admin        : admin@restaurant.com        / 123456');
    console.log('👔 Manager      : manager@restaurant.com      / 123456');
    console.log('🧑‍🍳 Chef         : chef@restaurant.com         / 123456');
    console.log('🛎  Captain      : captain@restaurant.com      / 123456');
    console.log('🧾 Cashier      : cashier@restaurant.com      / 123456');
    console.log('🚗 Driver       : driver@restaurant.com       / 123456');
    console.log('🧑‍💼 Waiter       : waiter@restaurant.com       / 123456');
    console.log('📦 Store Mgr    : store_manager@restaurant.com/ 123456');
    console.log('📊 Accountant   : accountant@restaurant.com   / 123456');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
    .catch((e) => { console.error('❌', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
