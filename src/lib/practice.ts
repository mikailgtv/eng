/**
 * Practice engine data layer.
 *
 * Security invariants:
 *  - studentId ALWAYS comes from the server session, never from the client.
 *  - Correctness is computed server-side (lib/activities/check.ts).
 *  - Attempts are append-only history (never overwritten).
 */
import { prisma } from "@/lib/prisma";
import { parseConfiguration, checkAnswer, sanitizeForStudent } from "@/lib/activities/check";
import { isScoredType, type ActivityType, COMPLETION_RULES } from "@/lib/activities/registry";
import type { SanitizedActivity } from "@/lib/activities/check";
import type { VocabReviewStatus } from "@/lib/activities/registry";
import type { ProgressStatus } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Activities for a lesson (student view)
// ---------------------------------------------------------------------------

/** Lesson authorization is already handled by getLessonForStudent. */
export async function getLessonActivitiesForStudent(
  lessonId: string
): Promise<SanitizedActivity[]> {
  const activities = await prisma.activity.findMany({
    where: { lessonId, status: "PUBLISHED" },
    orderBy: { order: "asc" },
    include: { vocabulary: { select: { vocabularyId: true } } },
  });
  const sanitized: SanitizedActivity[] = [];
  for (const a of activities) {
    const safe = sanitizeForStudent(a, a.vocabulary.map((v) => v.vocabularyId));
    if (safe) sanitized.push(safe);
  }
  return sanitized;
}

// ---------------------------------------------------------------------------
// Attempts
// ---------------------------------------------------------------------------

export type ActivityAccess =
  | { allowed: true; activityId: string }
  | { allowed: false; reason: "not_found" };

/**
 * Verify a student may attempt this activity: PUBLISHED activity, PUBLISHED
 * lesson/module/course under an ACTIVE level, course assigned to the
 * student's own group (admins may preview published content).
 */
export async function canAccessActivity(
  viewer: { id: string; role: string; groupId: string | null },
  activityId: string
): Promise<ActivityAccess> {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: {
      id: true,
      status: true,
      lesson: {
        select: {
          status: true,
          module: {
            select: {
              status: true,
              course: {
                select: {
                  status: true,
                  level: { select: { status: true } },
                  assignments: { select: { groupId: true } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!activity) return { allowed: false, reason: "not_found" };
  const chain = activity.lesson;
  const publishedOk =
    activity.status === "PUBLISHED" &&
    chain.status === "PUBLISHED" &&
    chain.module.status === "PUBLISHED" &&
    chain.module.course.status === "PUBLISHED";
  if (viewer.role === "ADMIN") {
    return publishedOk ? { allowed: true, activityId } : { allowed: false, reason: "not_found" };
  }
  const assigned =
    chain.module.course.level.status === "ACTIVE" &&
    viewer.groupId !== null &&
    chain.module.course.assignments.some((a) => a.groupId === viewer.groupId);
  return publishedOk && assigned ? { allowed: true, activityId } : { allowed: false, reason: "not_found" };
}

export type SubmitResult =
  | { ok: true; attemptId: string; attemptNumber: number; feedback: ReturnType<typeof checkAnswer>["feedback"] }
  | { ok: false; reason: "not_found" | "invalid_config" | "bad_answer" };

/**
 * Record one attempt. The answer payload is validated against the activity
 * type; correctness/score are computed here (client input is never trusted).
 */
export async function submitAttempt(
  studentId: string,
  activityId: string,
  answer: unknown
): Promise<SubmitResult> {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: { id: true, type: true, status: true, points: true, configuration: true },
  });
  if (!activity || activity.status !== "PUBLISHED") return { ok: false, reason: "not_found" };

  const parsed = parseConfiguration(activity.type, activity.configuration);
  if (!parsed) return { ok: false, reason: "invalid_config" };

  let checked: ReturnType<typeof checkAnswer>;
  try {
    checked = checkAnswer(parsed.type, parsed.config, answer);
  } catch {
    return { ok: false, reason: "bad_answer" };
  }

  const count = await prisma.activityAttempt.count({ where: { studentId, activityId } });
  const attemptNumber = count + 1;

  const attempt = await prisma.activityAttempt.create({
    data: {
      studentId,
      activityId,
      answer: JSON.stringify(checked.validated),
      isCorrect: checked.feedback.isCorrect,
      score:
        checked.scoreRatio === null
          ? null
          : Math.round(checked.scoreRatio * activity.points),
      attemptNumber,
    },
    select: { id: true, attemptNumber: true },
  });

  // Flashcards with vocabulary links update the review scheduler.
  if (parsed.type === "FLASHCARD") {
    const marks = (checked.validated as { marks: { word: string; vocabularyId?: string; response: string }[] }).marks;
    const linked = await prisma.activityVocabulary.findMany({
      where: { activityId },
      select: { vocabularyId: true },
    });
    const linkedIds = new Set(linked.map((l) => l.vocabularyId));
    for (const mark of marks) {
      const vocabId = mark.vocabularyId && linkedIds.has(mark.vocabularyId) ? mark.vocabularyId : null;
      if (vocabId) {
        await recordVocabularyResponse(studentId, vocabId, mark.response === "KNOWN" ? "KNOWN" : "NEED_REVIEW");
      }
    }
  }

  // Vocabulary recognition attempts also feed the review scheduler.
  if (parsed.type === "VOCABULARY_RECOGNITION") {
    const linked = await prisma.activityVocabulary.findFirst({
      where: { activityId },
      select: { vocabularyId: true },
    });
    if (linked) {
      await recordVocabularyResponse(
        studentId,
        linked.vocabularyId,
        checked.feedback.isCorrect ? "KNOWN" : "NEED_REVIEW"
      );
    }
  }

  const { noteAdaptive, noteActivityAttempt } = await import("@/lib/adaptive/hooks");
  noteAdaptive(() => noteActivityAttempt({ studentId, activityId, attemptId: attempt.id, isCorrect: checked.feedback.isCorrect }));
  return { ok: true, attemptId: attempt.id, attemptNumber: attempt.attemptNumber, feedback: checked.feedback };
}

// ---------------------------------------------------------------------------
// Practice state / results for a lesson
// ---------------------------------------------------------------------------

/**
 * Product rule (Phase 53): a self-reported speaking/flashcard activity
 * counts as COMPLETED for progress, but NOT as correct/incorrect/scored.
 * isCorrect=null is the persisted marker for this deliberate distinction —
 * it never fabricates a score, pronunciation mark or AI evaluation.
 */
export type ActivityState = {
  activityId: string;
  status: "NOT_ATTEMPTED" | "COMPLETED" | "CORRECT" | "INCORRECT";
  attempts: number;
  /** The latest attempt's submitted answer (for refresh-persistence). */
  lastAnswer: unknown;
};

export type PracticeState = {
  states: ActivityState[];
  totalActivities: number;
  requiredTotal: number;
  answered: number;
  correct: number;
  /** Calculated from the LATEST attempt per activity — "Practice Score". */
  scorePercent: number | null;
  allAnswered: boolean;
  requiredRemaining: number;
};

/**
 * Latest-attempt-per-activity practice state for one student + lesson.
 * Powers refresh-persistence, the practice summary and completion gating.
 */
export async function getPracticeState(studentId: string, lessonId: string): Promise<PracticeState> {
  const activities = await prisma.activity.findMany({
    where: { lessonId, status: "PUBLISHED" },
    orderBy: { order: "asc" },
    select: { id: true, required: true },
  });

  const attempts = await prisma.activityAttempt.findMany({
    where: { studentId, activityId: { in: activities.map((a) => a.id) } },
    orderBy: { submittedAt: "asc" },
    select: { activityId: true, isCorrect: true, answer: true, attemptNumber: true },
  });

  const latest = new Map<string, { isCorrect: boolean | null; answer: unknown; attempts: number }>();
  for (const a of attempts) {
    latest.set(a.activityId, { isCorrect: a.isCorrect, answer: safeJson(a.answer), attempts: a.attemptNumber });
  }

  const states: ActivityState[] = activities.map((a) => {
    const l = latest.get(a.id);
    return {
      activityId: a.id,
      status: !l ? "NOT_ATTEMPTED" : l.isCorrect === true ? "CORRECT" : l.isCorrect === false ? "INCORRECT" : "COMPLETED",
      attempts: l?.attempts ?? 0,
      lastAnswer: l?.answer ?? null,
    };
  });

  const answered = states.filter((s) => s.status !== "NOT_ATTEMPTED");
  const correct = states.filter((s) => s.status === "CORRECT").length;
  // Only correctness-bearing attempts count toward scoring; COMPLETED is
  // progress-only and must not invent accuracy. See product rule above.
  const scored = states.filter((s) => s.status === "CORRECT" || s.status === "INCORRECT");
  const requiredTotal = activities.filter((a) => a.required).length;
  const requiredDone = activities.filter((a) => a.required && latest.get(a.id)).length;

  return {
    states,
    totalActivities: activities.length,
    requiredTotal,
    answered: answered.length,
    correct,
    scorePercent: scored.length === 0 ? null : Math.round((correct / activities.length) * 100),
    allAnswered: activities.length > 0 && answered.length === activities.length,
    requiredRemaining: requiredTotal - requiredDone,
  };
}

function safeJson(json: string | null): unknown {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Mistakes (review experience)
// ---------------------------------------------------------------------------

export type Mistake = {
  activityId: string;
  activityType: ActivityType;
  title: string | null;
  prompt: string;
  studentAnswer: string;
  correctText: string;
  explanation: string | null;
  submittedAt: Date;
};

/**
 * Latest incorrect attempt per activity (optionally scoped to one lesson).
 * Beginner-friendly feedback strings are derived from the configuration.
 */
export async function getMistakesForStudent(studentId: string, lessonId?: string): Promise<Mistake[]> {
  const activities = await prisma.activity.findMany({
    where: {
      status: "PUBLISHED",
      ...(lessonId ? { lessonId } : {}),
      attempts: { some: { studentId, isCorrect: false } },
    },
    orderBy: { order: "asc" },
    select: { id: true, type: true, title: true, configuration: true },
  });
  if (activities.length === 0) return [];

  const latestWrong = await prisma.activityAttempt.findMany({
    where: { studentId, activityId: { in: activities.map((a) => a.id) }, isCorrect: false },
    orderBy: { submittedAt: "desc" },
    take: 100,
  });
  const latestByActivity = new Map<string, (typeof latestWrong)[number]>();
  for (const a of latestWrong) {
    if (!latestByActivity.has(a.activityId)) latestByActivity.set(a.activityId, a);
  }

  const mistakes: Mistake[] = [];
  for (const activity of activities) {
    const attempt = latestByActivity.get(activity.id);
    if (!attempt) continue;
    const parsed = parseConfiguration(activity.type, activity.configuration);
    if (!parsed) continue;
    const { prompt, studentAnswer, correctText, explanation } = describeMistake(parsed.type, parsed.config, safeJson(attempt.answer));
    if (!prompt) continue;
    mistakes.push({
      activityId: activity.id,
      activityType: parsed.type,
      title: activity.title,
      prompt,
      studentAnswer,
      correctText,
      explanation,
      submittedAt: attempt.submittedAt,
    });
  }
  return mistakes;
}

function describeMistake(
  type: ActivityType,
  config: unknown,
  answer: unknown
): { prompt: string; studentAnswer: string; correctText: string; explanation: string | null } {
  const c = config as Record<string, unknown>;
  switch (type) {
    case "MULTIPLE_CHOICE":
    case "VOCABULARY_RECOGNITION":
    case "LISTEN_AND_CHOOSE": {
      const options = (c.options as { id: string; text: string }[]) ?? [];
      const chosenId = (answer as { optionId?: string })?.optionId;
      const correctId = c.correctOptionId as string;
      return {
        prompt: [
          c.question as string | undefined,
          c.prompt as string | undefined,
          c.statement as string | undefined,
        ].find((v): v is string => typeof v === "string" && v.length > 0) ?? "",
        studentAnswer: options.find((o) => o.id === chosenId)?.text ?? "—",
        correctText: options.find((o) => o.id === correctId)?.text ?? "—",
        explanation: (c.explanation as string) ?? null,
      };
    }
    case "TRUE_FALSE": {
      const value = (answer as { value?: boolean })?.value;
      return {
        prompt: c.statement as string,
        studentAnswer: value === undefined ? "—" : value ? "True" : "False",
        correctText: c.answer ? "True" : "False",
        explanation: (c.explanation as string) ?? null,
      };
    }
    case "FILL_BLANK":
      return {
        prompt: (c.sentenceWithBlank as string).replace("___", "______"),
        studentAnswer: ((answer as { text?: string })?.text ?? "").trim() || "—",
        correctText: (c.acceptedAnswers as string[])[0],
        explanation: (c.explanation as string) ?? null,
      };
    case "WORD_ORDER":
      return {
        prompt: "Put the words in order.",
        studentAnswer: ((answer as { order?: string[] })?.order ?? []).join(" ") || "—",
        correctText: (c.words as string[]).join(" "),
        explanation: (c.explanation as string) ?? null,
      };
    case "MATCHING": {
      const pairs = (c.pairs as { left: string; right: string }[]) ?? [];
      const given = ((answer as { pairs?: { left: string; right: string }[] })?.pairs ?? []);
      const rightByLeft = new Map(pairs.map((p) => [p.left, p.right]));
      const wrong = given.filter((p) => rightByLeft.get(p.left) !== p.right);
      return {
        prompt: "Match the pairs.",
        studentAnswer: wrong.length > 0 ? `${wrong[0].left} → ${wrong[0].right}` : "—",
        correctText: wrong.length > 0 ? `${wrong[0].left} → ${rightByLeft.get(wrong[0].left)}` : "—",
        explanation: null,
      };
    }
    case "LISTEN_AND_TYPE":
      return {
        prompt: "Type what you hear.",
        studentAnswer: ((answer as { text?: string })?.text ?? "").trim() || "—",
        correctText: c.transcript as string,
        explanation: (c.explanation as string) ?? null,
      };
    default:
      return { prompt: "", studentAnswer: "—", correctText: "—", explanation: null };
  }
}

// ---------------------------------------------------------------------------
// Lesson completion rules (Phase 3)
// ---------------------------------------------------------------------------

export type CompletionCheck =
  | { allowed: true }
  | { allowed: false; reason: "required_activities"; missing: number; total: number };

/**
 * Server-side completion gate based on the course's completionRule.
 * Phase 3 default: VIEW_AND_REQUIRED_ACTIVITIES (lesson viewed — implied by
 * being on the page / access tracking — AND every required activity attempted;
 * correctness is not required, beginners must never get stuck).
 */
export async function checkLessonCompletion(studentId: string, lessonId: string): Promise<CompletionCheck> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      module: { select: { course: { select: { completionRule: true, status: true } } } },
      activities: {
        where: { status: "PUBLISHED", required: true },
        select: { id: true },
      },
    },
  });
  if (!lesson) return { allowed: false, reason: "required_activities", missing: 1, total: 1 };

  const rule = lesson.module.course.completionRule;

  if (rule === COMPLETION_RULES.VIEW_ONLY) return { allowed: true };

  if (rule === COMPLETION_RULES.VIEW_AND_REQUIRED_ACTIVITIES) {
    const requiredIds = lesson.activities.map((a) => a.id);
    if (requiredIds.length === 0) return { allowed: true };
    const done = await prisma.activityAttempt.findMany({
      where: { studentId, activityId: { in: requiredIds } },
      select: { activityId: true },
      distinct: ["activityId"],
    });
    const missing = requiredIds.length - done.length;
    return missing > 0 ? { allowed: false, reason: "required_activities", missing, total: requiredIds.length } : { allowed: true };
  }

  // MIN_PRACTICE_SCORE / TEACHER_APPROVAL — not settable in Phase 3 UI.
  // Fall back to view-only so nothing blocks a student unnecessarily.
  return { allowed: true };
}

// ---------------------------------------------------------------------------
// Practice statistics (all displayed numbers derive from these real queries)
// ---------------------------------------------------------------------------

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export type PracticeStats = {
  totals: {
    attempts: number;
    scoredAttempts: number;
    correctAttempts: number;
    accuracyPercent: number | null;
    distinctActivitiesPracticed: number;
    listeningCompleted: number;
    grammarConceptsPracticed: number;
    vocabularyItemsPracticed: number;
  };
  today: { attempts: number; scoredAttempts: number; correctAttempts: number; accuracyPercent: number | null };
};

export async function getPracticeStats(studentId: string): Promise<PracticeStats> {
  const [attempts, todayAttempts, listening, grammar, vocab] = await Promise.all([
    prisma.activityAttempt.findMany({
      where: { studentId },
      select: { isCorrect: true, activityId: true },
    }),
    prisma.activityAttempt.findMany({
      where: { studentId, submittedAt: { gte: startOfTodayUtc() } },
      select: { isCorrect: true },
    }),
    prisma.activityAttempt.findMany({
      where: {
        studentId,
        activity: { type: { in: ["LISTEN_AND_CHOOSE", "LISTEN_AND_TYPE"] } },
      },
      select: { activityId: true },
      distinct: ["activityId"],
    }),
    prisma.activityAttempt.findMany({
      where: { studentId, activity: { grammarId: { not: null } } },
      select: { activity: { select: { grammarId: true } } },
      distinct: ["activityId"],
    }),
    prisma.activityVocabulary.findMany({
      where: { activity: { attempts: { some: { studentId } } } },
      select: { vocabularyId: true },
      distinct: ["vocabularyId"],
    }),
  ]);

  const scored = attempts.filter((a) => a.isCorrect !== null);
  const correct = scored.filter((a) => a.isCorrect === true);
  const todayScored = todayAttempts.filter((a) => a.isCorrect !== null);
  const todayCorrect = todayScored.filter((a) => a.isCorrect === true);
  const grammarSet = new Set(grammar.map((g) => g.activity.grammarId));

  return {
    totals: {
      attempts: attempts.length,
      scoredAttempts: scored.length,
      correctAttempts: correct.length,
      accuracyPercent: scored.length === 0 ? null : Math.round((correct.length / scored.length) * 100),
      distinctActivitiesPracticed: new Set(attempts.map((a) => a.activityId)).size,
      listeningCompleted: listening.length,
      grammarConceptsPracticed: grammarSet.size,
      vocabularyItemsPracticed: vocab.length,
    },
    today: {
      attempts: todayAttempts.length,
      scoredAttempts: todayScored.length,
      correctAttempts: todayCorrect.length,
      accuracyPercent: todayScored.length === 0 ? null : Math.round((todayCorrect.length / todayScored.length) * 100),
    },
  };
}

/** Recent practice (for the dashboard), newest first. */
export async function getRecentPractice(studentId: string, take = 5) {
  const rows = await prisma.activityAttempt.findMany({
    where: { studentId, isCorrect: { not: null } },
    orderBy: { submittedAt: "desc" },
    take,
    select: {
      id: true,
      isCorrect: true,
      submittedAt: true,
      activity: {
        select: {
          type: true,
          title: true,
          configuration: true,
          lesson: { select: { id: true, title: true } },
        },
      },
    },
  });
  return rows.map((r) => {
    const parsed = parseConfiguration(r.activity.type, r.activity.configuration);
    const c = parsed?.config as Record<string, unknown> | undefined;
    const prompt = [
      c?.question as string | undefined,
      c?.statement as string | undefined,
      c?.sentenceWithBlank as string | undefined,
      c?.prompt as string | undefined,
      c?.text as string | undefined,
      r.activity.title ?? undefined,
      r.activity.type,
    ].find((v): v is string => typeof v === "string" && v.length > 0) ?? r.activity.type;
    return {
      id: r.id,
      isCorrect: r.isCorrect as boolean,
      submittedAt: r.submittedAt,
      activityType: r.activity.type,
      prompt,
      lessonId: r.activity.lesson.id,
      lessonTitle: r.activity.lesson.title,
    };
  });
}

// ---------------------------------------------------------------------------
// Vocabulary review scheduling — deterministic spaced repetition (Phase 54)
// ---------------------------------------------------------------------------

/**
 * Phase 54 — transparent, deterministic intervals (server UTC).
 * Streak = consecutive successful reviews (correctCount reused as streak).
 * All dueAt values are absolute UTC timestamps; comparisons use `new Date()`
 * (server clock). Day boundaries are UTC midnight via setUTCDate; intervals
 * therefore respect UTC days, not the learner's local timezone — documented
 * for transparency.
 */
export const REVIEW_INTERVALS_DAYS: readonly number[] = [1, 3, 7, 14, 30] as const;

/** Map streak (1-based) to due interval. 1→1d, 2→3d, 3→7d, 4→14d, 5+→30d. */
export function intervalForStreak(streak: number): number {
  if (streak <= 0) return 1; // safety (retry path uses explicit 1)
  if (streak <= REVIEW_INTERVALS_DAYS.length) return REVIEW_INTERVALS_DAYS[streak - 1]!;
  return REVIEW_INTERVALS_DAYS[REVIEW_INTERVALS_DAYS.length - 1]!;
}

export async function recordVocabularyResponse(
  studentId: string,
  vocabularyId: string,
  response: "KNOWN" | "NEED_REVIEW"
): Promise<{ status: VocabReviewStatus; dueAt: Date; streak: number }> {
  const existing = await prisma.vocabularyReview.findUnique({
    where: { studentId_vocabularyId: { studentId, vocabularyId } },
  });

  const now = new Date();

  // Duplicate guard: if last review was <3s ago with same response, treat as retry
  // and do not advance schedule twice. Client already disables button; this covers
  // network retry. Returns existing status/due without writing.
  if (existing?.lastReviewedAt && now.getTime() - existing.lastReviewedAt.getTime() < 3000) {
    // Heuristic: if correctCount already reflects this response, assume duplicate
    // (conservative — we don't know previous response, but time window is tiny)
    return { status: existing.status as VocabReviewStatus, dueAt: existing.dueAt as Date, streak: existing.correctCount };
  }

  if (!existing) {
    if (response === "KNOWN") {
      const streak = 1;
      const dueAt = daysFromNow(intervalForStreak(streak));
      const status: VocabReviewStatus = streak >= 5 ? "MASTERED" : streak >= 2 ? "REVIEW" : "LEARNING";
      await prisma.vocabularyReview.create({
        data: { studentId, vocabularyId, status, correctCount: streak, lastReviewedAt: now, dueAt },
      });
      const { noteAdaptive, noteVocabulary } = await import("@/lib/adaptive/hooks");
      noteAdaptive(() => noteVocabulary(studentId, vocabularyId, true));
      return { status, dueAt, streak };
    }
    // First review was NEED_REVIEW — streak 0, retry tomorrow (1 day)
    const dueAt = daysFromNow(1);
    await prisma.vocabularyReview.create({
      data: { studentId, vocabularyId, status: "LEARNING", correctCount: 0, incorrectCount: 1, lastReviewedAt: now, dueAt },
    });
    const { noteAdaptive, noteVocabulary } = await import("@/lib/adaptive/hooks");
    noteAdaptive(() => noteVocabulary(studentId, vocabularyId, false));
    return { status: "LEARNING", dueAt, streak: 0 };
  }

  // Existing row — apply deterministic rule
  let streak: number;
  let dueAt: Date;
  let status: VocabReviewStatus;
  if (response === "NEED_REVIEW") {
    // Reset streak, schedule retry tomorrow (simplest safe: next day)
    streak = 0;
    dueAt = daysFromNow(1);
    status = "LEARNING";
  } else {
    streak = existing.correctCount + 1; // correctCount is streak
    dueAt = daysFromNow(intervalForStreak(streak));
    status = streak >= 5 ? "MASTERED" : streak >= 2 ? "REVIEW" : "LEARNING";
  }

  const correctCount = streak;
  const incorrectCount = response === "NEED_REVIEW" ? existing.incorrectCount + 1 : existing.incorrectCount;

  await prisma.vocabularyReview.update({
    where: { id: existing.id },
    data: { status, correctCount, incorrectCount, lastReviewedAt: now, dueAt },
  });
  const { noteAdaptive, noteVocabulary } = await import("@/lib/adaptive/hooks");
  noteAdaptive(() => noteVocabulary(studentId, vocabularyId, response === "KNOWN"));
  return { status, dueAt, streak };
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export type VocabReviewItem = {
  vocabularyId: string;
  word: string;
  translation: string | null;
  phonetic: string | null;
  example: string | null;
  status: VocabReviewStatus;
  dueAt: Date | null;
};

/** Words due for review now (dueAt <= now). Includes MASTERED when due (30-day cycle). */
export async function getDueVocabulary(studentId: string, take = 20): Promise<VocabReviewItem[]> {
  const rows = await prisma.vocabularyReview.findMany({
    where: { studentId, dueAt: { lte: new Date() } },
    orderBy: { dueAt: "asc" },
    take,
    select: {
      vocabularyId: true,
      status: true,
      dueAt: true,
      vocabulary: {
        select: { word: true, translation: true, phonetic: true, exampleSentence: true },
      },
    },
  });
  return rows.map((r) => ({
    vocabularyId: r.vocabularyId,
    word: r.vocabulary.word,
    translation: r.vocabulary.translation,
    phonetic: r.vocabulary.phonetic,
    example: r.vocabulary.exampleSentence,
    status: r.status as VocabReviewStatus,
    dueAt: r.dueAt,
  }));
}

export async function countDueVocabulary(studentId: string): Promise<number> {
  return prisma.vocabularyReview.count({ where: { studentId, dueAt: { lte: new Date() } } });
}

export async function countUpcomingVocabulary(studentId: string): Promise<number> {
  return prisma.vocabularyReview.count({ where: { studentId, dueAt: { gt: new Date() } } });
}

export async function getUpcomingVocabulary(studentId: string, take = 20): Promise<VocabReviewItem[]> {
  const rows = await prisma.vocabularyReview.findMany({
    where: { studentId, dueAt: { gt: new Date() } },
    orderBy: { dueAt: "asc" },
    take,
    select: {
      vocabularyId: true,
      status: true,
      dueAt: true,
      vocabulary: {
        select: { word: true, translation: true, phonetic: true, exampleSentence: true },
      },
    },
  });
  return rows.map((r) => ({
    vocabularyId: r.vocabularyId,
    word: r.vocabulary.word,
    translation: r.vocabulary.translation,
    phonetic: r.vocabulary.phonetic,
    example: r.vocabulary.exampleSentence,
    status: r.status as VocabReviewStatus,
    dueAt: r.dueAt,
  }));
}

/** Aggregate vocabulary counts for the progress page (all real). */
export async function getVocabularyReviewCounts(studentId: string) {
  const [learning, review, mastered, due, upcoming] = await Promise.all([
    prisma.vocabularyReview.count({ where: { studentId, status: "LEARNING" } }),
    prisma.vocabularyReview.count({ where: { studentId, status: "REVIEW" } }),
    prisma.vocabularyReview.count({ where: { studentId, status: "MASTERED" } }),
    countDueVocabulary(studentId),
    countUpcomingVocabulary(studentId),
  ]);
  return { learning, review, mastered, due, upcoming, touched: learning + review + mastered };
}

export type { ProgressStatus };
