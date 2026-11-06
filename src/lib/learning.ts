import { logSafeError } from "@/lib/logging";
/**
 * Learning data-access layer: assigned courses, real progress calculation,
 * lesson views and progress mutations.
 *
 * Rules enforced here (do not bypass):
 *  - Students only ever see PUBLISHED content under ACTIVE levels.
 *  - Students only see courses assigned to THEIR group (CourseAssignment).
 *  - Progress is always scoped to the session user's own id — never a
 *    client-supplied id.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { canAccessCourseAtLevel, getStudentLevelAccessContext, studentCanAccessCourse } from "@/lib/learning/level-access";
import { parseBlock } from "@/lib/blocks";
import type { ProgressStatus } from "@/lib/constants";
import type {
  ContinueLearning,
  CourseOverview,
  LearningSummary,
  LessonRef,
  LessonView,
  RecentLesson,
} from "@/types/learning";

// ---------------------------------------------------------------------------
// Assigned courses + calculated progress
// ---------------------------------------------------------------------------

function lessonToRef(l: {
  id: string;
  title: string;
  description: string | null;
  durationMin: number | null;
  order: number;
  primarySkill?: string | null;
  lockedReason?: string | null;
  progress?: { status: string }[] | null;
}): LessonRef {
  const status = l.progress?.[0]?.status ?? "NOT_STARTED";
  return {
    id: l.id,
    title: l.title,
    description: l.description,
    durationMin: l.durationMin,
    order: l.order,
    progress: status as ProgressStatus,
    primarySkill: l.primarySkill ?? null,
    lockedReason: l.lockedReason ?? null,
  };
}

/**
 * All published courses assigned to the student's group, with modules,
 * lessons, the student's own progress and calculated percentages.
 */
export async function getAssignedCourseOverviews(studentId: string, groupId: string | null): Promise<CourseOverview[]> {
  const context = await getStudentLevelAccessContext(studentId);
  if (!context) return [];
  const accessOr: Prisma.CourseWhereInput[] = [{ studentAssignments: { some: { studentId, active: true } } }];
  if (groupId) accessOr.push({ assignments: { some: { groupId } } });

  const candidates = await prisma.course.findMany({
    where: {
      status: "PUBLISHED",
      level: { status: "ACTIVE" },
      OR: accessOr,
    },
    orderBy: { level: { order: "asc" } },
    select: {
      id: true,
      title: true,
      description: true,
      curriculum: { select: { isDemo: true } },
      assignments: { select: { groupId: true } },
      studentAssignments: { where: { studentId, active: true }, select: { accessType: true } },
      level: {
        select: { id: true, code: true, name: true, status: true, order: true, displayName: true, organizationId: true },
      },
      modules: {
        where: { status: "PUBLISHED" },
        orderBy: { order: "asc" },
        select: {
          id: true,
          title: true,
          description: true,
          order: true,
          lessons: {
            where: { status: "PUBLISHED" },
            orderBy: { order: "asc" },
            select: {
              id: true,
              title: true,
              description: true,
              durationMin: true,
              order: true,
              primarySkill: true,
              progress: { where: { studentId }, select: { status: true } },
            },
          },
        },
      },
    },
  });
  const courses = candidates.filter((course) => {
    if (course.level.organizationId && course.level.organizationId !== context.organizationId) return false;
    const groupAssigned = !!groupId && course.assignments.some((assignment) => assignment.groupId === groupId);
    const explicitAssignment = course.studentAssignments.some((assignment) => ["ASSIGNED", "PREVIEW"].includes(assignment.accessType));
    return canAccessCourseAtLevel({ context, courseLevelOrder: course.level.order, groupAssigned, explicitAssignment });
  });
  const lessonIds = courses.flatMap((course) => course.modules.flatMap((module) => module.lessons.map((lesson) => lesson.id)));
  const prerequisites = lessonIds.length ? await prisma.contentPrerequisite.findMany({ where: { resourceType: "LESSON", resourceId: { in: lessonIds }, requiredType: "LESSON" } }) : [];
  const releases = lessonIds.length ? await prisma.contentRelease.findMany({ where: { resourceType: "LESSON", resourceId: { in: lessonIds } } }) : [];
  const overrides = lessonIds.length ? await prisma.contentOverride.findMany({ where: { studentId, resourceType: "LESSON", resourceId: { in: lessonIds } }, select: { resourceId: true } }) : [];
  const requiredIds = [...new Set(prerequisites.map((row) => row.requiredId).concat(releases.map((row) => row.afterType === "LESSON" && row.afterId ? row.afterId : "").filter(Boolean)))];
  const [requiredProgress, requiredLessons] = requiredIds.length ? await Promise.all([
    prisma.lessonProgress.findMany({ where: { studentId, lessonId: { in: requiredIds }, status: "COMPLETED" }, select: { lessonId: true } }),
    prisma.lesson.findMany({ where: { id: { in: requiredIds } }, select: { id: true, title: true } }),
  ]) : [[], []];
  const completedRequired = new Set(requiredProgress.map((row) => row.lessonId));
  const requiredTitles = new Map(requiredLessons.map((row) => [row.id, row.title]));
  const overrideIds = new Set(overrides.map((row) => row.resourceId));
  const releaseMap = new Map(releases.map((row) => [row.resourceId, row]));
  const lockReason = (lessonId: string) => {
    if (overrideIds.has(lessonId)) return null;
    const release = releaseMap.get(lessonId);
    if (release?.mode === "SCHEDULED" && release.releaseAt && release.releaseAt > new Date()) return `Available ${release.releaseAt.toLocaleDateString()}.`;
    if (release?.mode === "TEACHER" && !release.released) return "Your teacher has not released this lesson yet.";
    if (release?.mode === "SEQUENTIAL" && release.afterType === "LESSON" && release.afterId && !completedRequired.has(release.afterId)) return `Complete ${requiredTitles.get(release.afterId) ?? "the previous lesson"} first.`;
    const prerequisite = prerequisites.find((row) => row.resourceId === lessonId && !completedRequired.has(row.requiredId));
    if (prerequisite) return `Complete ${requiredTitles.get(prerequisite.requiredId) ?? "the required lesson"} first.`;
    return null;
  };

  return courses.map((course) => {
    const modules = course.modules.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      order: m.order,
      lessons: m.lessons.map((lesson) => lessonToRef({ ...lesson, lockedReason: lockReason(lesson.id) })),
    }));
    const allLessons = modules.flatMap((m) => m.lessons);
    const completedLessons = allLessons.filter((l) => l.progress === "COMPLETED").length;
    const startedLessons = allLessons.filter((l) => l.progress === "IN_PROGRESS").length;
    return {
      id: course.id,
      title: course.title,
      description: course.description,
      isDemo: course.curriculum?.isDemo ?? false,
      level: { id: course.level.id, code: course.level.code, name: course.level.name, status: course.level.status, order: course.level.order, displayName: course.level.displayName ?? course.level.name },
      modules,
      totalLessons: allLessons.length,
      completedLessons,
      startedLessons,
      percent: allLessons.length === 0 ? 0 : Math.round((completedLessons / allLessons.length) * 100),
    };
  });
}

/** Flat ordered lesson list of a course (published only). */
function flattenLessons(course: CourseOverview): (LessonRef & { moduleTitle: string })[] {
  return course.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleTitle: m.title })));
}

/** First incomplete lesson (in course order): "continue here". */
function findCurrentLesson(
  course: CourseOverview
): (LessonRef & { moduleTitle: string }) | null {
  const flat = flattenLessons(course);
  return flat.find((l) => l.progress !== "COMPLETED") ?? null;
}

function dayKeyUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Real learning streak: consecutive active days (from progress timestamps)
 * ending today or yesterday. Zero when there is no activity.
 */
function computeStreakDays(dates: Date[]): number {
  if (dates.length === 0) return 0;
  const days = new Set(dates.map(dayKeyUtc));
  const today = new Date();
  const cursor = new Date(today);
  // Streak survives if the student was active yesterday but not yet today.
  cursor.setUTCDate(cursor.getUTCDate() - 1);
  if (!days.has(dayKeyUtc(today)) && !days.has(dayKeyUtc(cursor))) return 0;

  const start = days.has(dayKeyUtc(today)) ? today : cursor;
  let streak = 0;
  const step = new Date(start);
  while (days.has(dayKeyUtc(step))) {
    streak += 1;
    step.setUTCDate(step.getUTCDate() - 1);
  }
  return streak;
}

/**
 * Everything the student dashboard / My Learning needs, in one query pass.
 * Real data only — no fabricated numbers.
 */
export async function getLearningSummary(
  studentId: string,
  groupId: string | null
): Promise<LearningSummary> {
  const courses = await getAssignedCourseOverviews(studentId, groupId);

  const totals = courses.reduce(
    (acc, c) => ({
      totalLessons: acc.totalLessons + c.totalLessons,
      completedLessons: acc.completedLessons + c.completedLessons,
      startedLessons: acc.startedLessons + c.startedLessons,
      percent: 0,
    }),
    { totalLessons: 0, completedLessons: 0, startedLessons: 0, percent: 0 }
  );
  totals.percent =
    totals.totalLessons === 0 ? 0 : Math.round((totals.completedLessons / totals.totalLessons) * 100);

  // Active course: the one with the most completions, ties → first by level.
  const activeCourse =
    courses.length === 0
      ? null
      : [...courses].sort((a, b) => b.completedLessons - a.completedLessons || a.level.order - b.level.order)[0];

  // Continue-learning card: current (first incomplete) + the lesson after it.
  let continueLearning: ContinueLearning | null = null;
  if (activeCourse) {
    const flat = flattenLessons(activeCourse);
    const idx = flat.findIndex((l) => l.progress !== "COMPLETED");
    if (idx >= 0) {
      const current = flat[idx];
      const nextRaw = flat[idx + 1] ?? null;
      continueLearning = {
        current: {
          id: current.id,
          title: current.title,
          description: current.description,
          durationMin: current.durationMin,
          order: current.order,
          progress: current.progress,
          courseTitle: activeCourse.title,
          moduleTitle: current.moduleTitle,
        },
        next: nextRaw
          ? {
              id: nextRaw.id,
              title: nextRaw.title,
              description: nextRaw.description,
              durationMin: nextRaw.durationMin,
              order: nextRaw.order,
              progress: nextRaw.progress,
              courseTitle: activeCourse.title,
            }
          : null,
      };
    }
  }

  // Recent lessons (real activity), newest first.
  const progressRows = await prisma.lessonProgress.findMany({
    where: { studentId, status: { not: "NOT_STARTED" } },
    orderBy: [{ lastAccessedAt: "desc" }, { updatedAt: "desc" }],
    take: 5,
    select: {
      lessonId: true,
      status: true,
      lastAccessedAt: true,
      completedAt: true,
      lesson: {
        select: { title: true, module: { select: { title: true, course: { select: { title: true } } } } },
      },
    },
  });
  const recent: RecentLesson[] = progressRows.map((r) => ({
    lessonId: r.lessonId,
    lessonTitle: r.lesson.title,
    moduleTitle: r.lesson.module.title,
    courseTitle: r.lesson.module.course.title,
    progress: r.status as ProgressStatus,
    lastAccessedAt: r.lastAccessedAt,
    completedAt: r.completedAt,
  }));

  // Streak from every activity timestamp the student actually has.
  const activity = await prisma.lessonProgress.findMany({
    where: { studentId },
    select: { lastAccessedAt: true, completedAt: true, startedAt: true },
  });
  const activityDates = activity.flatMap((r) =>
    [r.lastAccessedAt, r.completedAt, r.startedAt].filter((d): d is Date => d !== null)
  );

  return {
    courses,
    activeCourse,
    continueLearning,
    recent,
    totals,
    streakDays: computeStreakDays(activityDates),
  };
}

// ---------------------------------------------------------------------------
// Lesson view (single lesson with full context)
// ---------------------------------------------------------------------------

export type LessonAccessResult =
  | { ok: true; lesson: NonNullable<Awaited<ReturnType<typeof getLessonForStudent>>> }
  | { ok: false; reason: "not_found" | "not_assigned" | "not_published" };

/**
 * Authorization-aware lesson view.
 * - ADMIN: any lesson (supervision).
 * - STUDENT: only PUBLISHED lessons whose course is assigned to their group
 *   under an ACTIVE level.
 */
export async function getLessonForStudent(
  viewer: { id: string; role: string; groupId: string | null },
  lessonId: string
): Promise<LessonView | null> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      title: true,
      description: true,
      objectives: true,
      durationMin: true,
      order: true,
      status: true,
      module: {
        select: {
          id: true,
          title: true,
          order: true,
          status: true,
          course: {
            select: {
              id: true,
              title: true,
              status: true,
              level: { select: { id: true, code: true, name: true, displayName: true, status: true, order: true } },
              assignments: { select: { groupId: true } },
            },
          },
        },
      },
      blocks: { where: { hidden: false, type: { not: "TEACHER_NOTE" } }, orderBy: { order: "asc" }, select: { type: true, data: true } },
      vocabulary: { orderBy: { order: "asc" }, select: vocabularySelect },
      grammar: { orderBy: { order: "asc" }, select: grammarSelect },
      progress: { where: { studentId: viewer.id }, select: { status: true, completedAt: true, timeSpentSec: true } },
    },
  });

  if (!lesson) return null;
  if (viewer.role === "STUDENT") {
    const { studentContentGate } = await import("@/lib/content/access");
    const gate = await studentContentGate(viewer.id, lessonId);
    if (!gate.ok) return null;
    if (!await studentCanAccessCourse(viewer.id, lesson.module.course.id)) return null;
  }

  // Publishing rules for students (admins may preview anything).
  if (viewer.role !== "ADMIN") {
    if (lesson.status !== "PUBLISHED" || lesson.module.status !== "PUBLISHED") return null;
    if (lesson.module.course.status !== "PUBLISHED" || lesson.module.course.level.status !== "ACTIVE") return null;
    if (!await studentCanAccessCourse(viewer.id, lesson.module.course.id)) return null;
  } else if (lesson.status !== "PUBLISHED" || lesson.module.course.status !== "PUBLISHED") {
    return null; // even admins only open published content from student routes
  }

  // Position + prev/next over the course's published lesson sequence.
  const siblings = await prisma.module.findMany({
    where: { courseId: lesson.module.course.id, status: "PUBLISHED" },
    orderBy: { order: "asc" },
    select: {
      id: true,
      title: true,
      order: true,
      lessons: { where: { status: "PUBLISHED" }, orderBy: { order: "asc" }, select: { id: true, title: true } },
    },
  });

  const publishedModules = siblings;
  const flat = publishedModules.flatMap((m, mi) =>
    m.lessons.map((l, li) => ({ ...l, moduleOrder: mi, lessonIndexInModule: li }))
  );
  const flatIndex = flat.findIndex((l) => l.id === lesson.id);
  if (flatIndex === -1) return null;

  const moduleIndex = flat[flatIndex].moduleOrder;
  const position = {
    moduleIndex: moduleIndex + 1,
    moduleCount: publishedModules.length,
    lessonIndexInModule: flat[flatIndex].lessonIndexInModule + 1,
    lessonCountInModule: publishedModules[moduleIndex].lessons.length,
  };

  const prev = flatIndex > 0 ? flat[flatIndex - 1] : null;
  const next = flatIndex < flat.length - 1 ? flat[flatIndex + 1] : null;

  // Parse blocks; invalid blocks are dropped (logged server-side).
  const parsed: { type: string; data: unknown }[] = [];
  for (const b of lesson.blocks) {
    const result = parseBlock(b.type, b.data);
    if (result.kind === "ok") parsed.push({ type: result.type, data: result.data });
    else logSafeError("learning.invalid-content-block", new Error(result.error));
  }

  const progressRow = lesson.progress[0];

  return {
    id: lesson.id,
    title: lesson.title,
    description: lesson.description,
    objectives: safeParseStringArray(lesson.objectives),
    durationMin: lesson.durationMin,
    course: { id: lesson.module.course.id, title: lesson.module.course.title },
    module: { id: lesson.module.id, title: lesson.module.title },
    level: {
      ...lesson.module.course.level,
      displayName: lesson.module.course.level.displayName ?? lesson.module.course.level.name,
    },
    position,
    blocks: parsed.filter((b) => b.type !== "QUESTION"),
    practice: parsed.filter((b) => b.type === "QUESTION"),
    vocabulary: lesson.vocabulary,
    grammar: lesson.grammar.map((g) => ({
      id: g.id,
      title: g.title,
      explanation: g.explanation,
      patterns: safeParseStringArray(g.patterns),
      examples: safeParseStringArray(g.examples),
    })),
    prev: prev ? { id: prev.id, title: prev.title } : null,
    next: next ? { id: next.id, title: next.title } : null,
    progress: {
      status: (progressRow?.status ?? "NOT_STARTED") as ProgressStatus,
      completedAt: progressRow?.completedAt ?? null,
      timeSpentSec: progressRow?.timeSpentSec ?? null,
    },
  };
}

const vocabularySelect = {
  id: true,
  word: true,
  translation: true,
  pronunciation: true,
  phonetic: true,
  exampleSentence: true,
  audioUrl: true,
} as const;

const grammarSelect = {
  id: true,
  title: true,
  explanation: true,
  patterns: true,
  examples: true,
} as const;

function safeParseStringArray(json: string | null): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Progress mutations (server-side, self-scoped)
// ---------------------------------------------------------------------------

/**
 * Verify that a student may record progress on this lesson (published +
 * assigned to their group). Returns false when not allowed.
 */
export async function canRecordProgress(
  viewer: { id: string; role: string; groupId: string | null },
  lessonId: string
): Promise<boolean> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      status: true,
      module: {
        select: {
          status: true,
          course: {
            select: {
              id: true,
              status: true,
              level: { select: { status: true } },
              assignments: { select: { groupId: true } },
            },
          },
        },
      },
    },
  });
  if (!lesson) return false;
  if (viewer.role === "STUDENT") {
    const { studentContentGate } = await import("@/lib/content/access");
    const gate = await studentContentGate(viewer.id, lessonId);
    if (!gate.ok) return false;
    if (!await studentCanAccessCourse(viewer.id, lesson.module.course.id)) return false;
  }
  if (viewer.role === "ADMIN") {
    return (
      lesson.status === "PUBLISHED" &&
      lesson.module.status === "PUBLISHED" &&
      lesson.module.course.status === "PUBLISHED"
    );
  }
  if (viewer.role !== "STUDENT") return false;
  return (
    lesson.status === "PUBLISHED" &&
    lesson.module.status === "PUBLISHED" &&
    lesson.module.course.status === "PUBLISHED" &&
    lesson.module.course.level.status === "ACTIVE" &&
    await studentCanAccessCourse(viewer.id, lesson.module.course.id)
  );
}

/** Mark a lesson accessed: upsert, refresh lastAccessedAt, set IN_PROGRESS. */
export async function recordLessonAccess(studentId: string, lessonId: string): Promise<void> {
  const now = new Date();
  const existing = await prisma.lessonProgress.findUnique({
    where: { studentId_lessonId: { studentId, lessonId } },
    select: { id: true, status: true, startedAt: true },
  });

  if (!existing) {
    await prisma.lessonProgress.create({
      data: { studentId, lessonId, status: "IN_PROGRESS", startedAt: now, lastAccessedAt: now },
    });
    await prisma.contentMetric.create({ data: { resourceType: "LESSON", resourceId: lessonId, studentId, eventType: "VIEW" } }).catch(() => undefined);
    const { noteAdaptive, noteLesson } = await import("@/lib/adaptive/hooks");
    noteAdaptive(() => noteLesson(studentId, lessonId, false));
    return;
  }

  // Never downgrade a completed lesson — refresh activity only.
  await prisma.lessonProgress.update({
    where: { id: existing.id },
    data: {
      lastAccessedAt: now,
      ...(existing.status === "COMPLETED" ? {} : { status: "IN_PROGRESS" }),
      startedAt: existing.startedAt ?? now,
    },
  });
}

/**
 * Mark a lesson completed (idempotent). Keeps the first completedAt;
 * stores best-effort time spent when provided. Returns the row.
 */
export async function completeLesson(
  studentId: string,
  lessonId: string,
  timeSpentSec?: number
): Promise<{ status: string; completedAt: Date | null }> {
  const now = new Date();
  const clampTime = (v: number) => Math.max(0, Math.min(2 * 60 * 60, Math.round(v)));

  const row = await prisma.lessonProgress.upsert({
    where: { studentId_lessonId: { studentId, lessonId } },
    create: {
      studentId,
      lessonId,
      status: "COMPLETED",
      startedAt: now,
      completedAt: now,
      lastAccessedAt: now,
      timeSpentSec: typeof timeSpentSec === "number" ? clampTime(timeSpentSec) : null,
    },
    update: {
      status: "COMPLETED",
      lastAccessedAt: now,
      completedAt: now,
      ...(typeof timeSpentSec === "number" ? { timeSpentSec: clampTime(timeSpentSec) } : {}),
    },
    select: { status: true, completedAt: true },
  });
  const { noteAdaptive, noteLesson } = await import("@/lib/adaptive/hooks");
  noteAdaptive(() => noteLesson(studentId, lessonId, true));
  return row;
}
