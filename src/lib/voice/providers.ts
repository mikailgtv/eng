/**
 * Speech provider switches. Keys stay in the server environment.
 * Browser speech is a client provider and never sends a secret.
 */

export type SttProviderId = "browser" | "external" | "typed";
export type TtsProviderId = "browser" | "external" | "none";

export function sttConfig() {
  return {
    externalConfigured: Boolean(process.env.STT_API_KEY),
    browserAvailable: true,
  };
}

export function ttsConfig() {
  return {
    externalConfigured: Boolean(process.env.TTS_API_KEY),
    browserAvailable: true,
  };
}

export async function externalTranscribe(_audioBase64: string): Promise<{ text: string; confidence: number | null }> {
  if (!process.env.STT_API_KEY) {
    throw new Error("stt-unavailable");
  }
  const base = process.env.STT_BASE_URL;
  if (!base) throw new Error("stt-unavailable");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(base, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.STT_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ audio: _audioBase64 }),
    });
    if (!res.ok) throw new Error("stt-failed");
    const data = (await res.json()) as { text?: string; confidence?: number };
    if (!data.text) throw new Error("stt-empty");
    return { text: data.text, confidence: typeof data.confidence === "number" ? data.confidence : null };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw new Error("stt-timeout");
    throw new Error("stt-failed");
  } finally {
    clearTimeout(timer);
  }
}

/** Server TTS returns text for the client to speak. It does not invent an audio URL. */
export async function externalSpeak(text: string): Promise<{ available: false; text: string } | { available: true; audioBase64: string }> {
  if (!process.env.TTS_API_KEY || !process.env.TTS_BASE_URL) {
    return { available: false, text };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(process.env.TTS_BASE_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.TTS_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: text.slice(0, 400) }),
    });
    if (!res.ok) return { available: false, text };
    const data = (await res.json()) as { audioBase64?: string };
    if (!data.audioBase64) return { available: false, text };
    return { available: true, audioBase64: data.audioBase64 };
  } catch {
    return { available: false, text };
  } finally {
    clearTimeout(timer);
  }
}
