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

    if (req.method === "POST") {
      const { datasetName, input, expectedOutput, metadata, sourceTraceId, sourceObservationId } =
        req.body;
      if (!datasetName) return res.status(400).json({ error: "datasetName required" });

      const dataset = await prisma.dataset.findUnique({
        where: { projectId_name: { projectId, name: datasetName } },
      });
      if (!dataset) return res.status(404).json({ error: "Dataset not found" });

      const item = await prisma.datasetItem.create({
        data: {
          projectId,
          datasetId: dataset.id,
          input,
          expectedOutput,
          metadata,
          sourceTraceId,
          sourceObservationId,
        },
      });
      return res.status(201).json(item);
    }

    if (req.method === "GET") {
      const { datasetName, page = "0", limit = "50" } = req.query;
      const where: Record<string, unknown> = { projectId };
      if (datasetName) {
        const dataset = await prisma.dataset.findUnique({
          where: { projectId_name: { projectId, name: String(datasetName) } },
        });
        if (!dataset) return res.status(404).json({ error: "Dataset not found" });
        where.datasetId = dataset.id;
      }
      const [data, totalCount] = await Promise.all([
        prisma.datasetItem.findMany({
          where,
          skip: Number(page) * Number(limit),
          take: Number(limit),
          orderBy: { createdAt: "asc" },
        }),
        prisma.datasetItem.count({ where }),
      ]);
      return res
        .status(200)
        .json({ data, meta: { totalCount, page: Number(page), limit: Number(limit) } });
    }

    res.setHeader("Allow", ["POST", "GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
}
