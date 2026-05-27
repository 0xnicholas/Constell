import type { Job } from "bullmq";
import type { ExportJob } from "@constell/shared/src/server";
import { getClickHouseClient } from "@constell/shared/src/server";
import { uploadExportBuffer } from "./exportWriter.js";
import { stringify } from "csv-stringify";
import Redis from "ioredis";

const EXPIRES_AT_HOURS = 24;
const REDIS_BACKUP_TTL_SECONDS = 24 * 60 * 60;

const s3Prefix = process.env.CONSTELL_S3_BATCH_EXPORT_PREFIX ?? "exports/";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_AUTH,
  maxRetriesPerRequest: null,
});

export async function processExportJob(job: Job<ExportJob>) {
  const { projectId, from, to, format, scope } = job.data;
  const ch = getClickHouseClient();

  const table = scope === "traces" ? "traces_wide" : "observations_wide";
  const timeCol = scope === "traces" ? "created_at" : "start_time";

  const query = `
    SELECT *
    FROM ${table} FINAL
    WHERE project_id = {projectId: String}
      AND ${timeCol} >= {from: String}
      AND ${timeCol} <= {to: String}
    ORDER BY ${timeCol}
  `;

  const resultSet = await ch.query({
    query,
    query_params: { projectId, from, to },
    format: "JSONEachRow",
  });

  // Build export body in streaming fashion to keep memory bounded
  // (no intermediate array holding all rows)
  const chunks: Buffer[] = [];
  let rowCount = 0;

  if (format === "jsonl") {
    for await (const batch of resultSet.stream()) {
      for (const row of batch) {
        chunks.push(Buffer.from(JSON.stringify(row.json()) + "\n", "utf-8"));
        rowCount++;
      }
    }
  } else {
    // CSV via streaming transform — no full-row buffering.
    // Beta simplification: raw CH column names are used as headers
    // (human-readable mapping is a post-v0.5.0 improvement).
    const csvStream = stringify({ header: true });
    const csvBuffers: Buffer[] = [];
    csvStream.on("data", (chunk: Buffer) => csvBuffers.push(chunk));

    for await (const batch of resultSet.stream()) {
      for (const row of batch) {
        csvStream.write(row.json() as Record<string, unknown>);
        rowCount++;
      }
    }
    csvStream.end();
    await new Promise<void>((resolve, reject) => {
      csvStream.on("end", resolve);
      csvStream.on("error", reject);
    });
    chunks.push(...csvBuffers);
  }

  if (rowCount === 0) {
    chunks.push(Buffer.from(format === "jsonl" ? "" : "no data\n", "utf-8"));
  }

  const body = Buffer.concat(chunks);
  const timestamp = Date.now();
  const key = `${s3Prefix}${projectId}/${scope}_${from}_${to}_${timestamp}.${format}`;

  const { url } = await uploadExportBuffer({
    key,
    body,
    contentType: format === "jsonl" ? "application/x-ndjson" : "text/csv",
  });

  const expiresAt = new Date(Date.now() + EXPIRES_AT_HOURS * 60 * 60 * 1000).toISOString();

  // Write Redis backup so the status endpoint can survive BullMQ retention cleanup
  await redis.setex(
    `export-result:${job.id}`,
    REDIS_BACKUP_TTL_SECONDS,
    JSON.stringify({ projectId, downloadUrl: url, expiresAt })
  );

  return { downloadUrl: url, expiresAt };
}
