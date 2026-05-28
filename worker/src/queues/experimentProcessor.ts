import { type Job } from "bullmq";
import { type DatasetRunJob } from "@constell/shared/src/server";
import { prisma } from "@constell/shared/src/db";
import { callLlm } from "@constell/shared/src/server";
import { getClickHouseClient } from "@constell/shared/src/server";
import { calculateCost } from "../services/costCalculator.js";

// ─── Prompt rendering ───

function renderPromptVariables(template: string, input: unknown): string {
  if (typeof input === "string") {
    return template.replace(/\{\{input\}\}/g, input);
  }
  if (input && typeof input === "object") {
    return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
      const val = (input as Record<string, unknown>)[key];
      return val !== undefined ? String(val) : _match;
    });
  }
  return template;
}

// ─── Eval helpers ───

function renderEvalPrompt(template: string, ctx: { input: string; output: string }): string {
  return template.replace(/\{trace\.input\}/g, ctx.input).replace(/\{trace\.output\}/g, ctx.output);
}

function parseEvalOutput(content: string, schema: unknown): unknown {
  if (!schema) return content;
  const s = schema as { type?: string; path?: string };
  if (!s.path) return content;

  let jsonStr = content;
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) jsonStr = codeBlockMatch[1];

  try {
    const obj = JSON.parse(jsonStr);
    const parts = s.path.split(".");
    let val: unknown = obj;
    for (const part of parts) {
      val = (val as Record<string, unknown>)?.[part];
    }
    return val;
  } catch {
    const num = Number(content.trim());
    if (!Number.isNaN(num)) return num;
    if (content.trim().toLowerCase() === "true") return true;
    if (content.trim().toLowerCase() === "false") return false;
    return content.trim();
  }
}

// ─── Trace ingestion ───

async function ingestTraceViaPipeline(params: {
  projectId: string;
  runId: string;
  datasetItemId: string;
  input: string;
  output: string;
  model: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  latencyMs: number;
}): Promise<{ traceId: string; observationId: string }> {
  const traceId = `trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const observationId = `obs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const cost = await calculateCost(
    params.model,
    params.usage?.prompt_tokens ?? null,
    params.usage?.completion_tokens ?? null
  );

  await prisma.trace.create({
    data: {
      id: traceId,
      projectId: params.projectId,
      name: `dataset-run-${params.runId}`,
      metadata: { datasetRunId: params.runId, datasetItemId: params.datasetItemId },
      latencyMs: Math.round(params.latencyMs),
      totalTokens: params.usage?.total_tokens ?? 0,
      totalCost: cost ?? undefined,
    },
  });

  await prisma.observation.create({
    data: {
      id: observationId,
      traceId,
      projectId: params.projectId,
      type: "GENERATION",
      input: params.input,
      output: params.output,
      model: params.model,
      inputTokens: params.usage?.prompt_tokens ?? 0,
      outputTokens: params.usage?.completion_tokens ?? 0,
      totalTokens: params.usage?.total_tokens ?? 0,
      calculatedCost: cost ?? undefined,
    },
  });

  return { traceId, observationId };
}

// ─── Prompts resolution ───

async function resolvePromptContent(promptId: string, version?: number | null): Promise<string> {
  const prompt = await prisma.prompt.findUnique({
    where: { id: promptId },
    include: { versions: { orderBy: { version: "desc" } } },
  });
  if (!prompt) throw new Error(`Prompt ${promptId} not found`);

  let pv = version ? prompt.versions.find((v) => v.version === version) : prompt.versions[0];
  if (!pv) throw new Error(`Prompt version ${version} not found for prompt ${promptId}`);

  return pv.content;
}

// ─── Main processor ───

export async function processExperimentJob(job: Job<DatasetRunJob>): Promise<void> {
  const { projectId, datasetId, datasetRunId, ...execParams } = job.data;

  // 1. Update status to RUNNING
  await prisma.datasetRun.update({
    where: { id: datasetRunId, projectId },
    data: { status: "RUNNING" },
  });

  // 2. Fetch dataset + items
  const dataset = await prisma.dataset.findUnique({
    where: { id: datasetId, projectId },
    include: { items: { where: { status: "ACTIVE" } } },
  });

  if (!dataset || dataset.items.length === 0) {
    await prisma.datasetRun.update({
      where: { id: datasetRunId, projectId },
      data: {
        status: "FAILED",
        metadata: { error: "No active items in dataset" },
      },
    });
    return;
  }

  // 3. Resolve prompt content (once, if prompt is configured)
  let promptContent: string | null = null;
  if (execParams.promptId) {
    try {
      promptContent = await resolvePromptContent(execParams.promptId, execParams.promptVersion);
    } catch (err) {
      await prisma.datasetRun.update({
        where: { id: datasetRunId, projectId },
        data: {
          status: "FAILED",
          metadata: { error: (err as Error).message },
        },
      });
      return;
    }
  }

  const failures: Array<{ itemId: string; reason: string }> = [];

  // 4. Process each item
  for (const item of dataset.items) {
    try {
      // 4a. Render prompt
      const rendered = promptContent
        ? renderPromptVariables(promptContent, item.input)
        : JSON.stringify(item.input ?? "");

      // 4b. LLM call
      const llmRes = await callLlm({
        model: execParams.model,
        messages: [{ role: "user", content: rendered }],
        modelParams: execParams.modelParams,
      });

      // 4c. Ingest trace + observation via pipeline
      const { traceId, observationId } = await ingestTraceViaPipeline({
        projectId,
        runId: datasetRunId,
        datasetItemId: item.id,
        input: rendered,
        output: llmRes.content,
        model: execParams.model,
        usage: llmRes.usage,
        latencyMs: llmRes.latencyMs,
      });

      // 4d. Create DatasetRunItem
      await prisma.datasetRunItem.create({
        data: {
          projectId,
          datasetRunId,
          datasetItemId: item.id,
          traceId,
          observationId,
        },
      });

      // 4e. Inline eval scoring
      for (const templateId of execParams.evalTemplateIds) {
        try {
          const template = await prisma.evalTemplate.findUnique({
            where: { id: templateId },
          });
          if (!template) continue;

          const evalPrompt = renderEvalPrompt(template.prompt, {
            input: rendered,
            output: llmRes.content,
          });
          const evalLlmRes = await callLlm({
            model: template.model,
            messages: [{ role: "user", content: evalPrompt }],
            modelParams: { temperature: template.temperature ?? 0 },
          });
          const parsed = parseEvalOutput(evalLlmRes.content, template.outputSchema);

          let value = 0;
          let stringValue: string | null = null;

          if (template.scoreDataType === "BOOLEAN") {
            value = parsed ? 1 : 0;
          } else if (template.scoreDataType === "CATEGORICAL") {
            stringValue = String(parsed);
          } else {
            value = Number(parsed) || 0;
          }

          await prisma.score.create({
            data: {
              projectId,
              traceId,
              observationId,
              name: template.scoreName,
              value,
              stringValue,
              source: "EVAL",
            },
          });
        } catch (evalErr) {
          failures.push({
            itemId: item.id,
            reason: `Eval ${templateId}: ${(evalErr as Error).message}`,
          });
        }
      }
    } catch (err) {
      failures.push({ itemId: item.id, reason: (err as Error).message });
    }
  }

  // 5. Finalize run status
  const allFailed = failures.length === dataset.items.length;
  await prisma.datasetRun.update({
    where: { id: datasetRunId, projectId },
    data: {
      status: allFailed ? "FAILED" : "COMPLETED",
      metadata: {
        processedCount: dataset.items.length - failures.length,
        failureCount: failures.length,
        failures: failures.slice(0, 50),
      },
    },
  });
}
