import type { NextApiRequest, NextApiResponse } from "next";
import { validateApiKey } from "~/features/public-api/server/apiKeyAuth";
import { prisma } from "@constell/shared/src/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "Missing authorization" });

  let apiKey;
  try {
    apiKey = await validateApiKey(auth);
  } catch {
    return res.status(401).json({ error: "Invalid API key" });
  }

  const { name, content, config } = req.body;
  if (!name || !content) return res.status(400).json({ error: "name and content required" });

  const prompt = await prisma.prompt.create({
    data: {
      projectId: apiKey.projectId,
      name,
      versions: {
        create: {
          version: 1,
          content,
          config: config ?? {},
          createdBy: "api",
        },
      },
    },
    include: { versions: true },
  });

  return res.status(201).json(prompt);
}
