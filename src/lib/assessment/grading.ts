/**
 * Server-side grading for assessment questions.
 * All-or-nothing per question (consistent with the practice engine):
 * the answer is either worth the question's full points or zero.
 * Manual types (READING/WRITING/SPEAKING) return null — flagged, not graded.
 */
import { normalizeText } from "./schemas";
import { isAutoGradable } from "./registry";

export type GradeOutcome =
  | { kind: "auto"; isCorrect: boolean }
  | { kind: "manual" }
  | { kind: "unanswered" };

export function gradeAnswer(
  type: string,
  configuration: unknown,
  options: { id: string; isCorrect: boolean }[],
  answer: unknown
): GradeOutcome {
  if (!isAutoGradable(type)) return { kind: "manual" };
  if (answer === null || answer === undefined) return { kind: "unanswered" };

  const c = configuration as Record<string, unknown>;

  switch (type) {
    case "MULTIPLE_CHOICE":
    case "LISTENING": {
      const optionId = (answer as { optionId?: string })?.optionId;
      if (!optionId) return { kind: "unanswered" };
      const chosen = options.find((o) => o.id === optionId);
      if (!chosen) return { kind: "unanswered" };
      return { kind: "auto", isCorrect: chosen.isCorrect };
    }
    case "TRUE_FALSE": {
      const value = (answer as { value?: boolean })?.value;
      if (typeof value !== "boolean") return { kind: "unanswered" };
      return { kind: "auto", isCorrect: value === (c.answer as boolean) };
    }
    case "FILL_BLANK": {
      const text = (answer as { text?: string })?.text;
      if (typeof text !== "string" || text.trim() === "") return { kind: "unanswered" };
      const accepted = (c.acceptedAnswers as string[]) ?? [];
      return { kind: "auto", isCorrect: accepted.some((a) => normalizeText(a) === normalizeText(text)) };
    }
    case "MATCHING": {
      const pairs = (answer as { pairs?: { left: string; right: string }[] })?.pairs;
      const truth = (c.pairs as { left: string; right: string }[]) ?? [];
      if (!Array.isArray(pairs)) return { kind: "unanswered" };
      const answered = pairs.filter((p) => truth.some((t) => t.left === p.left));
      if (answered.length < truth.length) return { kind: "unanswered" };
      const rightByLeft = new Map(truth.map((t) => [t.left, t.right]));
      return { kind: "auto", isCorrect: answered.every((p) => rightByLeft.get(p.left) === p.right) };
    }
    case "WORD_ORDER": {
      const order = (answer as { order?: string[] })?.order;
      const words = (c.words as string[]) ?? [];
      if (!Array.isArray(order)) return { kind: "unanswered" };
      if (order.length !== words.length) return { kind: "unanswered" };
      return { kind: "auto", isCorrect: order.every((w, i) => w === words[i]) };
    }
    default:
      return { kind: "manual" };
  }
}

/** The student-facing text of the correct answer (for review, if enabled). */
export function correctAnswerText(type: string, configuration: unknown, options: { id: string; text: string; isCorrect: boolean }[]): string | null {
  const c = configuration as Record<string, unknown>;
  switch (type) {
    case "MULTIPLE_CHOICE":
    case "LISTENING":
      return options.find((o) => o.isCorrect)?.text ?? null;
    case "TRUE_FALSE":
      return c.answer ? "True" : "False";
    case "FILL_BLANK":
      return ((c.acceptedAnswers as string[]) ?? [])[0] ?? null;
    case "MATCHING":
      return ((c.pairs as { left: string; right: string }[]) ?? [])
        .map((p) => `${p.left} → ${p.right}`)
        .join(", ");
    case "WORD_ORDER":
      return ((c.words as string[]) ?? []).join(" ");
    default:
      return null;
  }
}

/** Plain-language rendering of the student's saved answer for review screens. */
export function studentAnswerText(type: string, answer: unknown, options: { id: string; text: string }[]): string {
  if (answer === null || answer === undefined) return "—";
  switch (type) {
    case "MULTIPLE_CHOICE":
    case "LISTENING": {
      const optionId = (answer as { optionId?: string })?.optionId;
      return options.find((o) => o.id === optionId)?.text ?? "—";
    }
    case "TRUE_FALSE": {
      const v = (answer as { value?: boolean })?.value;
      return v === undefined ? "—" : v ? "True" : "False";
    }
    case "FILL_BLANK":
      return ((answer as { text?: string })?.text ?? "").trim() || "—";
    case "MATCHING":
      return ((answer as { pairs?: { left: string; right: string }[] })?.pairs ?? [])
        .map((p) => `${p.left} → ${p.right}`)
        .join(", ") || "—";
    case "WORD_ORDER":
      return ((answer as { order?: string[] })?.order ?? []).join(" ") || "—";
    default: {
      const t = (answer as { text?: string })?.text;
      return (t ?? "").trim() || "—";
    }
  }
}
