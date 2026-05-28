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
    const id = String(req.query.id);

    if (req.method === "GET") {
      const item = await prisma.datasetItem.findFirst({
        where: { id, projectId: apiKey.projectId },
      });
      if (!item) return res.status(404).json({ error: "Item not found" });
      return res.status(200).json(item);
    }

    if (req.method === "DELETE") {
      await prisma.datasetItem.deleteMany({
        where: { id, projectId: apiKey.projectId },
      });
      return res.status(200).json({ message: "Item deleted" });
    }

    res.setHeader("Allow", ["GET", "DELETE"]);
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
}
