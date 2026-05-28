import { type Job } from "bullmq";
import { type EvalJob } from "@constell/shared/src/server";
import { prisma } from "@constell/shared/src/db";
import { getClickHouseClient } from "@constell/shared/src/server";
import { callLlm } from "@constell/shared/src/server";

export async function processEvalJob(job: Job<EvalJob>): Promise<void> {
  const { projectId, templateId, runId, from, to } = job.data;

  // 1. Load template and run
  const run = await prisma.evalRun.findFirst({
    where: { id: runId, projectId },
    include: { template: true },
  });
  if (!run) throw new Error(`EvalRun ${runId} not found`);
  if (run.status === "CANCELLED") return;

  await prisma.evalRun.update({
    where: { id: runId },
    data: { status: "RUNNING", jobId: job.id?.toString() },
  });

  try {
    // 2. Query traces from ClickHouse
    const ch = getClickHouseClient();
    const conditions = [`project_id = {projectId: String}`];
    if (from) conditions.push(`created_at >= {from: String}`);
    if (to) conditions.push(`created_at <= {to: String}`);

    const traceQuery = `
      SELECT id, input, output, name, user_id, metadata
      FROM traces_wide FINAL
      WHERE ${conditions.join(" AND ")}
      ORDER BY created_at DESC
      LIMIT 1000
    `;
    const params: Record<string, unknown> = { projectId };
    if (from) params.from = from;
    if (to) params.to = to;

    const resultSet = await ch.query({
      query: traceQuery,
      query_params: params,
      format: "JSONEachRow",
    });
    const traces = (await resultSet.json()) as Array<{
      id: string;
      input?: string;
      output?: string;
      name?: string;
      user_id?: string;
      metadata?: string;
    }>;

    await prisma.evalRun.update({
      where: { id: runId },
      data: { traceCount: traces.length },
    });

    // 3. Run judge for each trace
    let scoreCount = 0;
    let scoreSum = 0;
    let processed = 0;
    const errors: string[] = [];

    for (const trace of traces) {
      try {
        const prompt = renderPrompt(run.template.prompt, trace);
        const llmRes = await callLlm({
          model: run.template.model,
          messages: [{ role: "user", content: prompt }],
          modelParams: { temperature: run.template.temperature ?? 0 },
        });
        const parsed = parseOutput(llmRes.content, run.template.outputSchema);

        if (parsed !== null) {
          let value = 0;
          let stringValue: string | null = null;

          if (run.template.scoreDataType === "BOOLEAN") {
            value = parsed ? 1 : 0;
          } else if (run.template.scoreDataType === "CATEGORICAL") {
            stringValue = String(parsed);
          } else {
            value = Number(parsed) || 0;
          }

          await prisma.score.create({
            data: {
              projectId,
              traceId: trace.id,
              name: run.template.scoreName,
              value,
              stringValue,
              source: "EVAL",
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          });

          scoreCount++;
          if (run.template.scoreDataType === "NUMERIC") {
            scoreSum += value;
          }
        }
      } catch (err) {
        errors.push(err instanceof Error ? err.message : String(err));
      }
      processed++;

      // Update progress every 10 traces
      if (processed % 10 === 0) {
        await prisma.evalRun.update({
          where: { id: runId },
          data: { processedCount: processed },
        });
      }
    }

    const averageScore =
      scoreCount > 0 && run.template.scoreDataType === "NUMERIC" ? scoreSum / scoreCount : null;

    await prisma.evalRun.update({
      where: { id: runId },
      data: {
        status: scoreCount > 0 ? "COMPLETED" : "FAILED",
        processedCount: processed,
        scoreCount,
        averageScore,
        errorMessage: errors.length > 0 ? errors.slice(0, 5).join("\n") : null,
      },
    });
  } catch (err) {
    await prisma.evalRun.update({
      where: { id: runId },
      data: {
        status: "FAILED",
        errorMessage: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }
}

function renderPrompt(template: string, trace: Record<string, unknown>): string {
  return template
    .replace(/\{trace\.input\}/g, String(trace.input ?? ""))
    .replace(/\{trace\.output\}/g, String(trace.output ?? ""))
    .replace(/\{trace\.name\}/g, String(trace.name ?? ""))
    .replace(/\{trace\.user_id\}/g, String(trace.user_id ?? ""))
    .replace(/\{trace\.metadata\}/g, String(trace.metadata ?? ""));
}

function parseOutput(content: string, schema: unknown): unknown {
  if (!schema) return content;
  const s = schema as { type?: string; path?: string };
  if (!s.path) return content;

  // Try to extract JSON from markdown code blocks
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
    // Fallback: try to parse the whole content as a number/boolean
    const num = Number(content.trim());
    if (!Number.isNaN(num)) return num;
    if (content.trim().toLowerCase() === "true") return true;
    if (content.trim().toLowerCase() === "false") return false;
    return content.trim();
  }
}
