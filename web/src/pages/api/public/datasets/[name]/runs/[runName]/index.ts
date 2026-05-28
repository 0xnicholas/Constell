import type { NextApiRequest, NextApiResponse } from "next";
import { validateApiKey } from "~/features/public-api/server/apiKeyAuth";
import { prisma } from "@constell/shared/src/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: "Missing authorization" });
    let apiKey;
    try {
      apiKey = await validateApiKey(auth);
    } catch {
      return res.status(401).json({ error: "Invalid API key" });
    }
    const projectId = apiKey.projectId;
    const name = String(req.query.name);
    const runName = String(req.query.runName);

    const dataset = await prisma.dataset.findUnique({
      where: { projectId_name: { projectId, name } },
    });
    if (!dataset) return res.status(404).json({ error: "Dataset not found" });

    if (req.method === "GET") {
      const run = await prisma.datasetRun.findUnique({
        where: {
          datasetId_projectId_name: {
            datasetId: dataset.id,
            projectId,
            name: runName,
          },
        },
        include: { runItems: { include: { datasetItem: true } } },
      });
      if (!run) return res.status(404).json({ error: "Run not found" });
      return res.status(200).json(run);
    }

    if (req.method === "DELETE") {
      await prisma.datasetRun.delete({
        where: {
          datasetId_projectId_name: {
            datasetId: dataset.id,
            projectId,
            name: runName,
          },
        },
      });
      return res.status(200).json({ message: "Run deleted" });
    }

    res.setHeader("Allow", ["GET", "DELETE"]);
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
}
