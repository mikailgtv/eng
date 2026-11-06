/** Objective transcript check. This is not a pronunciation score. */

export function normalizeSpeech(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}

export function transcriptUnderstood(target: string, heard: string | null | undefined) {
  if (!heard) return false;
  const expected = normalizeSpeech(target);
  const actual = normalizeSpeech(heard);
  if (!expected || !actual) return false;
  if (actual === expected) return true;
  const words = expected.split(" ").filter((word) => word.length > 2);
  if (words.length <= 1) return actual.split(" ").includes(expected);
  const hits = words.filter((word) => actual.includes(word)).length;
  return hits / words.length >= 0.8;
}

const COPULA = /\b(am|is|are)\b/g;

/** First copula in an already-normalised string, or null. */
function firstCopula(text: string): string | null {
  const match = text.match(/\b(am|is|are)\b/);
  return match ? match[0] : null;
}

/**
 * Coarse mistake label for the practice history — never a pronunciation judgement.
 *
 * Classification must be supported by the target-versus-response comparison: the target
 * merely containing "is" is not evidence that the learner got am/is/are wrong.
 */
export function mistakeCategory(target: string, heard: string | null | undefined): string | null {
  if (!heard || transcriptUnderstood(target, heard)) return null;
  const expected = normalizeSpeech(target);
  const actual = normalizeSpeech(heard);
  if (!actual) return null;

  const expectedCopula = firstCopula(expected);
  const heardCopulas = actual.match(COPULA) ?? [];

  // The learner supplied a copula the target does not use ("I am go to school").
  if (!expectedCopula && heardCopulas.length > 0) return "am/is/are";
  // The learner used a different copula than the target ("He are a teacher", "I is happy").
  if (expectedCopula && heardCopulas.some((copula) => copula !== expectedCopula)) return "am/is/are";
  // The target needs a copula and the learner omitted it — but only when the response clearly
  // attempts the same sentence (a majority of the target's content words are present).
  if (expectedCopula && heardCopulas.length === 0) {
    const words = expected.split(" ").filter((word) => word.length > 2);
    const hits = words.filter((word) => actual.includes(word)).length;
    if (words.length > 0 && hits / words.length > 0.5) return "am/is/are";
  }

  if (/\b(a|an|the)\b/.test(expected) && !/\b(a|an|the)\b/.test(actual)) return "articles";
  if (target.trim().split(/\s+/).length > heard.trim().split(/\s+/).length + 1) return "missing words";
  return "not the full phrase";
}

export function simpleFeedback(target: string, heard: string | null, understood: boolean) {
  if (!heard) return "I could not understand the audio. Please try again, or type your answer.";
  if (understood) return "Your sentence was understood. Try it one more time if you want.";
  if (normalizeSpeech(target).split(" ").length > 1 && normalizeSpeech(heard).split(" ").length === 1) {
    return "Try the full sentence again.";
  }
  return "Try the full word or sentence again.";
}
