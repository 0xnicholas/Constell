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

    const { name, dataType, description, minValue, maxValue } = req.body;
    if (!name || !dataType) {
      return res.status(400).json({ error: "name and dataType required" });
    }

    try {
      const config = await prisma.scoreConfig.create({
        data: {
          projectId: apiKey.projectId,
          name,
          dataType,
          description,
          minValue,
          maxValue,
        },
      });
      return res.status(201).json({ id: config.id, name: config.name, dataType: config.dataType });
    } catch (err) {
      if (err instanceof Error && err.message.includes("Unique constraint")) {
        return res.status(409).json({ error: `Score config "${name}" already exists` });
      }
      throw err;
    }
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

    const configs = await prisma.scoreConfig.findMany({
      where: { projectId: apiKey.projectId },
      orderBy: { createdAt: "asc" },
    });

    return res.status(200).json({
      configs: configs.map((c) => ({
        id: c.id,
        name: c.name,
        dataType: c.dataType,
        description: c.description,
        minValue: c.minValue,
        maxValue: c.maxValue,
      })),
    });
  }

  res.setHeader("Allow", ["POST", "GET"]);
  return res.status(405).json({ error: "Method not allowed" });
}
