import type { NextApiRequest, NextApiResponse } from "next";
import { validateApiKey } from "~/features/public-api/server/apiKeyAuth";
import { BaseError } from "@constell/shared";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { projectId } = await validateApiKey(req.headers.authorization);

    // Placeholder: v0.3.0 will implement deep validation + queue enqueue
    return res.status(202).json({
      batchId: `batch_${Date.now()}`,
      projectId,
      message: "Accepted (placeholder)",
    });
  } catch (err) {
    if (err instanceof BaseError) {
      return res.status(err.statusCode).json({ error: err.code, message: err.message });
    }
    console.error("Ingestion error:", err);
    return res.status(500).json({
      error: "INTERNAL_ERROR",
      message: "Internal server error",
    });
  }
}
