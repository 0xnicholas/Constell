import type { NextApiRequest, NextApiResponse } from "next";
import { validateApiKey } from "~/features/public-api/server/apiKeyAuth";
import { prisma } from "@constell/shared/src/db";
import { queueNames, type DatasetRunJob } from "@constell/shared/src/server";
import { Queue } from "bullmq";
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_AUTH,
  maxRetriesPerRequest: null,
});
const datasetRunQueue = new Queue<DatasetRunJob>(queueNames.datasetRun, {
  connection: redis,
});

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
      const {
        datasetName,
        runName,
        description,
        presetName,
        promptName,
        promptVersion,
        model,
        modelParams,
        evalTemplateNames,
      } = req.body;
      if (!datasetName || !runName)
        return res.status(400).json({ error: "datasetName and runName required" });

      const dataset = await prisma.dataset.findUnique({
        where: { projectId_name: { projectId, name: datasetName } },
      });
      if (!dataset) return res.status(404).json({ error: "Dataset not found" });

      let execParams: {
        model: string;
        promptId?: string;
        promptVersion?: number;
        modelParams?: Record<string, unknown>;
        evalTemplateIds: string[];
      };

      if (presetName) {
        const preset = await prisma.datasetRunPreset.findUnique({
          where: { projectId_name: { projectId, name: presetName } },
        });
        if (!preset) return res.status(404).json({ error: "Preset not found" });
        execParams = {
          model: preset.model,
          promptId: preset.promptId ?? undefined,
          promptVersion: preset.promptVersion ?? undefined,
          modelParams: (preset.modelParams as Record<string, unknown>) ?? undefined,
          evalTemplateIds: preset.evalTemplateIds,
        };
      } else if (model) {
        let promptId: string | undefined;
        if (promptName) {
          const prompt = await prisma.prompt.findUnique({
            where: { projectId_name: { projectId, name: promptName } },
          });
          if (prompt) promptId = prompt.id;
        }
        const evalIds: string[] = [];
        if (evalTemplateNames?.length) {
          for (const etName of evalTemplateNames) {
            const et = await prisma.evalTemplate.findUnique({
              where: { projectId_name: { projectId, name: etName } },
            });
            if (et) evalIds.push(et.id);
          }
        }
        execParams = {
          model,
          promptId,
          promptVersion,
          modelParams,
          evalTemplateIds: evalIds,
        };
      } else {
        return res.status(400).json({ error: "Must provide presetName or model" });
      }

      try {
        const run = await prisma.datasetRun.create({
          data: {
            projectId,
            datasetId: dataset.id,
            name: runName,
            description,
            status: "PENDING",
            metadata: { ...execParams, presetName } as never,
          },
        });

        await datasetRunQueue.add(
          run.id,
          {
            projectId,
            datasetId: dataset.id,
            datasetRunId: run.id,
            ...execParams,
          },
          { jobId: run.id }
        );
        return res.status(201).json(run);
      } catch (err) {
        if (err instanceof Error && err.message.includes("Unique constraint")) {
          return res.status(409).json({ error: "Run name already exists for this dataset" });
        }
        throw err;
      }
    }

    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ error: (err as Error).message });
  }
}
