/**
 * One correction at a time. This is a teaching hint, not speech analysis
 * and not an official score.
 */

export type Correction = { type: "GRAMMAR" | "VOCABULARY" | "WORD_ORDER" | "SPELLING"; say: string };

const BE: Record<string, string> = {
  i: "am",
  you: "are",
  we: "are",
  they: "are",
  he: "is",
  she: "is",
  it: "is",
};

export function correctOnce(text: string): Correction | null {
  const raw = text.trim();
  if (!raw) return null;
  const lower = raw.toLowerCase().replace(/[.!?]+$/g, "").trim();

  const name = lower.match(/^my name (?!is\b)([a-z][a-z'-]{1,30})$/i);
  if (name) {
    const who = name[1].charAt(0).toUpperCase() + name[1].slice(1);
    return { type: "GRAMMAR", say: `My name is ${who}.` };
  }

  const be = lower.match(/^(i|you|we|they|he|she|it)\s+(am|is|are)\b/);
  if (be) {
    const expected = BE[be[1]];
    if (expected && expected !== be[2]) {
      const subject = be[1] === "i" ? "I" : be[1].charAt(0).toUpperCase() + be[1].slice(1);
      const rest = raw.replace(/^(i|you|we|they|he|she|it)\s+(am|is|are)/i, "").trim();
      return { type: "GRAMMAR", say: `${subject} ${expected}${rest ? ` ${rest}` : "."}`.replace(/\s+\./, ".") };
    }
  }

  if (/^i\b/.test(raw) && !raw.startsWith("I")) {
    return { type: "SPELLING", say: `I${raw.slice(1)}` };
  }

  const order = lower.match(/^(\w+)\s+(am|is|are)\s+name\s+my$/);
  if (order) return { type: "WORD_ORDER", say: "My name is Ali." };

  return null;
}

export function looksConfused(text: string): boolean {
  const lower = text.toLowerCase();
  if (/[^\u0000-\u024f]/.test(text) && !/^[a-z0-9\s.,!?'-]+$/i.test(text)) return true;
  return /\b(don't understand|do not understand|what\?|help|confused|no entiendo)\b/i.test(lower) || text.trim() === "?";
}

const HINTS: Record<string, string> = {
  "Hello! What is your name?": "اسمت چیست؟",
  "How are you?": "حال شما چطور است؟",
  "Nice to meet you!": "از آشنایی خوشوقتم.",
  "What is this?": "این چیست؟",
};

export function beginnerHint(english: string): string | null {
  for (const [key, value] of Object.entries(HINTS)) {
    if (english.includes(key.replace(/!$/, "")) || english.startsWith(key)) return value;
  }
  if (english.startsWith("Hello!")) return HINTS["Hello! What is your name?"];
  return null;
}
