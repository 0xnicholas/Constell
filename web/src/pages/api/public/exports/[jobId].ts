import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../../server/auth";
import { validateApiKey } from "../../../../features/public-api/server/apiKeyAuth";
import { Job, Queue } from "bullmq";
import Redis from "ioredis";
import { queueNames, type ExportJob } from "@constell/shared/src/server";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_AUTH,
  maxRetriesPerRequest: null,
});

const exportQueue = new Queue<ExportJob>(queueNames.export, { connection: redis });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { jobId } = req.query;
  if (typeof jobId !== "string") {
    return res.status(400).json({ error: "Invalid jobId" });
  }

  // Resolve auth
  const session = await getServerSession(req, res, authOptions);
  let apiKey: { projectId: string; apiKeyId: string } | null = null;
  if (!session && req.headers.authorization) {
    try {
      apiKey = await validateApiKey(req.headers.authorization);
    } catch {
      apiKey = null;
    }
  }

  const callerProjectId = session?.projectId ?? apiKey?.projectId ?? null;
  if (!callerProjectId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Lookup job
  const job = await Job.fromId(exportQueue, jobId);
  if (!job) {
    // Fallback to Redis backup
    const backup = await redis.get(`export-result:${jobId}`);
    if (!backup) {
      return res.status(404).json({ error: "Export job not found" });
    }
    const parsed = JSON.parse(backup) as {
      projectId: string;
      downloadUrl: string;
      expiresAt: string;
    };
    if (parsed.projectId !== callerProjectId) {
      return res.status(404).json({ error: "Export job not found" });
    }
    return res
      .status(200)
      .json({ status: "completed", downloadUrl: parsed.downloadUrl, expiresAt: parsed.expiresAt });
  }

  const jobProjectId = (job.data as ExportJob).projectId;
  if (jobProjectId !== callerProjectId) {
    return res.status(404).json({ error: "Export job not found" });
  }

  const state = await job.getState();

  if (state === "completed" && job.returnvalue) {
    const rv = job.returnvalue as { downloadUrl: string; expiresAt: string };
    return res
      .status(200)
      .json({ status: "completed", downloadUrl: rv.downloadUrl, expiresAt: rv.expiresAt });
  }

  if (state === "failed") {
    return res.status(500).json({ status: "failed", error: job.failedReason || "Unknown error" });
  }

  return res.status(202).json({ status: "pending" });
}
