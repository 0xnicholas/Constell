/**
 * Queue name contracts and job type definitions.
 * Owned by @constell/shared; consumed by web (producers) and worker (consumers).
 */

export const queueNames = {
  ingestion: "ingestion-queue",
  blobStorage: "blobstorage-queue",
  promptCache: "prompt-cache-queue",
  export: "export-queue",
} as const;

export type QueueName = (typeof queueNames)[keyof typeof queueNames];

// ─── Job Payloads ───

export interface IngestionJob {
  batch: unknown[];
  projectId: string;
  apiKeyId: string;
}

/**
 * Payload must be base64-encoded before enqueue since BullMQ serializes
 * via JSON.stringify. The worker consumer should decode with
 * `Buffer.from(payload, "base64")`.
 */
export interface BlobStorageJob {
  key: string;
  bucket: string;
  payload: string; // base64-encoded
}

export interface PromptCacheJob {
  projectId: string;
  promptName: string;
  action: "invalidate" | "warm";
}

export interface ExportJob {
  projectId: string;
  from: string;
  to: string;
  format: "jsonl" | "csv";
  scope: "traces" | "observations";
  requestedBy: { userId?: string; apiKeyId?: string };
}

export type QueueJobMap = {
  [queueNames.ingestion]: IngestionJob;
  [queueNames.blobStorage]: BlobStorageJob;
  [queueNames.promptCache]: PromptCacheJob;
  [queueNames.export]: ExportJob;
};
