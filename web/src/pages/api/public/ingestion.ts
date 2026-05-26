import type { NextApiRequest, NextApiResponse } from "next";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { validateApiKey } from "~/features/public-api/server/apiKeyAuth";
import { BaseError } from "@constell/shared";
import { queueNames, type IngestionJob, ingestionBatchSchema } from "@constell/shared/src/server";

let _queue: Queue<IngestionJob> | null = null;

function getIngestionQueue(): Queue<IngestionJob> {
  if (!_queue) {
    const redis = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_AUTH,
      maxRetriesPerRequest: null,
      connectTimeout: 5000,
      lazyConnect: true,
    });
    _queue = new Queue<IngestionJob>(queueNames.ingestion, {
      connection: redis,
    });
  }
  return _queue;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { projectId, apiKeyId } = await validateApiKey(req.headers.authorization);

    const parsed = ingestionBatchSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "VALIDATION_ERROR",
        message: "Invalid batch format",
        details: parsed.error.flatten(),
      });
    }

    const queue = getIngestionQueue();
    const job = await queue.add(
      "ingest-batch",
      {
        batch: parsed.data.batch,
        projectId,
        apiKeyId,
      },
      {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 },
      }
    );

    return res.status(202).json({
      batchId: job.id,
      projectId,
    });
  } catch (err) {
    if (err instanceof BaseError) {
      return res.status(err.statusCode).json({ error: err.code, message: err.message });
    }
    console.error("Ingestion error:", err);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Internal server error",
    });
  }
}
