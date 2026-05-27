import type { NextApiRequest, NextApiResponse } from "next";
import { validateApiKey } from "~/features/public-api/server/apiKeyAuth";
import { prisma } from "@constell/shared/src/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Missing authorization" });

  let apiKey;
  try {
    apiKey = await validateApiKey(auth);
  } catch {
    return res.status(401).json({ error: "Invalid API key" });
  }

  const { id } = req.query;
  if (typeof id !== "string") return res.status(400).json({ error: "Invalid id" });

  const score = await prisma.score.findFirst({
    where: { id, projectId: apiKey.projectId },
  });
  if (!score) return res.status(404).json({ error: "Score not found" });

  if (req.method === "GET") {
    return res.status(200).json({
      id: score.id,
      traceId: score.traceId,
      observationId: score.observationId,
      name: score.name,
      value: score.value,
      stringValue: score.stringValue,
      source: score.source,
      comment: score.comment,
      createdAt: score.createdAt.toISOString(),
    });
  }

  if (req.method === "PUT") {
    if (score.source === "EVAL") {
      return res.status(403).json({ error: "EVAL scores are immutable" });
    }

    const { value, stringValue, comment } = req.body;
    const updated = await prisma.score.update({
      where: { id },
      data: { value, stringValue, comment },
    });

    return res.status(200).json({
      id: updated.id,
      value: updated.value,
      stringValue: updated.stringValue,
      comment: updated.comment,
    });
  }

  if (req.method === "DELETE") {
    if (score.source === "EVAL") {
      return res.status(403).json({ error: "EVAL scores are immutable" });
    }

    await prisma.score.delete({ where: { id } });
    return res.status(200).json({ success: true });
  }

  res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
  return res.status(405).json({ error: "Method not allowed" });
}
