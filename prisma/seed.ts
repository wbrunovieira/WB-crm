import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // Get admin credentials from environment variables
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || "Admin";

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env file"
    );
  }

  // Create admin user
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      password: hashedPassword,
      name: adminName,
      role: "admin",
    },
    create: {
      email: adminEmail,
      name: adminName,
      password: hashedPassword,
      role: "admin",
    },
  });

  console.log("✅ Admin user created/updated:", {
    email: adminUser.email,
    name: adminUser.name,
    role: adminUser.role,
  });

  // Create default pipeline
  const defaultPipeline = await prisma.pipeline.upsert({
    where: { id: "default-pipeline" },
    update: {},
    create: {
      id: "default-pipeline",
      name: "Pipeline de Vendas",
      isDefault: true,
      stages: {
        create: [
          {
            name: "Qualificação",
            order: 1,
            probability: 10,
          },
          {
            name: "Proposta",
            order: 2,
            probability: 30,
          },
          {
            name: "Negociação",
            order: 3,
            probability: 60,
          },
          {
            name: "Fechamento",
            order: 4,
            probability: 90,
          },
        ],
      },
    },
  });

  console.log("Created default pipeline:", defaultPipeline);
  console.log("Seed completed!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
