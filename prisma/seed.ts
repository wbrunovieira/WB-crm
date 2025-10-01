import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // Create test user
  const hashedPassword = await bcrypt.hash("123456", 10);
  const testUser = await prisma.user.upsert({
    where: { email: "admin@wbcrm.com" },
    update: {},
    create: {
      email: "admin@wbcrm.com",
      name: "Admin",
      password: hashedPassword,
      role: "admin",
    },
  });

  console.log("Created test user:", { email: testUser.email, name: testUser.name });

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
