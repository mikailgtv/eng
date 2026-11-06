/**
 * Optional OpenAI-compatible tutor. The key stays in the server environment.
 * Structured course practice does not use this provider.
 */
import { contextForProvider } from "./context";
import type { LearningContext } from "./types";

const TIMEOUT_MS = 20_000;

export function externalTutorConfigured() {
  return Boolean(process.env.AI_API_KEY);
}

export async function externalTutorReply(input: {
  mode: string;
  level: string;
  context: LearningContext;
  history: { role: "user" | "assistant"; content: string }[];
  message: string;
  maxChars: number;
}): Promise<string> {
  const key = process.env.AI_API_KEY;
  if (!key) throw new Error("provider-unconfigured");
  const base = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.AI_MODEL || "gpt-4o-mini";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        temperature: 0.4,
        messages: [
          {
            role: "system",
            content: [
              "You are an English learning assistant, not a human teacher.",
              "Stay on English practice. Do not invent grades, attendance, or course policy.",
              "Use the lesson text when the question is about the lesson. If you are unsure, say so.",
              "Correct only the most important mistake, then continue.",
              `Student level: ${input.level}. Use short sentences if the level is PRE_A1 or A1.`,
              "Do not claim you heard the student's voice.",
              "This is AI Practice, not an exam.",
              contextForProvider(input.context),
            ].join("\n"),
          },
          ...input.history.slice(-8).map((item) => ({ role: item.role, content: item.content.slice(0, 500) })),
          { role: "user", content: input.message.slice(0, 500) },
        ],
      }),
    });
    if (!res.ok) throw new Error("provider-unavailable");
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("provider-empty");
    return text.slice(0, input.maxChars);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw new Error("provider-timeout");
    throw new Error("provider-unavailable");
  } finally {
    clearTimeout(timer);
  }
}
