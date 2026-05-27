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

    const body = req.body;
    const items = Array.isArray(body) ? body : [body];
    if (items.length === 0) {
      return res.status(400).json({ error: "At least one score required" });
    }
    if (items.length > 100) {
      return res.status(400).json({ error: "Batch size exceeds 100" });
    }

    const results = [];
    const errors = [];

    for (const item of items) {
      const { traceId, observationId, name, value, stringValue, dataType, comment } = item;
      if (!traceId || !name) {
        errors.push({ item, error: "traceId and name required" });
        continue;
      }

      let resolvedDataType = dataType;
      if (!resolvedDataType) {
        const config = await prisma.scoreConfig.findUnique({
          where: { projectId_name: { projectId: apiKey.projectId, name } },
        });
        if (config) resolvedDataType = config.dataType;
        else {
          errors.push({ item, error: "dataType required when no config exists" });
          continue;
        }
      }

      if (resolvedDataType === "CATEGORICAL" && !stringValue) {
        errors.push({ item, error: "stringValue required for CATEGORICAL scores" });
        continue;
      }
      if (
        (resolvedDataType === "NUMERIC" || resolvedDataType === "BOOLEAN") &&
        value === undefined
      ) {
        errors.push({ item, error: "value required for NUMERIC/BOOLEAN scores" });
        continue;
      }

      const config = await prisma.scoreConfig.findUnique({
        where: { projectId_name: { projectId: apiKey.projectId, name } },
      });

      try {
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
        results.push({
          id: score.id,
          traceId: score.traceId,
          name: score.name,
          value: score.value,
          stringValue: score.stringValue,
          source: score.source,
          createdAt: score.createdAt.toISOString(),
        });
      } catch (err) {
        errors.push({ item, error: err instanceof Error ? err.message : String(err) });
      }
    }

    if (errors.length > 0 && results.length === 0) {
      return res.status(400).json({ errors });
    }

    return res.status(201).json({
      scores: results,
      errors: errors.length > 0 ? errors : undefined,
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
