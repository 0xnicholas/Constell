import { type PrismaClient } from "@prisma/client";

const SEED_MODELS = [
  { model: "gpt-4o", inputPrice: "2.50", outputPrice: "10.00" },
  { model: "gpt-4o-mini", inputPrice: "0.15", outputPrice: "0.60" },
  { model: "claude-3-5-sonnet-20241022", inputPrice: "3.00", outputPrice: "15.00" },
  { model: "claude-3-5-haiku-20241022", inputPrice: "0.80", outputPrice: "4.00" },
  { model: "gemini-1.5-pro", inputPrice: "1.25", outputPrice: "5.00" },
  { model: "gemini-1.5-flash", inputPrice: "0.075", outputPrice: "0.30" },
];

export async function seedModelPrices(prisma: PrismaClient) {
  for (const m of SEED_MODELS) {
    await prisma.modelPrice.upsert({
      where: { model: m.model },
      update: {},
      create: {
        model: m.model,
        inputPrice: m.inputPrice,
        outputPrice: m.outputPrice,
        currency: "USD",
      },
    });
  }
  console.log(`Seeded ${SEED_MODELS.length} model prices`);
}
