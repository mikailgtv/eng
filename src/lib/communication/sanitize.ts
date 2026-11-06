/** Plain-text messages only. Stored text is rendered as text, never as HTML. */
export function sanitizeMessage(input: string): string {
  return input
    .replace(/<[^>]*>/g, "")
    .replace(/javascript:/gi, "")
    .replace(/data:/gi, "")
    .replace(/\u0000/g, "")
    .trim()
    .slice(0, 4000);
}

export function safeLink(input: string | null | undefined): string | null {
  if (!input) return null;
  const value = input.trim();
  if (value.startsWith("/") && !value.startsWith("//")) return value.slice(0, 300);
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString().slice(0, 500);
  } catch {
    return null;
  }
  return null;
}
