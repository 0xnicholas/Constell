import { prisma } from "@constell/shared/src/db";
import { compareSecret } from "@constell/shared/src/encryption";
import { AuthenticationError } from "@constell/shared";

export async function validateApiKey(
  authHeader: string | undefined
): Promise<{ projectId: string; apiKeyId: string }> {
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    throw new AuthenticationError("Missing or invalid Authorization header");
  }

  const base64 = authHeader.slice(6);
  const decoded = Buffer.from(base64, "base64").toString("utf-8");
  const [publicKey, secretKey] = decoded.split(":");

  if (!publicKey || !secretKey) {
    throw new AuthenticationError("Invalid credentials format");
  }

  const apiKey = await prisma.apiKey.findUnique({
    where: { publicKey },
  });
  if (!apiKey) {
    throw new AuthenticationError("Invalid API key");
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    throw new AuthenticationError("API key expired");
  }

  const valid = await compareSecret(secretKey, apiKey.hashedSecretKey);
  if (!valid) {
    throw new AuthenticationError("Invalid API key");
  }

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  });

  return { projectId: apiKey.projectId, apiKeyId: apiKey.id };
}
