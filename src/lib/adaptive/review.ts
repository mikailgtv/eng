/** Configurable review spacing. This is an estimate, not a scientific measurement. */

export function parseIntervals(raw: string | null | undefined): number[] {
  const values = (raw || "1,2,4,8,16")
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isFinite(n) && n >= 1 && n <= 60);
  return values.length ? values : [1, 2, 4, 8, 16];
}

export function nextInterval(intervals: number[], index: number, correct: boolean) {
  const nextIndex = correct ? Math.min(intervals.length - 1, Math.max(0, index) + (index < 0 ? 0 : 1)) : 0;
  const safeIndex = correct && index < 0 ? 0 : nextIndex;
  return { index: safeIndex, days: intervals[safeIndex] ?? intervals[0] };
}

export function dueFrom(now: Date, days: number) {
  const next = new Date(now);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}
