/**
 * Assessment queries — student-facing lists/results/mistake analysis and the
 * teacher result/analytics foundation. Every query is scoped by the SESSION
 * user; permission filters are part of the WHERE clauses, never the UI.
 */
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { correctAnswerText, studentAnswerText } from "./grading";
import { isAutoGradable, SKILL_LABELS, type Skill } from "./registry";
import { assessableByStudent, visibleGroupIds, type Viewer } from "./engine";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ---------------------------------------------------------------------------
// Student — available assessments & history
// ---------------------------------------------------------------------------

export type AvailableAssessment = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  startAt: Date | null;
  endAt: Date | null;
  durationMinutes: number | null;
  passingScore: number;
  maxAttempts: number | null;
  questionsCount: number;
  courseTitle: string | null;
  myAttempts: number;
  activeAttemptId: string | null;
  lastPercentage: number | null;
  lastPassed: boolean | null;
  canStart: boolean;
};

export async function listStudentAssessments(viewer: Viewer): Promise<AvailableAssessment[]> {
  if (viewer.role !== "STUDENT" && viewer.role !== "ADMIN") return [];
  const now = new Date();

  const assessments = await prisma.assessment.findMany({
    where: { status: { in: ["SCHEDULED", "OPEN"] } },
    include: {
      course: { select: { title: true } },
      questions: { select: { id: true } },
    },
    orderBy: [{ startAt: "asc" }, { createdAt: "asc" }],
  });

  const out: AvailableAssessment[] = [];
  for (const a of assessments) {
    if (!(await assessableByStudent(viewer, a))) continue;

    const attempts = await prisma.assessmentAttempt.findMany({
      where: { assessmentId: a.id, studentId: viewer.id },
      orderBy: { attemptNumber: "asc" },
      select: { id: true, status: true, percentage: true, passed: true },
    });
    const active = attempts.find((x) => x.status === "IN_PROGRESS");
    const last = attempts[attempts.length - 1];
    const attemptsLeft = a.maxAttempts === null || attempts.length < a.maxAttempts;

    out.push({
      id: a.id,
      title: a.title,
      description: a.description,
      type: a.type,
      status: a.status,
      startAt: a.startAt,
      endAt: a.endAt,
      durationMinutes: a.durationMinutes,
      passingScore: a.passingScore,
      maxAttempts: a.maxAttempts,
      questionsCount: a.questions.length,
      courseTitle: a.course?.title ?? null,
      myAttempts: attempts.length,
      activeAttemptId: active?.id ?? null,
      lastPercentage: last?.percentage ?? null,
      lastPassed: last?.passed ?? null,
      canStart:
        a.status === "OPEN" &&
        attemptsLeft &&
        (!a.startAt || now >= a.startAt) &&
        (!a.endAt || now <= a.endAt),
    });
  }
  return out;
}

export type HistoryRow = {
  attemptId: string;
  assessmentId: string;
  title: string;
  type: string;
  attemptNumber: number;
  maxAttempts: number | null;
  submittedAt: Date | null;
  startedAt: Date;
  status: string;
  percentage: number | null;
  passed: boolean | null;
  /** false → the assessment hides scores from students */
  resultsVisible: boolean;
};

export async function listMyAttemptHistory(viewer: Viewer): Promise<HistoryRow[]> {
  const attempts = await prisma.assessmentAttempt.findMany({
    where: { studentId: viewer.id, status: { not: "IN_PROGRESS" } },
    include: { assessment: { select: { id: true, title: true, type: true, maxAttempts: true, showResults: true } } },
    orderBy: { startedAt: "desc" },
    take: 100,
  });
  return attempts.map((a) => ({
    attemptId: a.id,
    assessmentId: a.assessment.id,
    title: a.assessment.title,
    type: a.assessment.type,
    attemptNumber: a.attemptNumber,
    maxAttempts: a.assessment.maxAttempts,
    submittedAt: a.submittedAt,
    startedAt: a.startedAt,
    status: a.status,
    percentage: a.assessment.showResults ? a.percentage : null,
    passed: a.assessment.showResults ? a.passed : null,
    resultsVisible: a.assessment.showResults,
  }));
}

// ---------------------------------------------------------------------------
// Student — result detail with review + mistake analysis
// ---------------------------------------------------------------------------

export type ResultQuestion = {
  questionId: string;
  number: number;
  type: string;
  questionText: string;
  points: number;
  pointsEarned: number | null;
  isCorrect: boolean | null;
  /** shown only when the assessment allows it */
  correctText: string | null;
  explanation: string | null;
  studentText: string;
  skill: string | null;
  lessonTitle: string | null;
  grammarTitle: string | null;
  pendingManual: boolean;
};

export type AssessmentResult = {
  attemptId: string;
  assessmentId: string;
  assessmentTitle: string;
  assessmentType: string;
  attemptNumber: number;
  submittedAt: Date | null;
  status: string;
  score: number | null;
  totalPoints: number | null;
  percentage: number | null;
  passed: boolean | null;
  autoSubmitted: boolean;
  timeSpentSec: number | null;
  passingScore: number;
  answeredCount: number;
  questionCount: number;
  correctCount: number;
  incorrectCount: number;
  resultsVisible: boolean;
  reviewAllowed: boolean;
  questions: ResultQuestion[];
  mistakes: { label: string; kind: "skill" | "grammar" | "lesson"; count: number }[];
  skillPerformance: { skill: string; correct: number; total: number; percent: number }[];
};

export async function getResultForStudent(viewer: Viewer, attemptId: string): Promise<AssessmentResult> {
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: { assessment: true },
  });
  if (!attempt || attempt.studentId !== viewer.id) {
    throw new ApiError(404, "Result not found.");
  }
  return buildResult(attempt, attempt.assessment.showResults, attempt.assessment.showCorrectAnswers);
}

export async function getResultForStaff(viewer: Viewer, attemptId: string): Promise<AssessmentResult> {
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: {
      assessment: true,
      student: { select: { id: true, groupId: true } },
    },
  });
  if (!attempt) throw new ApiError(404, "Result not found.");
  if (viewer.role === "TEACHER") {
    const groups = await visibleGroupIds(viewer);
    if (!attempt.student.groupId || !groups?.includes(attempt.student.groupId)) {
      throw new ApiError(403, "This student is not in your groups.");
    }
  }
  // Staff always see full review.
  return buildResult(attempt, true, true);
}

async function buildResult(
  attempt: {
    id: string;
    assessmentId: string;
    attemptNumber: number;
    submittedAt: Date | null;
    status: string;
    score: number | null;
    totalPoints: number | null;
    percentage: number | null;
    passed: boolean | null;
    autoSubmitted: boolean;
    timeSpentSec: number | null;
    questionOrder: string;
    assessment: {
      id: string; title: string; type: string; passingScore: number;
      showResults: boolean; showCorrectAnswers: boolean;
    };
  },
  resultsVisible: boolean,
  reviewAllowed: boolean
): Promise<AssessmentResult> {
  const snapshot = JSON.parse(attempt.questionOrder) as { questionId: string; points: number }[];
  const questions = await prisma.question.findMany({
    where: { id: { in: snapshot.map((s) => s.questionId) } },
    select: {
      id: true, type: true, questionText: true, explanation: true, skill: true,
      configuration: true,
      lesson: { select: { title: true } },
      grammarConcept: { select: { title: true } },
      options: { select: { id: true, text: true, isCorrect: true, order: true }, orderBy: { order: "asc" } },
    },
  });
  const answers = await prisma.assessmentAnswer.findMany({ where: { attemptId: attempt.id } });
  const aByQ = new Map(answers.map((a) => [a.questionId, a]));
  const qById = new Map(questions.map((q) => [q.id, q]));

  const resultQuestions: ResultQuestion[] = snapshot.map((entry, index) => {
    const q = qById.get(entry.questionId);
    const a = aByQ.get(entry.questionId);
    const savedAnswer = a?.answer ? (JSON.parse(a.answer) as any) : null;
    const options = q?.options ?? [];
    const manual = q ? !isAutoGradable(q.type) : false;
    return {
      questionId: entry.questionId,
      number: index + 1,
      type: q?.type ?? "MULTIPLE_CHOICE",
      questionText: q?.questionText ?? "(deleted question)",
      points: entry.points,
      pointsEarned: a?.pointsEarned ?? null,
      isCorrect: a?.isCorrect ?? null,
      correctText: reviewAllowed && q ? correctAnswerText(q.type, JSON.parse(q.configuration), options) : null,
      explanation: reviewAllowed ? q?.explanation ?? null : null,
      studentText: q ? studentAnswerText(q.type, savedAnswer, options) : "—",
      skill: q?.skill ?? null,
      lessonTitle: q?.lesson?.title ?? null,
      grammarTitle: q?.grammarConcept?.title ?? null,
      pendingManual: manual,
    };
  });

  // Mistake grouping — a learning aid, not a label.
  const mistakeMap = new Map<string, { kind: "skill" | "grammar" | "lesson"; count: number }>();
  for (const q of resultQuestions) {
    if (q.isCorrect !== false) continue;
    const keys: [string, "skill" | "grammar" | "lesson"][] = [];
    if (q.skill) keys.push([SKILL_LABELS[q.skill as Skill] ?? q.skill, "skill"]);
    if (q.grammarTitle) keys.push([q.grammarTitle, "grammar"]);
    if (q.lessonTitle) keys.push([q.lessonTitle, "lesson"]);
    for (const [label, kind] of keys) {
      const prev = mistakeMap.get(label) ?? { kind, count: 0 };
      prev.count += 1;
      mistakeMap.set(label, prev);
    }
  }

  // Skill performance (descriptive only) over auto-graded questions.
  const skillTotals = new Map<string, { correct: number; total: number }>();
  for (const q of resultQuestions) {
    if (q.pendingManual || q.isCorrect === null || !q.skill) continue;
    const t = skillTotals.get(q.skill) ?? { correct: 0, total: 0 };
    t.total += 1;
    if (q.isCorrect) t.correct += 1;
    skillTotals.set(q.skill, t);
  }

  return {
    attemptId: attempt.id,
    assessmentId: attempt.assessment.id,
    assessmentTitle: attempt.assessment.title,
    assessmentType: attempt.assessment.type,
    attemptNumber: attempt.attemptNumber,
    submittedAt: attempt.submittedAt,
    status: attempt.status,
    score: resultsVisible ? attempt.score : null,
    totalPoints: resultsVisible ? attempt.totalPoints : null,
    percentage: resultsVisible ? attempt.percentage : null,
    passed: resultsVisible ? attempt.passed : null,
    autoSubmitted: attempt.autoSubmitted,
    timeSpentSec: attempt.timeSpentSec,
    passingScore: attempt.assessment.passingScore,
    answeredCount: answers.filter((a) => a.answer !== null).length,
    questionCount: snapshot.length,
    correctCount: answers.filter((a) => a.isCorrect === true).length,
    incorrectCount: answers.filter((a) => a.isCorrect === false).length,
    resultsVisible,
    reviewAllowed: resultsVisible && reviewAllowed,
    questions: resultsVisible ? resultQuestions : [],
    mistakes: resultsVisible
      ? [...mistakeMap.entries()]
          .map(([label, v]) => ({ label, kind: v.kind, count: v.count }))
          .sort((x, y) => y.count - x.count)
      : [],
    skillPerformance: resultsVisible
      ? [...skillTotals.entries()].map(([skill, t]) => ({
          skill: SKILL_LABELS[skill as Skill] ?? skill,
          correct: t.correct,
          total: t.total,
          percent: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0,
        }))
      : [],
  };
}

// ---------------------------------------------------------------------------
// Teacher — assessments list, results, analytics
// ---------------------------------------------------------------------------

export async function listAssessmentsForStaff(viewer: Viewer) {
  const where =
    viewer.role === "ADMIN"
      ? {}
      : {
          OR: [
            { createdById: viewer.id },
            { course: { assignments: { some: { groupId: { in: (await visibleGroupIds(viewer)) ?? [] } } } } },
          ],
        };
  const rows = await prisma.assessment.findMany({
    where,
    include: {
      course: { select: { title: true } },
      level: { select: { displayName: true } },
      _count: { select: { questions: true, attempts: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map((a) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    type: a.type,
    status: a.status,
    startAt: a.startAt,
    endAt: a.endAt,
    durationMinutes: a.durationMinutes,
    passingScore: a.passingScore,
    maxAttempts: a.maxAttempts,
    questionsCount: a._count.questions,
    attemptsCount: a._count.attempts,
    courseTitle: a.course?.title ?? a.level?.displayName ?? null,
    updatedAt: a.updatedAt,
  }));
}

export type StaffResultRow = {
  attemptId: string;
  studentName: string;
  groupName: string | null;
  assessmentTitle: string;
  assessmentType: string;
  attemptNumber: number;
  status: string;
  percentage: number | null;
  passed: boolean | null;
  submittedAt: Date | null;
};

export async function listResultsForStaff(
  viewer: Viewer,
  filters: { groupId?: string; assessmentId?: string; result?: string; from?: Date; to?: Date; page?: number; q?: string }
): Promise<{ rows: StaffResultRow[]; total: number; page: number; pageSize: number }> {
  const pageSize = 25;
  const page = Math.max(1, filters.page ?? 1);

  const where: any = { status: { not: "IN_PROGRESS" } };
  if (filters.assessmentId) where.assessmentId = filters.assessmentId;
  if (filters.result === "PASSED") where.passed = true;
  if (filters.result === "NOT_PASSED") where.passed = false;

  const studentWhere: any = { role: "STUDENT" };
  const groupIds = await visibleGroupIds(viewer);
  if (viewer.role === "TEACHER") {
    studentWhere.groupId = { in: groupIds ?? [] };
  } else if (filters.groupId) {
    studentWhere.groupId = filters.groupId;
  }
  if (filters.from || filters.to) {
    where.submittedAt = {};
    if (filters.from) where.submittedAt.gte = filters.from;
    if (filters.to) where.submittedAt.lte = filters.to;
  }
  where.student = studentWhere;

  // Free-text search over the student (name / username / code) and the
  // assessment title. Each whitespace-separated token must match one of those
  // fields, so "Mei Chen" narrows instead of widening. The clause is ANDed with
  // the permission scope assigned to `where.student` above — it can only ever
  // narrow what the viewer is already allowed to see, never widen it.
  const tokens = (filters.q ?? "").trim().split(/\s+/).filter(Boolean);
  if (tokens.length > 0) {
    where.AND = tokens.map((token) => ({
      OR: [
        { student: { firstName: { contains: token } } },
        { student: { lastName: { contains: token } } },
        { student: { username: { contains: token } } },
        { student: { employeeCode: { contains: token } } },
        { assessment: { title: { contains: token } } },
      ],
    }));
  }

  const [rows, total] = await Promise.all([
    prisma.assessmentAttempt.findMany({
      where,
      include: {
        student: { select: { firstName: true, lastName: true, group: { select: { name: true } } } },
        assessment: { select: { title: true, type: true } },
      },
      orderBy: { submittedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.assessmentAttempt.count({ where }),
  ]);

  // A narrowed result set (search/filters) can leave `page` beyond the last
  // page — e.g. a bookmarked URL or a filter applied to a later page. Re-run
  // once against the last real page so we never render an empty page while
  // matching rows exist.
  if (rows.length === 0 && total > 0 && page > 1) {
    return listResultsForStaff(viewer, { ...filters, page: Math.max(1, Math.ceil(total / pageSize)) });
  }

  return {
    rows: rows.map((a) => ({
      attemptId: a.id,
      studentName: `${a.student.firstName} ${a.student.lastName}`,
      groupName: a.student.group?.name ?? null,
      assessmentTitle: a.assessment.title,
      assessmentType: a.assessment.type,
      attemptNumber: a.attemptNumber,
      status: a.status,
      percentage: a.percentage,
      passed: a.passed,
      submittedAt: a.submittedAt,
    })),
    total,
    page,
    pageSize,
  };
}

/** Per-group aggregates for one assessment (no individual rankings). */
export async function groupAnalyticsForStaff(viewer: Viewer, assessmentId: string) {
  const groups = await visibleGroupIds(viewer);
  const whereGroups = groups ? { id: { in: groups } } : {};
  const groupsRows = await prisma.learningGroup.findMany({
    where: whereGroups,
    include: { members: { where: { role: "STUDENT", status: "ACTIVE" }, select: { id: true } } },
    orderBy: { name: "asc" },
  });

  const attempts = await prisma.assessmentAttempt.findMany({
    where: { assessmentId, status: { not: "IN_PROGRESS" } },
    select: { studentId: true, percentage: true, passed: true, status: true },
  });

  return groupsRows.map((g) => {
    const memberIds = new Set(g.members.map((m) => m.id));
    const groupAttempts = attempts.filter((a) => memberIds.has(a.studentId));
    const byStudent = new Map<string, (typeof groupAttempts)[number]>();
    // best attempt per student
    for (const a of groupAttempts) {
      const prev = byStudent.get(a.studentId);
      if (!prev || (a.percentage ?? -1) > (prev.percentage ?? -1)) byStudent.set(a.studentId, a);
    }
    const completed = [...byStudent.values()].filter((a) => a.percentage !== null);
    const avg = completed.length
      ? Math.round(completed.reduce((s, a) => s + (a.percentage ?? 0), 0) / completed.length)
      : null;
    return {
      groupId: g.id,
      groupName: g.name,
      students: memberIds.size,
      completed: completed.length,
      average: avg,
      passed: completed.filter((a) => a.passed === true).length,
      notPassed: completed.filter((a) => a.passed === false).length,
    };
  });
}

/** Aggregate performance per skill for one assessment (descriptive only). */
export async function skillAnalyticsForStaff(assessmentId: string) {
  const links = await prisma.assessmentQuestion.findMany({
    where: { assessmentId },
    include: { question: { select: { skill: true } } },
  });
  const answers = await prisma.assessmentAnswer.findMany({
    where: {
      attempt: { assessmentId, status: { not: "IN_PROGRESS" } },
      isCorrect: { not: null },
    },
    select: { questionId: true, isCorrect: true },
  });
  const skillByQuestion = new Map(links.map((l) => [l.questionId, l.question.skill]));
  const totals = new Map<string, { correct: number; total: number }>();
  for (const a of answers) {
    const skill = skillByQuestion.get(a.questionId);
    if (!skill) continue;
    const t = totals.get(skill) ?? { correct: 0, total: 0 };
    t.total += 1;
    if (a.isCorrect) t.correct += 1;
    totals.set(skill, t);
  }
  return [...totals.entries()].map(([skill, t]) => ({
    skill: SKILL_LABELS[skill as Skill] ?? skill,
    correct: t.correct,
    total: t.total,
    percent: t.total > 0 ? Math.round((t.correct / t.total) * 100) : 0,
  }));
}
