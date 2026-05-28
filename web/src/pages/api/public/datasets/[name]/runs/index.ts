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

    const dataset = await prisma.dataset.findUnique({
      where: { projectId_name: { projectId, name } },
    });
    if (!dataset) return res.status(404).json({ error: "Dataset not found" });

    if (req.method === "GET") {
      const { page = "0", limit = "20" } = req.query;
      const [data, totalCount] = await Promise.all([
        prisma.datasetRun.findMany({
          where: { projectId, datasetId: dataset.id },
          skip: Number(page) * Number(limit),
          take: Number(limit),
          orderBy: { createdAt: "desc" },
        }),
        prisma.datasetRun.count({ where: { projectId, datasetId: dataset.id } }),
      ]);
      return res
        .status(200)
        .json({ data, meta: { totalCount, page: Number(page), limit: Number(limit) } });
    }

    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
}
