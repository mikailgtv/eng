import { logSafeError } from "@/lib/logging";
/**
 * LearningEventService. Append-only evidence from recorded activity.
 * A repeated source id is ignored. Students cannot write these rows directly.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { maybeCreateMascotReaction } from "@/lib/mascot/service";
import { nextDifficultyBand, nextItemState, skillLabel, type ItemState } from "./estimate";
import { dueFrom, nextInterval } from "./review";
import { CORE_SKILLS, parentSkill } from "./skills";
import { resolveAdaptiveSettings } from "./settings";

let catalogReady = false;

export async function ensureSkillCatalog() {
  if (catalogReady) return;
  for (const skill of CORE_SKILLS) {
    await prisma.skill.upsert({
      where: { code: skill.code },
      create: skill,
      update: { title: skill.title, parentCode: skill.parentCode, order: skill.order, active: true },
    });
  }
  catalogReady = true;
}

export async function recordLearningEvent(input: {
  studentId: string;
  eventType: string;
  sourceType: string;
  sourceId: string;
  skillCode?: string | null;
  correct?: boolean | null;
  knowledge?: { vocabularyId?: string; grammarId?: string; label: string; lessonId?: string | null; kind: "VOCABULARY" | "GRAMMAR" };
  payload?: Record<string, unknown>;
}) {
  const student = await prisma.user.findUnique({ where: { id: input.studentId }, select: { groupId: true, role: true } });
  if (!student || student.role !== "STUDENT") return { created: false };
  const limits = await resolveAdaptiveSettings(student.groupId);
  if (!limits.enabled) return { created: false };
  await ensureSkillCatalog();

  let eventId: string;
  try {
    const event = await prisma.learningEvent.create({
      data: {
        studentId: input.studentId,
        eventType: input.eventType,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        skillCode: input.skillCode ?? null,
        payload: input.payload ? JSON.stringify(input.payload) : null,
      },
      select: { id: true },
    });
    eventId = event.id;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return { created: false };
    throw err;
  }
  try { await maybeCreateMascotReaction(input.studentId, eventId, input.eventType); }
  catch (err) { logSafeError("mascot.reaction-write-failed", err); }

  const itemId = input.knowledge ? await upsertKnowledgeItem(input.skillCode, input.knowledge) : null;
  if (itemId) {
    await prisma.learningEvent.updateMany({
      where: { studentId: input.studentId, eventType: input.eventType, sourceType: input.sourceType, sourceId: input.sourceId },
      data: { knowledgeItemId: itemId },
    });
    await updateKnowledgeState(input.studentId, itemId, input.correct ?? null, limits.intervals);
  }
  if (input.skillCode) await updateSkillState(input.studentId, input.skillCode, input.correct ?? null);
  try {
    const { applyEngagement } = await import("@/lib/gamification/award");
    await applyEngagement({
      studentId: input.studentId,
      eventType: input.eventType,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      payload: input.payload ?? null,
    });
  } catch (err) {
    logSafeError("gamification.event-failed", err);
  }
  return { created: true };
}

async function upsertKnowledgeItem(skillCode: string | null | undefined, knowledge: NonNullable<Parameters<typeof recordLearningEvent>[0]["knowledge"]>) {
  const code = skillCode || (knowledge.kind === "GRAMMAR" ? "grammar" : "vocabulary");
  if (knowledge.vocabularyId) {
    const row = await prisma.knowledgeItem.upsert({
      where: { vocabularyId: knowledge.vocabularyId },
      create: { skillCode: code, kind: "VOCABULARY", label: knowledge.label, vocabularyId: knowledge.vocabularyId, lessonId: knowledge.lessonId ?? null },
      update: { label: knowledge.label, skillCode: code },
    });
    return row.id;
  }
  if (knowledge.grammarId) {
    const row = await prisma.knowledgeItem.upsert({
      where: { grammarId: knowledge.grammarId },
      create: { skillCode: code, kind: "GRAMMAR", label: knowledge.label, grammarId: knowledge.grammarId, lessonId: knowledge.lessonId ?? null },
      update: { label: knowledge.label, skillCode: code },
    });
    return row.id;
  }
  return null;
}

async function updateKnowledgeState(studentId: string, itemId: string, correct: boolean | null, intervals: number[]) {
  const now = new Date();
  const existing = await prisma.studentKnowledgeState.findUnique({ where: { studentId_knowledgeItemId: { studentId, knowledgeItemId: itemId } } });
  const schedule = await prisma.reviewSchedule.findUnique({ where: { studentId_knowledgeItemId: { studentId, knowledgeItemId: itemId } } });
  const correctAttempts = (existing?.correctAttempts ?? 0) + (correct === true ? 1 : 0);
  const incorrectAttempts = (existing?.incorrectAttempts ?? 0) + (correct === false ? 1 : 0);
  const overdue = Boolean(schedule && schedule.dueAt < now && schedule.status === "SCHEDULED");
  const state = nextItemState({
    previous: (existing?.state as ItemState) || "NEW",
    correct,
    correctAttempts,
    incorrectAttempts,
    overdue,
  });
  const interval = nextInterval(intervals, schedule ? schedule.intervalIndex : -1, correct !== false);
  const dueAt = dueFrom(now, correct === false ? intervals[0] : interval.days);
  await prisma.studentKnowledgeState.upsert({
    where: { studentId_knowledgeItemId: { studentId, knowledgeItemId: itemId } },
    create: {
      studentId,
      knowledgeItemId: itemId,
      state,
      attempts: 1,
      correctAttempts,
      incorrectAttempts,
      reviewCount: existing ? 1 : 0,
      firstSeenAt: now,
      lastPracticedAt: now,
      lastCorrectAt: correct === true ? now : null,
      lastIncorrectAt: correct === false ? now : null,
      nextReviewAt: dueAt,
    },
    update: {
      state,
      attempts: { increment: 1 },
      correctAttempts,
      incorrectAttempts,
      reviewCount: { increment: 1 },
      lastPracticedAt: now,
      lastCorrectAt: correct === true ? now : existing?.lastCorrectAt,
      lastIncorrectAt: correct === false ? now : existing?.lastIncorrectAt,
      nextReviewAt: dueAt,
    },
  });
  await prisma.reviewSchedule.upsert({
    where: { studentId_knowledgeItemId: { studentId, knowledgeItemId: itemId } },
    create: { studentId, knowledgeItemId: itemId, dueAt, intervalDays: interval.days, intervalIndex: interval.index, status: "SCHEDULED" },
    update: { dueAt, intervalDays: interval.days, intervalIndex: interval.index, status: "SCHEDULED" },
  });
}

async function updateSkillState(studentId: string, skillCode: string, correct: boolean | null) {
  const codes = [skillCode, parentSkill(skillCode)].filter((code, index, list) => list.indexOf(code) === index);
  for (const code of codes) {
    const existing = await prisma.studentSkillState.findUnique({ where: { studentId_skillCode: { studentId, skillCode: code } } });
    const recent = await prisma.learningEvent.findMany({
      where: { studentId, skillCode: code, excludedAt: null, eventType: { in: ["QUESTION_CORRECT", "QUESTION_INCORRECT", "VOCABULARY_CORRECT", "VOCABULARY_INCORRECT", "SPEAKING_COMPLETED", "LISTENING_COMPLETED"] } },
      orderBy: { observedAt: "desc" },
      take: 3,
      select: { eventType: true, payload: true },
    });
    const recentCorrect = recent.map((row) => row.eventType.endsWith("CORRECT") || payloadUnderstood(row.payload)).reverse();
    const correctCount = (existing?.correctCount ?? 0) + (correct === true ? 1 : 0);
    const incorrectCount = (existing?.incorrectCount ?? 0) + (correct === false ? 1 : 0);
    const evidenceCount = (existing?.evidenceCount ?? 0) + 1;
    const state = nextItemState({
      previous: (existing?.state as ItemState) || "NEW",
      correct,
      correctAttempts: correctCount,
      incorrectAttempts: incorrectCount,
      overdue: false,
    });
    await prisma.studentSkillState.upsert({
      where: { studentId_skillCode: { studentId, skillCode: code } },
      create: {
        studentId,
        skillCode: code,
        state,
        estimateLabel: skillLabel({ evidenceCount, correctCount, incorrectCount, state, daysSince: 0 }),
        evidenceCount,
        correctCount,
        incorrectCount,
        difficultyBand: 1,
        lastEventAt: new Date(),
      },
      update: {
        state,
        estimateLabel: skillLabel({ evidenceCount, correctCount, incorrectCount, state, daysSince: 0 }),
        evidenceCount,
        correctCount,
        incorrectCount,
        difficultyBand: nextDifficultyBand(existing?.difficultyBand ?? 1, recentCorrect),
        lastEventAt: new Date(),
      },
    });
  }
}

function payloadUnderstood(raw: string | null) {
  if (!raw) return false;
  try {
    return JSON.parse(raw).understood === true;
  } catch {
    return false;
  }
}

export async function recalculateStudent(studentId: string) {
  await prisma.studentSkillState.deleteMany({ where: { studentId } });
  await prisma.studentKnowledgeState.deleteMany({ where: { studentId } });
  await prisma.reviewSchedule.deleteMany({ where: { studentId } });
  const events = await prisma.learningEvent.findMany({
    where: { studentId, excludedAt: null },
    orderBy: { observedAt: "asc" },
  });
  for (const event of events) {
    const correct = event.eventType.endsWith("INCORRECT") ? false : event.eventType.endsWith("CORRECT") ? true : payloadUnderstood(event.payload) ? true : event.eventType === "SPEAKING_COMPLETED" || event.eventType === "LISTENING_COMPLETED" ? payloadUnderstood(event.payload) : null;
    if (event.knowledgeItemId) {
      const student = await prisma.user.findUnique({ where: { id: studentId }, select: { groupId: true } });
      const limits = await resolveAdaptiveSettings(student?.groupId ?? null);
      await updateKnowledgeState(studentId, event.knowledgeItemId, correct, limits.intervals);
    }
    if (event.skillCode && correct !== null) await updateSkillState(studentId, event.skillCode, correct);
    else if (event.skillCode) await updateSkillState(studentId, event.skillCode, correct);
  }
  return { events: events.length };
}
