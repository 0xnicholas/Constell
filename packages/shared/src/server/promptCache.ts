import Redis from "ioredis";

export interface CachedPrompt {
  content: string;
  config: Record<string, unknown> | null;
  version: number;
}

function cacheKey(projectId: string, promptName: string, label: string): string {
  return `prompt-cache:v1:${projectId}:${promptName}:${label}`;
}

export async function getPromptFromCache(
  projectId: string,
  promptName: string,
  label: string,
  redis: Redis
): Promise<CachedPrompt | null> {
  const raw = await redis.get(cacheKey(projectId, promptName, label));
  if (!raw) return null;
  return JSON.parse(raw) as CachedPrompt;
}

export async function setPromptInCache(
  projectId: string,
  promptName: string,
  label: string,
  prompt: CachedPrompt,
  redis: Redis,
  ttlSeconds = 60
): Promise<void> {
  await redis.setex(cacheKey(projectId, promptName, label), ttlSeconds, JSON.stringify(prompt));
}

export async function invalidatePromptCache(
  projectId: string,
  promptName: string,
  redis: Redis
): Promise<void> {
  const pattern = cacheKey(projectId, promptName, "*");
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
