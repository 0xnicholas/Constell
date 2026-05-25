import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@constell/shared/src/db";
import { pingClickHouse } from "@constell/shared/src/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const checks: Record<string, string> = {};
  let healthy = true;

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.postgres = "ok";
  } catch {
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

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    service: "web",
    checks,
  });
}
