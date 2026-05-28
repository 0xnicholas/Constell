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

    if (req.method === "GET") {
      const ds = await prisma.dataset.findUnique({
        where: { projectId_name: { projectId, name } },
        include: { _count: { select: { items: true, runs: true } } },
      });
      if (!ds) return res.status(404).json({ error: "Dataset not found" });
      return res.status(200).json(ds);
    }

    if (req.method === "DELETE") {
      const ds = await prisma.dataset.findUnique({
        where: { projectId_name: { projectId, name } },
      });
      if (!ds) return res.status(404).json({ error: "Dataset not found" });
      await prisma.dataset.delete({ where: { id: ds.id, projectId } });
      return res.status(200).json({ message: "Dataset deleted" });
    }

    res.setHeader("Allow", ["GET", "DELETE"]);
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
}
