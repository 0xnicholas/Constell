import { invalidatePromptCache } from "@constell/shared/src/server";
import Redis from "ioredis";
import type { PromptCacheJob } from "@constell/shared/src/server";

export async function processPromptCacheJob(
  job: { data: PromptCacheJob },
  redis: Redis
): Promise<{ ok: boolean }> {
  const { projectId, promptName, action } = job.data;
  if (action === "invalidate") {
    await invalidatePromptCache(projectId, promptName, redis);
  }
  // "warm" action could pre-fetch from DB and set cache here if needed later
  return { ok: true };
}
