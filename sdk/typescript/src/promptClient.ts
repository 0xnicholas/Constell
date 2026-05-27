import type { Prompt } from "./types";

export async function getPrompt(
  baseUrl: string,
  publicKey: string,
  secretKey: string,
  name: string,
  label?: string
): Promise<Prompt> {
  const url = new URL(`/api/public/prompts/${encodeURIComponent(name)}`, baseUrl);
  if (label) url.searchParams.set("version", label);

  const auth = Buffer.from(`${publicKey}:${secretKey}`).toString("base64");
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch prompt: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as Prompt;
}
