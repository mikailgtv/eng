/**
 * Assessment engine — attempt lifecycle, server-authoritative timing,
 * progressive answer saving, transactional submission and grading.
 *
 * Security invariants enforced HERE (never in the client):
 *  - student identity comes from the session, never the request body
 *  - start times / deadlines are server timestamps (browser clock ignored)
 *  - attempt limits, open windows and single-active-attempt are transactional
 *  - answers are graded server-side at submission; scores cannot be forged
 *  - submissions after expiry are rejected (the server auto-finalizes instead)
 *  - double submission is impossible (guarded row update inside a transaction)
 */
import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { answerSchemaFor } from "./schemas";
import { gradeAnswer, correctAnswerText, studentAnswerText } from "./grading";
import {
  isQuestionType,
  isAutoGradable,
  OPTION_TYPES,
  SUBMIT_GRACE_SECONDS,
} from "./registry";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type Viewer = { id: string; role: string; groupId: string | null };

type SnapshotEntry = {
  questionId: string;
  points: number;
  optionOrder: string[] | null;
  /** Sanitized per-attempt layout: shuffled columns/tokens (never the answers). */
  layout?: { lefts?: string[]; rights?: string[]; tokens?: string[] } | null;
};

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

/** Assessments are managed by admins and teachers. */
export function canManage(viewer: Viewer): boolean {
  return viewer.role === "ADMIN" || viewer.role === "TEACHER";
}

/** Groups whose results a teacher may see (admin: all → null = no filter). */
export async function visibleGroupIds(viewer: Viewer): Promise<string[] | null> {
  if (viewer.role === "ADMIN") return null;
  const groups = await prisma.learningGroup.findMany({
    where: { teacherId: viewer.id },
    select: { id: true },
  });
  return groups.map((g) => g.id);
}

/**
 * Which students may SEE/START this assessment: students whose group is
 * assigned to the assessment's course (published chain). Level/module-scoped
 * assessments resolve to their course the same way. Admin may preview.
 */
export async function assessableByStudent(
  viewer: Viewer,
  assessment: { courseId: string | null; levelId: string | null; moduleId: string | null; status: string }
): Promise<boolean> {
  if (viewer.role === "ADMIN") return true;
  if (viewer.groupId === null) return false;

  const courseId = await resolveCourseId(assessment);
  if (!courseId) return false;

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      status: "PUBLISHED",
      level: { status: "ACTIVE" },
      assignments: { some: { groupId: viewer.groupId } },
    },
    select: { id: true },
  });
  return course !== null;
}

async function resolveCourseId(a: { courseId: string | null; levelId: string | null; moduleId: string | null }): Promise<string | null> {
  if (a.courseId) return a.courseId;
  if (a.moduleId) {
    const m = await prisma.module.findUnique({ where: { id: a.moduleId }, select: { courseId: true } });
    return m?.courseId ?? null;
  }
  if (a.levelId) {
    // Level-scoped assessments are visible to students taking ANY active
    // course of that level assigned to their group.
    const c = await prisma.course.findFirst({
      where: { levelId: a.levelId, status: "PUBLISHED", assignments: { some: {} } },
      select: { id: true },
    });
    return c?.id ?? null;
  }
  return null;
}

/** Open-window check against SERVER time. */
export function isWindowOpen(a: { status: string; startAt: Date | null; endAt: Date | null }, now = new Date()): boolean {
  if (a.status !== "OPEN") return false;
  if (a.startAt && now < a.startAt) return false;
  if (a.endAt && now > a.endAt) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Starting / resuming
// ---------------------------------------------------------------------------

export type StartedAttempt = {
  id: string;
  attemptNumber: number;
  status: string;
  startedAt: Date;
  deadlineAt: Date | null;
  resumed: boolean;
};

/**
 * Start a new attempt or resume the active one. Everything that guards the
 * attempt count and the official start time happens inside one transaction.
 */
export async function startOrResumeAttempt(viewer: Viewer, assessmentId: string): Promise<StartedAttempt> {
  if (viewer.role !== "STUDENT") throw new ApiError(403, "Only students can take assessments.");

  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { questions: { select: { questionId: true } } },
  });
  if (!assessment) throw new ApiError(404, "Assessment not found.");
  if (!(await assessableByStudent(viewer, assessment))) throw new ApiError(404, "Assessment not found.");

  // An active attempt is always resumed — refreshing can never create a
  // second run or reset the timer.
  const active = await prisma.assessmentAttempt.findFirst({
    where: { assessmentId, studentId: viewer.id, status: "IN_PROGRESS" },
    orderBy: { attemptNumber: "desc" },
  });
  if (active) {
    const finalized = await finalizeIfExpired(active.id);
    if (finalized) throw new ApiError(409, "This attempt has already finished.");
    return {
      id: active.id,
      attemptNumber: active.attemptNumber,
      status: active.status,
      startedAt: active.startedAt,
      deadlineAt: active.deadlineAt,
      resumed: true,
    };
  }

    if (assessment.questions.length === 0) {
      throw new ApiError(422, "This assessment has no questions yet.");
    }
    if (!isWindowOpen(assessment)) {
      throw new ApiError(
        422,
        assessment.status === "SCHEDULED"
          ? "This assessment is not open yet."
          : "This assessment is closed."
      );
    }

    const { assertRetakeAllowed } = await import("@/lib/assessment/intelligence/retake");
    await assertRetakeAllowed(assessmentId, viewer.id);

  try {
    return await prisma.$transaction(async (tx) => {
    const used = await tx.assessmentAttempt.count({
      where: { assessmentId, studentId: viewer.id },
    });
    if (assessment.maxAttempts !== null && used >= assessment.maxAttempts) {
      throw new ApiError(422, "You have used all of your attempts for this assessment.");
    }

    const now = new Date(); // SERVER time — the official start
    const published = await prisma.question.findMany({
      where: { id: { in: assessment.questions.map((q) => q.questionId) }, status: "PUBLISHED" },
      include: { options: { select: { id: true }, orderBy: { order: "asc" } } },
    });
    if (published.length === 0) throw new ApiError(422, "This assessment has no questions yet.");

    const links = await prisma.assessmentQuestion.findMany({
      where: { assessmentId },
      orderBy: { order: "asc" },
      select: { questionId: true, points: true },
    });
    const byId = new Map(published.map((q) => [q.id, q]));

    // Snapshot: order (+ optional shuffle), points and rendered option order
    // are frozen for THIS attempt so refreshes can never reshuffle or extend.
    const snapshot: SnapshotEntry[] = [];
    for (const link of links) {
      const q = byId.get(link.questionId);
      if (!q) continue;
      const optionOrder =
        assessment.randomizeOptions && OPTION_TYPES.has(q.type as any)
          ? shuffle(q.options.map((o) => o.id))
          : null;
      // Matching/word-order layouts are always shuffled per attempt — the
      // stored configuration itself must never reach the client.
      let layout: SnapshotEntry["layout"] = null;
      const cfg = safeJson(q.configuration) as Record<string, unknown> | null;
      if (q.type === "MATCHING" && cfg?.pairs) {
        const pairs = cfg.pairs as { left: string; right: string }[];
        layout = { lefts: shuffle(pairs.map((p) => p.left)), rights: shuffle(pairs.map((p) => p.right)) };
      } else if (q.type === "WORD_ORDER" && cfg?.words) {
        layout = { tokens: shuffle(cfg.words as string[]) };
      }
      snapshot.push({ questionId: q.id, points: link.points, optionOrder, layout });
    }
    if (assessment.randomizeQuestions) shuffleInPlace(snapshot);

    const deadline =
      assessment.durationMinutes !== null
        ? new Date(now.getTime() + assessment.durationMinutes * 60_000)
        : null;

    const attempt = await tx.assessmentAttempt.create({
      data: {
        assessmentId,
        studentId: viewer.id,
        attemptNumber: used + 1,
        startedAt: now,
        deadlineAt: deadline,
        status: "IN_PROGRESS",
        questionOrder: JSON.stringify(snapshot),
      },
    });

    const { freezeAttempt } = await import("@/lib/assessment/intelligence/snapshot");
    await freezeAttempt(attempt.id);
    const { applyAccommodation } = await import("@/lib/assessment/intelligence/accommodation");
    await applyAccommodation(attempt.id, viewer.id, assessmentId);

    return {
      id: attempt.id,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      startedAt: attempt.startedAt,
      deadlineAt: attempt.deadlineAt,
      resumed: false,
    };
  });
  } catch (err) {
    // Two starts at once: the unique (assessment, student, attemptNumber)
    // constraint lets exactly one row win. Return that sitting instead of 500.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const winner = await prisma.assessmentAttempt.findFirst({
        where: { assessmentId, studentId: viewer.id, status: "IN_PROGRESS" },
        orderBy: { attemptNumber: "desc" },
      });
      if (winner) {
        return {
          id: winner.id,
          attemptNumber: winner.attemptNumber,
          status: winner.status,
          startedAt: winner.startedAt,
          deadlineAt: winner.deadlineAt,
          resumed: true,
        };
      }
    }
    throw err;
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ---------------------------------------------------------------------------
// Attempt state (sanitized for the student)
// ---------------------------------------------------------------------------

export async function getOwnedAttempt(viewer: Viewer, attemptId: string) {
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: { assessment: true },
  });
  if (!attempt) throw new ApiError(404, "Attempt not found.");
  if (attempt.studentId !== viewer.id) throw new ApiError(404, "Attempt not found.");
  return attempt;
}

/** Server-graded, expired attempts are finalized before the student sees them. */
export async function finalizeIfExpired(attemptId: string): Promise<string | null> {
  const attempt = await prisma.assessmentAttempt.findUnique({ where: { id: attemptId } });
  if (!attempt || attempt.status !== "IN_PROGRESS" || !attempt.deadlineAt) return null;
  if (Date.now() <= attempt.deadlineAt.getTime() + SUBMIT_GRACE_SECONDS * 1000) return null;

  await gradeAndFinish(attempt.id, { auto: true, expired: true });
  return "EXPIRED";
}

export async function getAttemptState(viewer: Viewer, attemptId: string) {
  let attempt = await getOwnedAttempt(viewer, attemptId);
  await finalizeIfExpired(attempt.id);
  attempt = await getOwnedAttempt(viewer, attemptId);

  const snapshot = JSON.parse(attempt.questionOrder) as SnapshotEntry[];
  const questions = await prisma.question.findMany({
    where: { id: { in: snapshot.map((s) => s.questionId) } },
    include: { options: true },
  });
  const qById = new Map(questions.map((q) => [q.id, q]));
  const answers = await prisma.assessmentAnswer.findMany({ where: { attemptId } });
  const aByQ = new Map(answers.map((a) => [a.questionId, a]));

  const rendered = snapshot
    .map((entry, index) => {
      const q = qById.get(entry.questionId);
      if (!q) return null;
      const parsedConfig = safeJson(q.configuration) as Record<string, unknown> | null;
      // Sanitized config — correct answers / transcripts never leave the server.
      let config: Record<string, unknown> = {};
      if (q.type === "LISTENING") config = { audioUrl: parsedConfig?.audioUrl as string };
      else if (entry.layout?.lefts && entry.layout.rights) {
        config = { lefts: entry.layout.lefts, rights: entry.layout.rights };
      } else if (entry.layout?.tokens) {
        config = { tokens: entry.layout.tokens };
      } else if (!isAutoGradable(q.type)) {
        const prompt = (parsedConfig as { prompt?: string } | null)?.prompt;
        if (prompt) config = { prompt };
      }
      const options = q.options
        .slice()
        .sort((a, b) => {
          const ao = entry.optionOrder?.indexOf(a.id) ?? a.order;
          const bo = entry.optionOrder?.indexOf(b.id) ?? b.order;
          return ao - bo;
        })
        .map((o) => ({ id: o.id, text: o.text }));

      return {
        id: q.id,
        number: index + 1,
        type: q.type,
        points: entry.points,
        questionText: q.questionText,
        skill: q.skill,
        config,
        options,
        answered: aByQ.has(q.id),
      };
    })
    .filter(Boolean);

  return {
    attempt: {
      id: attempt.id,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      startedAt: attempt.startedAt,
      deadlineAt: attempt.deadlineAt,
      serverNow: new Date(),
      autoSubmitted: attempt.autoSubmitted,
    },
    questions: rendered,
    answers: Object.fromEntries(
      [...aByQ.entries()].map(([qid, a]) => [qid, safeJson(a.answer)])
    ),
  };
}

// ---------------------------------------------------------------------------
// Answer saving (progressive, idempotent per question)
// ---------------------------------------------------------------------------

export async function saveAnswer(viewer: Viewer, attemptId: string, questionId: string, answer: unknown) {
  const attempt = await getOwnedAttempt(viewer, attemptId);
  if (attempt.status !== "IN_PROGRESS") {
    throw new ApiError(409, "This attempt has already been submitted.");
  }
  const assessment = attempt.assessment;
  if (assessment.status === "CLOSED" || assessment.status === "ARCHIVED") {
    throw new ApiError(422, "This assessment has been closed.");
  }
  if (attempt.deadlineAt && Date.now() > attempt.deadlineAt.getTime() + SUBMIT_GRACE_SECONDS * 1000) {
    throw new ApiError(422, "Time is up for this attempt.");
  }

  const question = await prisma.question.findFirst({
    where: { id: questionId, status: "PUBLISHED" },
    select: { id: true, type: true },
  });
  if (!question) throw new ApiError(404, "Question not found in this attempt.");

  // The question must belong to this attempt's snapshot.
  const snapshot = JSON.parse(attempt.questionOrder) as SnapshotEntry[];
  if (!snapshot.some((s) => s.questionId === questionId)) {
    throw new ApiError(404, "Question not found in this attempt.");
  }

  // Shape-check (strict) — junk is rejected, but grading happens at submit.
  const parsed = answerSchemaFor(question.type).parse(answer);

  await prisma.assessmentAnswer.upsert({
    where: { attemptId_questionId: { attemptId, questionId } },
    create: { attemptId, questionId, answer: JSON.stringify(parsed), answeredAt: new Date() },
    update: { answer: JSON.stringify(parsed), answeredAt: new Date() },
  });
  return { saved: true, answeredAt: new Date() };
}

// ---------------------------------------------------------------------------
// Submission + grading
// ---------------------------------------------------------------------------

export type SubmitResult = {
  attemptId: string;
  status: string;
  score: number;
  totalPoints: number;
  percentage: number;
  passed: boolean;
  autoSubmitted: boolean;
};

export async function submitAttempt(
  viewer: Viewer,
  attemptId: string,
  opts: { auto?: boolean } = {}
): Promise<SubmitResult> {
  const attempt = await getOwnedAttempt(viewer, attemptId);
  if (attempt.status !== "IN_PROGRESS") {
    throw new ApiError(409, "This attempt has already been submitted.");
  }
  const now = Date.now();
  const deadline = attempt.deadlineAt?.getTime() ?? null;
  const expired = deadline !== null && now > deadline + SUBMIT_GRACE_SECONDS * 1000;
  const closed = attempt.assessment.status === "CLOSED" || attempt.assessment.status === "ARCHIVED";

  if (!opts.auto && expired) {
    // The server — not the student — finalizes expired attempts.
    const result = await gradeAndFinish(attemptId, { auto: true, expired: true });
    return { attemptId, ...result };
  }
  if (!opts.auto && closed) {
    throw new ApiError(422, "This assessment has been closed.");
  }
  const result = await gradeAndFinish(attemptId, { auto: !!opts.auto, expired });
  const { afterAssessmentSubmit } = await import("@/lib/assessment/intelligence/after-submit");
  await afterAssessmentSubmit(attemptId).catch(() => undefined);
  const { noteAdaptive, noteExam } = await import("@/lib/adaptive/hooks");
  noteAdaptive(() => noteExam(viewer.id, attemptId, result.score, result.totalPoints));
  return { attemptId, ...result };
}

/**
 * Grade every question server-side and finish the attempt — guarded update
 * inside a transaction makes double submission a no-op (one writer wins).
 */
async function gradeAndFinish(
  attemptId: string,
  { auto, expired }: { auto: boolean; expired: boolean }
): Promise<Omit<SubmitResult, "attemptId">> {
  return prisma.$transaction(async (tx) => {
    const attempt = await tx.assessmentAttempt.findUnique({
      where: { id: attemptId },
      include: { assessment: true },
    });
    if (!attempt || attempt.status !== "IN_PROGRESS") {
      // Another request (or auto-finalize) already finished it — return the
      // stored outcome so the student still sees a consistent result.
      return {
        status: attempt?.status ?? "GRADED",
        score: attempt?.score ?? 0,
        totalPoints: attempt?.totalPoints ?? 0,
        percentage: attempt?.percentage ?? 0,
        passed: attempt?.passed ?? false,
        autoSubmitted: attempt?.autoSubmitted ?? true,
      };
    }

    const snapshot = JSON.parse(attempt.questionOrder) as SnapshotEntry[];
    const questions = await tx.question.findMany({
      where: { id: { in: snapshot.map((s) => s.questionId) } },
      include: { options: { select: { id: true, text: true, isCorrect: true, order: true } } },
    });
    const qById = new Map(questions.map((q) => [q.id, q]));
    const saved = await tx.assessmentAnswer.findMany({ where: { attemptId } });
    const savedByQ = new Map(saved.map((a) => [a.questionId, safeJson(a.answer)]));

    let earned = 0;
    let autoTotal = 0;
    let hasManual = false;

    for (const entry of snapshot) {
      const q = qById.get(entry.questionId);
      if (!q) continue;
      if (!isAutoGradable(q.type)) {
        hasManual = true;
        await tx.assessmentAnswer.upsert({
          where: { attemptId_questionId: { attemptId, questionId: q.id } },
          create: { attemptId, questionId: q.id, answer: (savedByQ.get(q.id) ? JSON.stringify(savedByQ.get(q.id)) : null) },
          update: { isCorrect: null, pointsEarned: null },
        });
        continue;
      }
      autoTotal += entry.points;
      const outcome = gradeAnswer(q.type, safeJson(q.configuration), q.options, savedByQ.get(q.id) ?? null);
      const correct = outcome.kind === "auto" ? outcome.isCorrect : false;
      const points = correct ? entry.points : 0;
      earned += points;
      await tx.assessmentAnswer.upsert({
        where: { attemptId_questionId: { attemptId, questionId: q.id } },
        create: {
          attemptId,
          questionId: q.id,
          answer: savedByQ.has(q.id) ? JSON.stringify(savedByQ.get(q.id)) : null,
          isCorrect: outcome.kind === "auto" ? correct : null,
          pointsEarned: outcome.kind === "auto" ? points : null,
        },
        update: { isCorrect: correct, pointsEarned: points },
      });
    }

    const totalPoints = snapshot.reduce((sum, s) => sum + s.points, 0);
    // Percentage is over auto-gradable points; manual items stay pending.
    const percentage = autoTotal > 0 ? Math.round((earned / autoTotal) * 100) : 0;
    const passed = percentage >= attempt.assessment.passingScore;
    const submittedAt = new Date();
    const timeSpentSec = Math.max(0, Math.round((submittedAt.getTime() - attempt.startedAt.getTime()) / 1000));

    // Guarded finish: only the FIRST request flips IN_PROGRESS → terminal.
    const updated = await tx.assessmentAttempt.updateMany({
      where: { id: attemptId, status: "IN_PROGRESS" },
      data: {
        status: expired ? "EXPIRED" : "GRADED",
        submittedAt,
        score: earned,
        totalPoints,
        percentage,
        passed,
        autoSubmitted: auto || expired,
        timeSpentSec,
      },
    });
    if (updated.count === 0) {
      const existing = await tx.assessmentAttempt.findUniqueOrThrow({ where: { id: attemptId } });
      return {
        status: existing.status!,
        score: existing.score!,
        totalPoints: existing.totalPoints!,
        percentage: existing.percentage!,
        passed: existing.passed!,
        autoSubmitted: existing.autoSubmitted,
      };
    }

    if (hasManual) {
      // Keep the attempt graded for auto questions; manual items simply have
      // null scores and are surfaced as "awaiting review" in the UI.
      void hasManual;
    }
    return { status: expired ? "EXPIRED" : "GRADED", score: earned, totalPoints, percentage, passed, autoSubmitted: auto || expired };
  });
}

/**
 * When a teacher closes or archives an assessment, every in-progress attempt
 * is graded immediately from the answers already saved. Students cannot keep
 * writing, and nothing they already answered is lost.
 */
export async function finalizeOpenAttempts(assessmentId: string): Promise<number> {
  const open = await prisma.assessmentAttempt.findMany({
    where: { assessmentId, status: "IN_PROGRESS" },
    select: { id: true },
  });
  for (const attempt of open) {
    await gradeAndFinish(attempt.id, { auto: true, expired: false });
  }
  return open.length;
}

function safeJson(v: string | null): any {
  if (!v) return null;
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}
