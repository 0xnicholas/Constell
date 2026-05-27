import { Worker } from "bullmq";
import Redis from "ioredis";
import { queueNames, type QueueJobMap } from "@constell/shared/src/server";
import { processIngestionJob } from "./ingestionProcessor.js";
import { processPromptCacheJob } from "./promptCacheWorker.js";

export interface WorkerManager {
  workers: Worker[];
  redis: Redis;
}

export function createBullMQWorkers(): WorkerManager {
  const redis = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_AUTH,
    maxRetriesPerRequest: null,
  });

  const workers: Worker[] = [];

  const ingestionWorker = new Worker<QueueJobMap[(typeof queueNames)["ingestion"]]>(
    queueNames.ingestion,
    async (job) => {
      console.log(`[ingestion] Processing job ${job.id}`, job.data.projectId);
      return processIngestionJob(job);
    },
    { connection: redis, concurrency: 5 }
  );
  workers.push(ingestionWorker);

  const blobWorker = new Worker<QueueJobMap[(typeof queueNames)["blobStorage"]]>(
    queueNames.blobStorage,
    async (job) => {
      console.log(`[blobstorage] Processing job ${job.id}`, job.data.key);
      return { processed: true };
    },
    { connection: redis, concurrency: 2 }
  );
  workers.push(blobWorker);

  const promptCacheWorker = new Worker<QueueJobMap[(typeof queueNames)["promptCache"]]>(
    queueNames.promptCache,
    async (job) => {
      console.log(`[prompt-cache] Processing job ${job.id}`, job.data.promptName, job.data.action);
      return processPromptCacheJob(job, redis);
    },
    { connection: redis, concurrency: 2 }
  );
  workers.push(promptCacheWorker);

  return { workers, redis };
}

export async function closeWorkers(manager: WorkerManager): Promise<void> {
  await Promise.all(manager.workers.map((w) => w.close()));
  await manager.redis.quit();
}
