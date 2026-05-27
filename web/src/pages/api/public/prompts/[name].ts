import type { NextApiRequest, NextApiResponse } from "next";
import { validateApiKey } from "~/features/public-api/server/apiKeyAuth";
import { prisma } from "@constell/shared/src/db";
import { getPromptFromCache, setPromptInCache } from "@constell/shared/src/server";
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_AUTH,
  maxRetriesPerRequest: 1,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Missing authorization" });

  let apiKey;
  try {
    apiKey = await validateApiKey(auth);
  } catch {
    return res.status(401).json({ error: "Invalid API key" });
  }

  const { name } = req.query;
  const label = typeof req.query.version === "string" ? req.query.version : "latest";
  if (typeof name !== "string") return res.status(400).json({ error: "Invalid name" });

  const cached = await getPromptFromCache(apiKey.projectId, name, label, redis);
  if (cached) return res.status(200).json(cached);

  const prompt = await prisma.prompt.findFirst({
    where: { projectId: apiKey.projectId, name },
    include: {
      versions: { include: { labels: true }, orderBy: { version: "desc" } },
    },
  });
  if (!prompt) return res.status(404).json({ error: "Prompt not found" });

  const version =
    label === "latest"
      ? prompt.versions[0]
      : prompt.versions.find((v) => v.labels.some((l) => l.label === label));
  if (!version) return res.status(404).json({ error: `Version '${label}' not found` });

  const result = {
    content: version.content,
    config: version.config as Record<string, unknown> | null,
    version: version.version,
  };
  await setPromptInCache(apiKey.projectId, name, label, result, redis);
  return res.status(200).json(result);
}
