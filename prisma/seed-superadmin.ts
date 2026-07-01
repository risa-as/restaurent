import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "ayadqaid12345@restaurant.com";
  const password = "123456";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("✅ Super admin already exists:", email);
    return;
  }

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name: "Super Admin",
      email,
      password: hashed,
      role: "SUPER_ADMIN",
      tenantId: null,
    },
  });

  console.log("✅ Super admin created successfully!");
  console.log("   Email   :", user.email);
  console.log("   Password: 123456");
  console.log("   Role    :", user.role);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
