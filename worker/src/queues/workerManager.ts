import { Worker } from "bullmq";
import Redis from "ioredis";
import { queueNames, type QueueJobMap } from "@constell/shared/src/server";
import { processIngestionJob } from "./ingestionProcessor.js";
import { processPromptCacheJob } from "./promptCacheWorker.js";
import { processExportJob } from "./exportProcessor.js";
import { processEvalJob } from "./evalProcessor.js";
import { processExperimentJob } from "./experimentProcessor.js";

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

  const exportWorker = new Worker<QueueJobMap[(typeof queueNames)["export"]]>(
    queueNames.export,
    async (job) => {
      console.log(`[export] Processing job ${job.id}`, job.data.projectId, job.data.scope);
      return processExportJob(job);
    },
    {
      connection: redis,
      concurrency: 2,
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 500 },
    }
  );
  workers.push(exportWorker);

  const evalWorker = new Worker<QueueJobMap[(typeof queueNames)["eval"]]>(
    queueNames.eval,
    async (job) => {
      console.log(`[eval] Processing job ${job.id}`, job.data.projectId, job.data.templateId);
      return processEvalJob(job);
    },
    { connection: redis, concurrency: 1 }
  );
  workers.push(evalWorker);

  const datasetRunWorker = new Worker<QueueJobMap[(typeof queueNames)["datasetRun"]]>(
    queueNames.datasetRun,
    async (job) => {
      console.log(`[dataset-run] Processing job ${job.id}`, job.data.datasetRunId);
      return processExperimentJob(job);
    },
    { connection: redis, concurrency: 1 }
  );
  workers.push(datasetRunWorker);

  return { workers, redis };
}

export async function closeWorkers(manager: WorkerManager): Promise<void> {
  await Promise.all(manager.workers.map((w) => w.close()));
  await manager.redis.quit();
}
