/**
 * StudyPlanGenerator and RecommendationEngine.
 * Reads cached states. Does not replay full history on each call.
 */
import { prisma } from "@/lib/prisma";
import { CORE_CODES, hrefForSkill } from "./skills";
import { resolveAdaptiveSettings, clampMinutes } from "./settings";

export type PlanItem = {
  recommendationId: string;
  title: string;
  reason: string;
  href: string;
  durationMin: number;
  source: string;
  skillCode: string | null;
  carriedOver: boolean;
};

type Draft = {
  title: string;
  reason: string;
  href: string;
  skillCode: string | null;
  source: string;
  priority: number;
  durationMin: number;
  evidence: string;
};

export function planDate(now = new Date()) {
  const zone = process.env.ORG_TIMEZONE || "UTC";
  return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function weekStart(date: string, startsOn: string) {
  const day = new Date(`${date}T00:00:00Z`);
  const target = startsOn === "MON" ? 1 : startsOn === "SUN" ? 0 : 6;
  const diff = (day.getUTCDay() - target + 7) % 7;
  day.setUTCDate(day.getUTCDate() - diff);
  return day.toISOString().slice(0, 10);
}

export async function ensureStudentPlan(studentId: string, force = false) {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, role: true, groupId: true, englishLevel: true, group: { select: { type: true, name: true } } },
  });
  if (!student || student.role !== "STUDENT") return null;
  const settings = await resolveAdaptiveSettings(student.groupId);
  if (!settings.enabled) return { disabled: true as const };
  const today = planDate();
  const pref = await prisma.studentLearningPreference.findUnique({ where: { studentId } });
  const stale = !pref?.lastSyncedAt || Date.now() - pref.lastSyncedAt.getTime() > 6 * 60 * 60 * 1000;
  if (force || stale || !(await prisma.dailyLearningPlan.findUnique({ where: { studentId_planDate: { studentId, planDate: today } } }))) {
    await syncRecommendations(student, settings);
  }
  const [daily, weekly, skills, goals] = await Promise.all([
    prisma.dailyLearningPlan.findUnique({ where: { studentId_planDate: { studentId, planDate: today } } }),
    prisma.weeklyLearningPlan.findUnique({ where: { studentId_weekStart: { studentId, weekStart: weekStart(today, settings.weekStartsOn) } } }),
    prisma.studentSkillState.findMany({ where: { studentId, skillCode: { in: [...CORE_CODES] } } }),
    prisma.learningGoal.findMany({ where: { active: true, OR: [{ studentId }, { groupId: student.groupId ?? "__none__" }] }, take: 4 }),
  ]);
  const since = new Date(Date.now() - 7 * 86400000);
  const practiceDays = await prisma.learningEvent.findMany({
    where: { studentId, excludedAt: null, observedAt: { gte: since } },
    select: { observedAt: true },
  });
  const days = new Set(practiceDays.map((row) => planDate(row.observedAt)));
  return {
    disabled: false as const,
    date: today,
    minutes: daily?.minutes ?? pref?.dailyMinutes ?? settings.dailyMinutes,
    items: daily ? (JSON.parse(daily.items) as PlanItem[]) : [],
    note: daily?.note ?? null,
    weekly: weekly ? (JSON.parse(weekly.days) as { day: string; focus: string; note: string }[]) : [],
    skills: CORE_CODES.map((code) => {
      const row = skills.find((item) => item.skillCode === code);
      return {
        code,
        title: code[0].toUpperCase() + code.slice(1),
        label: row?.estimateLabel ?? "Not started",
        state: row?.state ?? "NEW",
        observedCorrect: row?.correctCount ?? 0,
        observedIncorrect: row?.incorrectCount ?? 0,
        difficultyBand: row?.difficultyBand ?? 1,
      };
    }),
    goals: goals.map((goal) => ({ id: goal.id, text: goal.text, source: goal.source, skillCode: goal.skillCode })),
    practiceDays: days.size,
    level: student.englishLevel,
  };
}

async function syncRecommendations(
  student: { id: string; groupId: string | null; englishLevel: string | null; group: { type: string; name: string } | null },
  settings: Awaited<ReturnType<typeof resolveAdaptiveSettings>>
) {
  const drafts: Draft[] = [];
  const [states, due, overrides, goals, lesson, recent, yesterday] = await Promise.all([
    prisma.studentSkillState.findMany({ where: { studentId: student.id } }),
    prisma.studentKnowledgeState.findMany({
      where: { studentId: student.id, nextReviewAt: { lte: new Date() }, state: { not: "NEW" } },
      include: { item: { select: { label: true, skillCode: true } } },
      orderBy: { nextReviewAt: "asc" },
      take: 5,
    }),
    settings.teacherOverride
      ? prisma.teacherLearningOverride.findMany({
where: { active: true, OR: [{ studentId: student.id }, { groupId: student.groupId ?? "__none__" }], AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }] },
        })
      : Promise.resolve([]),
    prisma.learningGoal.findMany({ where: { active: true, OR: [{ studentId: student.id }, { groupId: student.groupId ?? "__none__" }] }, take: 3 }),
    nextLesson(student.id, student.groupId),
    prisma.learningEvent.findMany({
      where: { studentId: student.id, excludedAt: null },
      orderBy: { observedAt: "desc" },
      take: 30,
      select: { skillCode: true, payload: true, eventType: true },
    }),
    previousCarry(student.id),
  ]);

  for (const override of overrides) {
    if (!override.requiredLabel) continue;
    drafts.push({
      title: `Review ${override.requiredLabel}`,
      reason: `Your teacher asked for this review${override.note ? `: ${override.note}` : "."}`,
      href: hrefForSkill(override.prioritySkill || "grammar"),
      skillCode: override.prioritySkill,
      source: "TEACHER",
      priority: 100,
      durationMin: 5,
      evidence: "Teacher instruction",
    });
  }
  if (yesterday) {
    drafts.push({
      title: yesterday.title,
      reason: "Your previous activity is still available. Let's continue from here.",
      href: yesterday.href,
      skillCode: yesterday.skillCode,
      source: "REVIEW",
      priority: 90,
      durationMin: Math.min(5, yesterday.durationMin),
      evidence: "Unfinished item from the previous plan",
    });
  }
  for (const item of due.slice(0, 2)) {
    drafts.push({
      title: `Review ${item.item.label}`,
      reason: `${item.item.label} is due for review. ${item.correctAttempts} correct and ${item.incorrectAttempts} incorrect answers are still on record. This is not a grade.`,
      href: "/student/review",
      skillCode: item.item.skillCode,
      source: "REVIEW",
      priority: 80,
      durationMin: 2,
      evidence: `Observed ${item.correctAttempts} correct, ${item.incorrectAttempts} incorrect`,
    });
  }
  const beMisses = recent.filter((row) => /am\/is\/are/.test(row.payload || "")).length;
  if (beMisses >= 2) {
    drafts.push({
      title: "Practice the verb be",
      reason: `Practice recommended because ${beMisses} recent speaking or practice records were not the full phrase for am / is / are.`,
      href: "/student/tutor",
      skillCode: "grammar.be",
      source: "SYSTEM",
      priority: 75,
      durationMin: 5,
      evidence: `${beMisses} recorded am/is/are misses`,
    });
  }
  for (const state of states.filter((row) => row.state === "NEEDS_REVIEW").slice(0, 2)) {
    drafts.push({
      title: `Practice ${titleFor(state.skillCode)}`,
      reason: `Review recommended because ${state.incorrectCount} recorded misses and ${state.correctCount} correct answers are stored for ${titleFor(state.skillCode)}. This is a learning progress estimate, not an exact ability score.`,
      href: hrefForSkill(state.skillCode),
      skillCode: state.skillCode,
      source: "SYSTEM",
      priority: 70,
      durationMin: 5,
      evidence: `Observed ${state.correctCount} correct, ${state.incorrectCount} incorrect`,
    });
  }
  for (const override of overrides) {
    if (!override.prioritySkill) continue;
    drafts.push({
      title: `Teacher priority: ${titleFor(override.prioritySkill)}`,
      reason: `Your teacher set ${titleFor(override.prioritySkill)} as the priority skill.`,
      href: hrefForSkill(override.prioritySkill),
      skillCode: override.prioritySkill,
      source: "TEACHER",
      priority: 65,
      durationMin: 5,
      evidence: "Teacher priority",
    });
  }
  if (lesson) {
    drafts.push({
      title: `Continue ${lesson.title}`,
      reason: "The current lesson is not completed yet.",
      href: `/student/learn/${lesson.id}`,
      skillCode: null,
      source: "COURSE",
      priority: 60,
      durationMin: 5,
      evidence: "Lesson progress is not completed",
    });
  }
  const weak = states.filter((row) => row.incorrectCount >= 3 && row.incorrectCount > row.correctCount);
  if (goals[0] && weak.length === 0) {
    drafts.push({
      title: goals[0].text,
      reason: "This follows your learning goal. It does not replace recorded practice.",
      href: hrefForSkill(goals[0].skillCode || "speaking"),
      skillCode: goals[0].skillCode,
      source: "STUDENT_GOAL",
      priority: 40,
      durationMin: 5,
      evidence: "Student or group goal",
    });
  }
  const practiced = new Set(recent.map((row) => (row.skillCode || "").split(".")[0]).filter(Boolean));
  const missing = CORE_CODES.find((code) => !practiced.has(code));
  if (missing && recent.length > 0) {
    drafts.push({
      title: `Short ${titleFor(missing)} practice`,
      reason: `${titleFor(missing)} has no practice in the recent records. A short activity keeps the plan balanced.`,
      href: hrefForSkill(missing),
      skillCode: missing,
      source: "SYSTEM",
      priority: 35,
      durationMin: 3,
      evidence: "No recent events for this skill",
    });
  }
  if (drafts.length === 0) {
    drafts.push({
      title: lesson ? `Start ${lesson.title}` : "Open your lesson",
      reason: "No practice is recorded yet. Start with the current lesson.",
      href: lesson ? `/student/learn/${lesson.id}` : "/student/learning",
      skillCode: null,
      source: "COURSE",
      priority: 10,
      durationMin: 5,
      evidence: "No learning events",
    });
  }

  const unique = dedupe(drafts).sort((a, b) => b.priority - a.priority);
  const kept = unique.filter((item) => item.source === "TEACHER").concat(unique.filter((item) => item.source !== "TEACHER")).slice(0, settings.maxRecommendations + 1);
  await prisma.learningRecommendation.updateMany({
    where: { studentId: student.id, status: "OPEN", source: { not: "TEACHER" } },
    data: { status: "EXPIRED" },
  });
  const saved = [];
  for (const draft of kept) {
    const row = await prisma.learningRecommendation.create({
      data: {
        studentId: student.id,
        title: draft.title,
        reason: draft.reason,
        skillCode: draft.skillCode,
        href: draft.href,
        priority: draft.priority,
        durationMin: draft.durationMin,
        source: draft.source,
        evidence: draft.evidence,
        expiresAt: new Date(Date.now() + 2 * 86400000),
      },
    });
    saved.push(row);
  }
  const minutes = clampMinutes(student.englishLevel === "PRE_A1" || student.englishLevel === "A1" || !student.englishLevel ? 10 : settings.dailyMinutes, 10);
  const pref = await prisma.studentLearningPreference.findUnique({ where: { studentId: student.id } });
  const budget = pref?.dailyMinutes ?? minutes;
  const items = fit(saved, budget);
  const classNote = await classNoteFor(student.groupId, student.group);
  const today = planDate();
  await prisma.dailyLearningPlan.upsert({
    where: { studentId_planDate: { studentId: student.id, planDate: today } },
    create: { studentId: student.id, planDate: today, minutes: budget, items: JSON.stringify(items), note: classNote },
    update: { minutes: budget, items: JSON.stringify(items), note: classNote, generatedAt: new Date() },
  });
  const start = weekStart(today, settings.weekStartsOn);
  await prisma.weeklyLearningPlan.upsert({
    where: { studentId_weekStart: { studentId: student.id, weekStart: start } },
    create: { studentId: student.id, weekStart: start, days: JSON.stringify(weekDays(states, classNote)) },
    update: { days: JSON.stringify(weekDays(states, classNote)), generatedAt: new Date() },
  });
  await prisma.studentLearningPreference.upsert({
    where: { studentId: student.id },
    create: { studentId: student.id, dailyMinutes: budget, lastSyncedAt: new Date() },
    update: { lastSyncedAt: new Date() },
  });
}

function fit(rows: { id: string; title: string; reason: string; href: string; durationMin: number; source: string; skillCode: string | null; priority: number }[], budget: number): PlanItem[] {
  const items: PlanItem[] = [];
  let used = 0;
  const ordered = [...rows].sort((a, b) => b.priority - a.priority);
  for (const row of ordered) {
    if (items.length >= 5) break;
    if (used >= budget && items.length > 0 && row.source !== "TEACHER") continue;
    const duration = Math.min(row.durationMin, Math.max(2, budget - used || row.durationMin));
    items.push({
      recommendationId: row.id,
      title: row.title,
      reason: row.reason,
      href: row.href,
      durationMin: duration,
      source: row.source,
      skillCode: row.skillCode,
      carriedOver: row.reason.includes("still available"),
    });
    used += duration;
  }
  return items;
}

function weekDays(states: { skillCode: string; state: string }[], classNote: string | null) {
  const focus = ["Vocabulary", "Grammar", "Listening", "Vocabulary review", "Speaking", "Grammar review", "Free practice"];
  const weak = states.find((row) => row.state === "NEEDS_REVIEW");
  const names = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
  return names.map((day, index) => ({
    day,
    focus: index === 1 && weak ? titleFor(weak.skillCode) : focus[index],
    note: index === 0 && classNote ? classNote : "A short session is enough. A missed day is not a penalty.",
  }));
}

async function previousCarry(studentId: string) {
  const yesterday = new Date(Date.now() - 86400000);
  const row = await prisma.dailyLearningPlan.findUnique({ where: { studentId_planDate: { studentId, planDate: planDate(yesterday) } } });
  if (!row) return null;
  const items = JSON.parse(row.items) as PlanItem[];
  const first = items[0];
  if (!first) return null;
  const done = await prisma.learningRecommendation.findFirst({ where: { id: first.recommendationId, status: "DONE" } });
  return done ? null : first;
}

async function nextLesson(studentId: string, groupId: string | null) {
  if (!groupId) return null;
  const course = await prisma.course.findFirst({
    where: { status: "PUBLISHED", assignments: { some: { groupId } } },
    select: { modules: { where: { status: "PUBLISHED" }, orderBy: { order: "asc" }, select: { lessons: { where: { status: "PUBLISHED" }, orderBy: { order: "asc" }, select: { id: true, title: true } } } } },
  });
  const lessons = course?.modules.flatMap((mod) => mod.lessons) ?? [];
  if (!lessons.length) return null;
  const done = await prisma.lessonProgress.findMany({ where: { studentId, status: "COMPLETED", lessonId: { in: lessons.map((lesson) => lesson.id) } }, select: { lessonId: true } });
  const finished = new Set(done.map((row) => row.lessonId));
  return lessons.find((lesson) => !finished.has(lesson.id)) ?? null;
}

async function classNoteFor(groupId: string | null, group: { type: string; name: string } | null) {
  const shift = group?.type === "FIREFIGHTER_SHIFT"
    ? `${group.name} is a shift group. This plan uses your study minutes. It does not change the work schedule.`
    : group?.type === "DAY_WORKER"
      ? `${group.name} keeps its own class times. Work schedules are not changed.`
      : null;
  if (!groupId) return shift;
  const soon = await prisma.classSession.findFirst({
    where: { groupId, status: { not: "CANCELLED" }, scheduledStart: { gte: new Date(Date.now() - 3 * 3600000), lte: new Date(Date.now() + 18 * 3600000) } },
    select: { title: true, scheduledStart: true },
  });
  const classLine = soon ? `A class is scheduled (${soon.title}). Practice stays short around that class.` : null;
  return [shift, classLine].filter(Boolean).join(" ") || null;
}

function titleFor(code: string) {
  const known: Record<string, string> = {
    vocabulary: "Vocabulary",
    grammar: "Grammar",
    reading: "Reading",
    writing: "Writing",
    listening: "Listening",
    speaking: "Speaking",
    "grammar.be": "Be verb",
    "grammar.present": "Present Simple",
  };
  return known[code] || code.replace(".", " ");
}

function dedupe(drafts: Draft[]) {
  const seen = new Set<string>();
  return drafts.filter((draft) => {
    const key = draft.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function completeRecommendation(studentId: string, recommendationId: string) {
  const row = await prisma.learningRecommendation.findFirst({ where: { id: recommendationId, studentId } });
  if (!row) return null;
  await prisma.learningRecommendation.update({ where: { id: row.id }, data: { status: "DONE" } });
  return row;
}
