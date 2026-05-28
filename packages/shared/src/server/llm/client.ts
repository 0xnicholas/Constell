export interface LlmCallParams {
  model: string;
  modelParams?: Record<string, unknown>;
  messages: Array<{ role: string; content: string }>;
  apiKey?: string;
}

export interface LlmCallResult {
  content: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  latencyMs: number;
}

export async function callLlm(params: LlmCallParams): Promise<LlmCallResult> {
  const key = params.apiKey ?? process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY not configured");

  const baseUrl = process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1";
  const start = Date.now();

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: params.model,
      messages: params.messages,
      ...(params.modelParams ?? {}),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LLM API error ${res.status}: ${err}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  };

  return {
    content: json.choices?.[0]?.message?.content ?? "",
    usage: json.usage,
    latencyMs: Date.now() - start,
  };
}
