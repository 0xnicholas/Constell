/**
 * Shared eval helpers used by both evalProcessor and experimentProcessor.
 */

export function renderEvalPrompt(template: string, ctx: { input: string; output: string }): string {
  return template.replace(/\{trace\.input\}/g, ctx.input).replace(/\{trace\.output\}/g, ctx.output);
}

export function parseEvalOutput(content: string, schema: unknown): unknown {
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
