import express from "express";
import Redis from "ioredis";
import { createBullMQWorkers, closeWorkers } from "./queues/workerManager.js";
import { pingClickHouse } from "@constell/shared/src/server";
import { prisma } from "@constell/shared/src/db";

const app = express();
const PORT = process.env.PORT || 3030;

app.use(express.json());

app.get("/health", async (_req, res) => {
  const checks: Record<string, string> = {};
  let healthy = true;

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.postgres = "ok";
  } catch (e) {
    checks.postgres = "error";
    healthy = false;
  }

  try {
    const chOk = await pingClickHouse();
    checks.clickhouse = chOk ? "ok" : "error";
    if (!chOk) healthy = false;
  } catch {
    checks.clickhouse = "error";
    healthy = false;
  }

  try {
    const redis = new Redis({
      host: process.env.REDIS_HOST || "localhost",
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_AUTH,
      maxRetriesPerRequest: 1,
    });
    await redis.ping();
    checks.redis = "ok";
    await redis.quit();
  } catch {
    checks.redis = "error";
    healthy = false;
  }

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    service: "worker",
    checks,
  });
});

const server = app.listen(PORT, () => {
  console.log(`Worker listening on port ${PORT}`);
});

const workers = createBullMQWorkers();

async function shutdown(signal: string) {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    await closeWorkers(workers);
    await prisma.$disconnect();
    console.log("Cleanup complete. Exiting.");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
