import type { NextApiRequest, NextApiResponse } from "next";
import { validateApiKey } from "~/features/public-api/server/apiKeyAuth";
import { prisma } from "@constell/shared/src/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "Missing authorization" });

    let apiKey;
    try {
      apiKey = await validateApiKey(auth);
    } catch {
      return res.status(401).json({ error: "Invalid API key" });
    }

    const { traceId, observationId, name, value, stringValue, dataType, comment } = req.body;
    if (!traceId || !name) {
      return res.status(400).json({ error: "traceId and name required" });
    }

    // Resolve or infer dataType
    let resolvedDataType = dataType;
    if (!resolvedDataType) {
      const config = await prisma.scoreConfig.findUnique({
        where: { projectId_name: { projectId: apiKey.projectId, name } },
      });
      if (config) resolvedDataType = config.dataType;
      else return res.status(400).json({ error: "dataType required when no config exists" });
    }

    if (resolvedDataType === "CATEGORICAL" && !stringValue) {
      return res.status(400).json({ error: "stringValue required for CATEGORICAL scores" });
    }
    if ((resolvedDataType === "NUMERIC" || resolvedDataType === "BOOLEAN") && value === undefined) {
      return res.status(400).json({ error: "value required for NUMERIC/BOOLEAN scores" });
    }

    const config = await prisma.scoreConfig.findUnique({
      where: { projectId_name: { projectId: apiKey.projectId, name } },
    });

    const score = await prisma.score.create({
      data: {
        projectId: apiKey.projectId,
        traceId,
        observationId: observationId ?? null,
        name,
        configId: config?.id ?? null,
        value: value ?? (resolvedDataType === "BOOLEAN" ? 0 : 0),
        stringValue: stringValue ?? null,
        source: "API",
        comment: comment ?? null,
      },
    });

    return res.status(201).json({
      id: score.id,
      traceId: score.traceId,
      name: score.name,
      value: score.value,
      stringValue: score.stringValue,
      source: score.source,
      createdAt: score.createdAt.toISOString(),
    });
  }

  if (req.method === "GET") {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "Missing authorization" });

    let apiKey;
    try {
      apiKey = await validateApiKey(auth);
    } catch {
      return res.status(401).json({ error: "Invalid API key" });
    }

    const { traceId, name, limit = "50", offset = "0" } = req.query;

    const where: Record<string, unknown> = { projectId: apiKey.projectId };
    if (typeof traceId === "string") where.traceId = traceId;
    if (typeof name === "string") where.name = name;

    const scores = await prisma.score.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: Number(limit),
      skip: Number(offset),
    });

    return res.status(200).json({
      scores: scores.map((s) => ({
        id: s.id,
        traceId: s.traceId,
        observationId: s.observationId,
        name: s.name,
        value: s.value,
        stringValue: s.stringValue,
        source: s.source,
        comment: s.comment,
        createdAt: s.createdAt.toISOString(),
      })),
    });
  }

  res.setHeader("Allow", ["POST", "GET"]);
  return res.status(405).json({ error: "Method not allowed" });
}
