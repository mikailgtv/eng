import { prisma } from "@/lib/prisma";

/**
 * Phase 57 — Daily Goals & Real Performance Analytics
 * Authoritative sources:
 *  - lessons completed: lesson_progress status COMPLETED, completedAt UTC
 *  - review cards: vocabulary_review lastReviewedAt UTC
 *  - activities: activity_attempt submittedAt UTC (all types, speaking distinguished by isCorrect null)
 *  - assessments: assessment_attempt submittedAt, percentage/passed
 * Timezone: all day boundaries are UTC midnight (Date.UTC). Documented for transparency.
 * Duplicate prevention: lessons are unique per (student,lesson); vocab counts distinct vocabularyId per day;
 * activities deduped if same activityId within 60s (retry guard).
 */

export type DailyGoalType = "LESSONS" | "REVIEW_CARDS" | "ACTIVITIES";

export const DAILY_GOAL_TYPES: { value: DailyGoalType; label: string; hint: string; options: number[] }[] = [
  { value: "LESSONS", label: "Lessons", hint: "Finish lessons in your assigned course", options: [1, 2, 3] },
  { value: "REVIEW_CARDS", label: "Review cards", hint: "Review vocabulary cards", options: [5, 10, 15, 20] },
  { value: "ACTIVITIES", label: "Practice activities", hint: "Complete practice activities (quizzes, speaking, etc.)", options: [3, 5, 10] },
];

export const DEFAULT_GOAL: { type: DailyGoalType; value: number; enabled: boolean } = {
  type: "LESSONS",
  value: 1,
  enabled: true,
};

export function utcDayBounds(date: Date): { start: Date; end: Date; dayKey: string } {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const start = new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, d, 23, 59, 59, 999));
  const dayKey = start.toISOString().slice(0, 10); // YYYY-MM-DD UTC
  return { start, end, dayKey };
}

export function formatDayLabel(date: Date): string {
  // Use UTC for consistency; short label e.g., Mon 10/26
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    month: "numeric",
    day: "numeric",
    timeZone: "UTC",
  });
}

export async function getDailyGoal(studentId: string): Promise<{ type: DailyGoalType; value: number; enabled: boolean }> {
  const pref = await prisma.studentLearningPreference.findUnique({
    where: { studentId },
    select: { dailyGoalType: true, dailyGoalValue: true, dailyGoalEnabled: true },
  });
  if (!pref) {
    return DEFAULT_GOAL;
  }
  const type = (pref.dailyGoalType as DailyGoalType) ?? DEFAULT_GOAL.type;
  const value = pref.dailyGoalValue ?? DEFAULT_GOAL.value;
  const enabled = pref.dailyGoalEnabled ?? DEFAULT_GOAL.enabled;
  const allowed: DailyGoalType[] = ["LESSONS", "REVIEW_CARDS", "ACTIVITIES"];
  return {
    type: allowed.includes(type) ? type : DEFAULT_GOAL.type,
    value: Number.isInteger(value) && value >= 1 && value <= 50 ? value : DEFAULT_GOAL.value,
    enabled: Boolean(enabled),
  };
}

export async function setDailyGoal(
  studentId: string,
  input: { type: DailyGoalType; value: number; enabled: boolean }
): Promise<{ type: DailyGoalType; value: number; enabled: boolean }> {
  const allowed: DailyGoalType[] = ["LESSONS", "REVIEW_CARDS", "ACTIVITIES"];
  if (!allowed.includes(input.type)) throw new Error("Invalid goal type");
  if (!Number.isInteger(input.value) || input.value < 1 || input.value > 50) throw new Error("Goal value must be 1–50");
  const row = await prisma.studentLearningPreference.upsert({
    where: { studentId },
    create: {
      studentId,
      dailyGoalType: input.type,
      dailyGoalValue: input.value,
      dailyGoalEnabled: input.enabled,
    },
    update: {
      dailyGoalType: input.type,
      dailyGoalValue: input.value,
      dailyGoalEnabled: input.enabled,
    },
    select: { dailyGoalType: true, dailyGoalValue: true, dailyGoalEnabled: true },
  });
  return {
    type: row.dailyGoalType as DailyGoalType,
    value: row.dailyGoalValue,
    enabled: row.dailyGoalEnabled,
  };
}

export async function getDailyProgress(
  studentId: string,
  date = new Date()
): Promise<{ type: DailyGoalType; target: number; completed: number; remaining: number; percent: number; enabled: boolean; dayKey: string }> {
  const goal = await getDailyGoal(studentId);
  const { start, end, dayKey } = utcDayBounds(date);
  let completed = 0;
  if (goal.type === "LESSONS") {
    completed = await prisma.lessonProgress.count({
      where: { studentId, status: "COMPLETED", completedAt: { gte: start, lte: end } },
    });
  } else if (goal.type === "REVIEW_CARDS") {
    // Count distinct vocabularyIds reviewed that UTC day (lastReviewedAt in day)
    completed = await prisma.vocabularyReview.count({
      where: { studentId, lastReviewedAt: { gte: start, lte: end } },
    });
  } else if (goal.type === "ACTIVITIES") {
    const rows = await prisma.activityAttempt.findMany({
      where: { studentId, submittedAt: { gte: start, lte: end } },
      select: { activityId: true, submittedAt: true, answer: true },
      orderBy: { submittedAt: "asc" },
    });
    // Deduplicate: same activityId within 60s considered one event (retry guard)
    const deduped: typeof rows = [];
    for (const r of rows) {
      const last = deduped[deduped.length - 1];
      if (last && last.activityId === r.activityId) {
        const diff = r.submittedAt.getTime() - last.submittedAt.getTime();
        if (diff < 60_000) continue;
      }
      deduped.push(r);
    }
    completed = deduped.length;
  }
  const target = goal.value;
  const remaining = Math.max(0, target - completed);
  const percent = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;
  return { type: goal.type, target, completed, remaining, percent, enabled: goal.enabled, dayKey };
}

// Recent daily activity for last N days (UTC)
export async function getDailyActivityHistory(
  studentId: string,
  days = 7
): Promise<
  Array<{
    date: string; // YYYY-MM-DD UTC
    label: string;
    lessons: number;
    reviews: number;
    activities: number;
    speaking: number;
  }>
> {
  const history: Array<{ date: string; label: string; lessons: number; reviews: number; activities: number; speaking: number }> = [];
  const now = new Date();
  // Build day bounds for last `days` days (including today)
  const dayBounds: Array<{ start: Date; end: Date; dayKey: string; label: string }> = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i));
    const { start, end, dayKey } = utcDayBounds(d);
    dayBounds.push({ start, end, dayKey, label: formatDayLabel(d) });
  }
  const earliest = dayBounds[0]!.start;
  const latest = dayBounds[dayBounds.length - 1]!.end;

  const [lessonRows, vocabRows, activityRows] = await Promise.all([
    prisma.lessonProgress.findMany({
      where: { studentId, status: "COMPLETED", completedAt: { gte: earliest, lte: latest } },
      select: { completedAt: true },
    }),
    prisma.vocabularyReview.findMany({
      where: { studentId, lastReviewedAt: { gte: earliest, lte: latest } },
      select: { lastReviewedAt: true },
    }),
    prisma.activityAttempt.findMany({
      where: { studentId, submittedAt: { gte: earliest, lte: latest } },
      select: { submittedAt: true, isCorrect: true, activityId: true },
      orderBy: { submittedAt: "asc" },
    }),
  ]);

  // Deduplicate activities per day with same logic as daily progress (within 60s same activity)
  // First group by day then dedupe within each day
  for (const b of dayBounds) {
    const lessons = lessonRows.filter((r) => r.completedAt && r.completedAt >= b.start && r.completedAt <= b.end).length;
    const reviews = vocabRows.filter((r) => r.lastReviewedAt && r.lastReviewedAt >= b.start && r.lastReviewedAt <= b.end).length;
    const dayActivities = activityRows.filter((r) => r.submittedAt >= b.start && r.submittedAt <= b.end);
    // Deduplicate within day
    const deduped: typeof dayActivities = [];
    for (const r of dayActivities) {
      const last = deduped[deduped.length - 1];
      if (last && last.activityId === r.activityId) {
        const diff = r.submittedAt.getTime() - last.submittedAt.getTime();
        if (diff < 60_000) continue;
      }
      deduped.push(r);
    }
    const activities = deduped.length;
    const speaking = deduped.filter((r) => r.isCorrect === null).length; // self-reported speaking
    history.push({ date: b.dayKey, label: b.label, lessons, reviews, activities, speaking });
  }
  return history;
}

export async function getSpeakingStats(studentId: string, dateForToday = new Date()) {
  const { start, end } = utcDayBounds(dateForToday);
  const [speakingCompleted, assessedCompleted, speakingTotal] = await Promise.all([
    prisma.activityAttempt.count({ where: { studentId, isCorrect: null, submittedAt: { gte: start, lte: end } } }),
    prisma.activityAttempt.count({ where: { studentId, isCorrect: { not: null }, submittedAt: { gte: start, lte: end } } }),
    prisma.activityAttempt.count({ where: { studentId, isCorrect: null } }),
  ]);
  return { speakingCompletedToday: speakingCompleted, assessedCompletedToday: assessedCompleted, speakingTotal };
}

export async function getProgressSummary(studentId: string, groupId: string | null) {
  // Reuse existing getLearningSummary logic but expose here for dashboard server component
  // This wrapper exists to keep daily-goals lib as single source for progress history
  const { getLearningSummary } = await import("@/lib/learning");
  const { getPracticeStats, getVocabularyReviewCounts } = await import("@/lib/practice");
  const { listMyAttemptHistory } = await import("@/lib/assessment/queries");
  const [learning, practice, vocab, assessments] = await Promise.all([
    getLearningSummary(studentId, groupId),
    getPracticeStats(studentId),
    getVocabularyReviewCounts(studentId),
    listMyAttemptHistory({ id: studentId, role: "STUDENT", groupId }).catch(() => []),
  ]);
  return { learning, practice, vocab, assessments };
}
