import { prisma } from "@constell/shared/src/db";

export async function calculateCost(
  model: string,
  inputTokens: number | null,
  outputTokens: number | null
): Promise<number | null> {
  if (inputTokens == null || outputTokens == null) return null;

  const price = await prisma.modelPrice.findFirst({
    where: {
      model,
      effectiveTo: null,
    },
    orderBy: { effectiveFrom: "desc" },
  });

  if (!price) return null;

  const inputCost = (inputTokens * Number(price.inputPrice)) / 1_000_000;
  const outputCost = (outputTokens * Number(price.outputPrice)) / 1_000_000;

  return inputCost + outputCost;
}
