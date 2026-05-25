import { Worker } from "bullmq";
import Redis from "ioredis";
import { queueNames, type QueueJobMap } from "@constell/shared/src/server";

const redisConnection = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_AUTH,
  maxRetriesPerRequest: null,
});

export function createBullMQWorkers(): Worker[] {
  const workers: Worker[] = [];

  // Placeholder worker for ingestion-queue
  const ingestionWorker = new Worker<QueueJobMap[(typeof queueNames)["ingestion"]]>(
    queueNames.ingestion,
    async (job) => {
      console.log(`[ingestion] Processing job ${job.id}`, job.data.projectId);
      // Placeholder: actual processor in v0.3.0
      return { processed: true };
    },
    { connection: redisConnection, concurrency: 5 }
  );
  workers.push(ingestionWorker);

  // Placeholder worker for blobstorage-queue
  const blobWorker = new Worker<QueueJobMap[(typeof queueNames)["blobStorage"]]>(
    queueNames.blobStorage,
    async (job) => {
      console.log(`[blobstorage] Processing job ${job.id}`, job.data.key);
      return { processed: true };
    },
    { connection: redisConnection, concurrency: 2 }
  );
  workers.push(blobWorker);

  return workers;
}

export async function closeWorkers(workers: Worker[]): Promise<void> {
  await Promise.all(workers.map((w) => w.close()));
  await redisConnection.quit();
}
