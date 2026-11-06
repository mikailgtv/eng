/**
 * Learning progress estimate. Not an exact ability score and not a rank.
 * Mastered is not permanent.
 */

export type ItemState = "NEW" | "LEARNING" | "PRACTICING" | "STRONG" | "NEEDS_REVIEW" | "MASTERED";

export function nextItemState(input: {
  previous: ItemState;
  correct: boolean | null;
  correctAttempts: number;
  incorrectAttempts: number;
  overdue: boolean;
}): ItemState {
  if (input.correct === false && (input.previous === "STRONG" || input.previous === "MASTERED" || input.correctAttempts > 0)) {
    return "NEEDS_REVIEW";
  }
  if (input.overdue && (input.previous === "STRONG" || input.previous === "MASTERED")) {
    return "NEEDS_REVIEW";
  }
  if (input.correct === false && input.incorrectAttempts >= 2) return "NEEDS_REVIEW";
  if (input.correctAttempts >= 4 && input.incorrectAttempts === 0 && !input.overdue) return "MASTERED";
  if (input.correctAttempts >= 3 && input.incorrectAttempts <= 1 && !input.overdue) return "STRONG";
  if (input.correctAttempts >= 1 && input.incorrectAttempts >= 1) return "PRACTICING";
  if (input.correctAttempts + input.incorrectAttempts > 0 || input.correct !== null) return "LEARNING";
  return input.previous === "NEW" ? "NEW" : input.previous;
}

export function skillLabel(input: {
  evidenceCount: number;
  correctCount: number;
  incorrectCount: number;
  state: ItemState;
  daysSince: number | null;
}): string {
  if (input.evidenceCount === 0) return "Not started";
  if (input.state === "NEEDS_REVIEW" || (input.incorrectCount >= 2 && input.incorrectCount > input.correctCount)) return "Needs Review";
  if (input.daysSince !== null && input.daysSince >= 14) return "Needs Practice";
  if (input.evidenceCount < 2) return "Needs Practice";
  if (input.state === "STRONG" || input.state === "MASTERED") return "Strong recent performance";
  return "Developing";
}

export function nextDifficultyBand(current: number, recentCorrect: boolean[]): number {
  const band = Math.min(3, Math.max(1, current || 1));
  const last = recentCorrect.slice(-3);
  if (last.length < 3) return band;
  if (last.every(Boolean)) return Math.min(3, band + 1);
  if (last.every((item) => !item)) return Math.max(1, band - 1);
  return band;
}
