/**
 * Queue name contracts and job type definitions.
 * Owned by @constell/shared; consumed by web (producers) and worker (consumers).
 */

export const queueNames = {
  ingestion: "ingestion-queue",
  blobStorage: "blobstorage-queue",
  promptCache: "prompt-cache-queue",
} as const;

export type QueueName = (typeof queueNames)[keyof typeof queueNames];

// ─── Job Payloads ───

export interface IngestionJob {
  batch: unknown[];
  projectId: string;
  apiKeyId: string;
}

export interface BlobStorageJob {
  key: string;
  bucket: string;
  payload: Buffer;
}

export interface PromptCacheJob {
  projectId: string;
  promptName: string;
  action: "invalidate" | "warm";
}

export type QueueJobMap = {
  [queueNames.ingestion]: IngestionJob;
  [queueNames.blobStorage]: BlobStorageJob;
  [queueNames.promptCache]: PromptCacheJob;
};
