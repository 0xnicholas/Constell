import { PrismaClient } from "@prisma/client";
import { seedModelPrices } from "./seed/modelPrices.js";

const prisma = new PrismaClient();

async function main() {
  await seedModelPrices(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
