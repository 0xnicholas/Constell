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
      const { name, description, inputSchema, expectedOutputSchema, metadata } = req.body;
      if (!name) return res.status(400).json({ error: "name required" });

      try {
        const ds = await prisma.dataset.create({
          data: { projectId, name, description, inputSchema, expectedOutputSchema, metadata },
        });
        return res.status(201).json(ds);
      } catch (err) {
        if (err instanceof Error && err.message.includes("Unique constraint")) {
          return res.status(409).json({ error: "Dataset name already exists" });
        }
        throw err;
      }
    }

    if (req.method === "GET") {
      const { page = "0", limit = "20", search } = req.query;
      const where: Record<string, unknown> = { projectId };
      if (search) where.name = { contains: String(search), mode: "insensitive" };

      const [data, totalCount] = await Promise.all([
        prisma.dataset.findMany({
          where,
          skip: Number(page) * Number(limit),
          take: Number(limit),
          orderBy: { createdAt: "desc" },
        }),
        prisma.dataset.count({ where }),
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
