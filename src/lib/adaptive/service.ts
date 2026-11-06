import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { assertGroupAccess, assignedGroupIds } from "@/lib/teaching/access";
import { ensureSkillCatalog, recalculateStudent } from "./events";
import { ensureStudentPlan, completeRecommendation } from "./plans";
import { teacherLearningBoard } from "./read";
import { setAdaptiveSetting } from "./settings";
import { CORE_CODES } from "./skills";

export async function studentPlan(studentId: string, force = false) {
  return ensureStudentPlan(studentId, force);
}

export async function markPlanItemDone(studentId: string, recommendationId: string) {
  const row = await completeRecommendation(studentId, recommendationId);
  if (!row) throw new ApiError(404, "Recommendation not found.");
  return { id: row.id, status: "DONE" };
}

export async function setStudentGoal(studentId: string, text: string, skillCode: string | null) {
  if (skillCode && !CORE_CODES.includes(skillCode as (typeof CORE_CODES)[number]) && !skillCode.startsWith("grammar.") && !skillCode.startsWith("vocabulary.")) {
    throw new ApiError(422, "Unknown skill.");
  }
  const row = await prisma.learningGoal.create({
    data: { studentId, text: text.trim(), skillCode, source: "STUDENT", authorId: studentId },
  });
  await prisma.learningEvent.create({
    data: { studentId, eventType: "STUDENT_GOAL_UPDATED", sourceType: "GOAL", sourceId: row.id, skillCode, payload: JSON.stringify({ text: text.trim() }) },
  }).catch(() => undefined);
  return { id: row.id };
}

export async function setDailyMinutes(studentId: string, minutes: number) {
  await prisma.studentLearningPreference.upsert({
    where: { studentId },
    create: { studentId, dailyMinutes: minutes },
    update: { dailyMinutes: minutes, lastSyncedAt: null },
  });
  return ensureStudentPlan(studentId, true);
}

export async function setConfidence(studentId: string, knowledgeItemId: string, level: string) {
  const state = await prisma.studentKnowledgeState.findFirst({ where: { studentId, knowledgeItemId } });
  if (!state) throw new ApiError(404, "That item is not in your practice record.");
  await prisma.studentKnowledgeState.update({ where: { id: state.id }, data: { confidenceLabel: level } });
  return { saved: true, note: "Confidence is your own note. It is not an ability score." };
}

export async function explainRecommendation(viewer: { id: string; role: string; groupId: string | null }, recommendationId: string) {
  const row = await prisma.learningRecommendation.findUnique({ where: { id: recommendationId } });
  if (!row) throw new ApiError(404, "Recommendation not found.");
  if (viewer.role === "STUDENT" && row.studentId !== viewer.id) throw new ApiError(404, "Recommendation not found.");
  if (viewer.role === "TEACHER") {
    const student = await prisma.user.findUnique({ where: { id: row.studentId }, select: { groupId: true } });
    if (!student?.groupId) throw new ApiError(404, "Recommendation not found.");
    await assertGroupAccess(viewer, student.groupId);
  }
  return {
    title: row.title,
    reason: row.reason,
    source: row.source,
    evidence: row.evidence,
    estimate: "Learning progress estimate. Not an exact ability score.",
    observed: row.evidence,
  };
}

export async function createOverride(teacher: { id: string; role: string; groupId: string | null }, input: {
  groupId?: string | null;
  studentId?: string | null;
  prioritySkill?: string | null;
  requiredLabel?: string | null;
  note?: string | null;
  reason?: string | null;
  durationDays?: number | null;
}) {
  if (!input.groupId && !input.studentId) throw new ApiError(422, "Choose a group or a student.");
  if (input.groupId) await assertGroupAccess(teacher, input.groupId);
  if (input.studentId) {
    const student = await prisma.user.findFirst({ where: { id: input.studentId, role: "STUDENT" }, select: { groupId: true } });
    if (!student?.groupId) throw new ApiError(404, "Student not found.");
    await assertGroupAccess(teacher, student.groupId);
  }
  const row = await prisma.teacherLearningOverride.create({
    data: {
      teacherId: teacher.id,
      groupId: input.groupId || null,
      studentId: input.studentId || null,
      prioritySkill: input.prioritySkill || null,
      requiredLabel: input.requiredLabel?.trim() || null,
      note: input.note?.trim() || null,
      reason: input.reason?.trim() || input.note?.trim() || null,
      durationDays: input.durationDays ?? null,
      expiresAt: input.durationDays ? new Date(Date.now() + input.durationDays * 86400000) : null,
    },
  });
  if (input.studentId) {
    await prisma.studentLearningPreference.updateMany({ where: { studentId: input.studentId }, data: { lastSyncedAt: null } });
  }
  if (input.groupId) {
    const members = await prisma.user.findMany({ where: { groupId: input.groupId, role: "STUDENT" }, select: { id: true } });
    if (members.length) {
      await prisma.studentLearningPreference.updateMany({ where: { studentId: { in: members.map((member) => member.id) } }, data: { lastSyncedAt: null } });
    }
  }
  await audit({ actorId: teacher.id, action: "LEARNING_OVERRIDE_CREATED", entityType: "ADAPTIVE", entityId: row.id, metadata: { groupId: input.groupId ?? null, studentId: input.studentId ?? null, prioritySkill: input.prioritySkill ?? null, durationDays: input.durationDays ?? null, reason: input.reason?.trim() || input.note?.trim() || null } });
  return { id: row.id };
}

export async function teacherBoard(viewer: { id: string; role: string }) {
  const ids = await assignedGroupIds(viewer);
  const students = await prisma.user.findMany({
    where: { role: "STUDENT", status: "ACTIVE", ...(ids === null ? {} : { groupId: { in: ids } }) },
    select: { id: true },
  });
  return teacherLearningBoard(students.map((student) => student.id));
}

export async function studentLearningDetail(viewer: { id: string; role: string; groupId: string | null }, studentId: string) {
  const student = await prisma.user.findFirst({ where: { id: studentId, role: "STUDENT" }, select: { id: true, firstName: true, lastName: true, groupId: true, englishLevel: true, organizationId: true, learningProfile: { select: { targetLevelCode: true, levelStatus: true, learningPace: true, dailyGoalMinutes: true, assignedCourseId: true, assignedBookId: true, assignedTeacherId: true } } } });
  if (!student?.groupId) throw new ApiError(404, "Student not found.");
  await assertGroupAccess(viewer, student.groupId);
  const plan = await ensureStudentPlan(student.id);
  const events = await prisma.learningEvent.findMany({
    where: { studentId, excludedAt: null },
    orderBy: { observedAt: "desc" },
    take: 8,
    select: { id: true, eventType: true, skillCode: true, observedAt: true, payload: true },
  });
  return { student, plan, events };
}

export async function excludeEvent(actor: { id: string; role: string; groupId: string | null }, eventId: string, reason: string) {
  const event = await prisma.learningEvent.findUnique({ where: { id: eventId } });
  if (!event) throw new ApiError(404, "Event not found.");
  const student = await prisma.user.findUnique({ where: { id: event.studentId }, select: { groupId: true } });
  if (actor.role !== "ADMIN") {
    if (!student?.groupId) throw new ApiError(404, "Event not found.");
    await assertGroupAccess(actor, student.groupId);
  }
  await prisma.learningEvent.update({ where: { id: event.id }, data: { excludedAt: new Date(), excludeReason: reason.trim(), excludedById: actor.id } });
  await audit({ actorId: actor.id, action: "LEARNING_EVENT_EXCLUDED", entityType: "ADAPTIVE", entityId: event.id, metadata: { reason: reason.trim() } });
  return { excluded: true };
}

export async function rebuildStudent(actor: { id: string; role: string; groupId: string | null }, studentId: string) {
  const student = await prisma.user.findFirst({ where: { id: studentId, role: "STUDENT" }, select: { groupId: true } });
  if (!student) throw new ApiError(404, "Student not found.");
  if (actor.role !== "ADMIN") {
    if (!student.groupId) throw new ApiError(404, "Student not found.");
    await assertGroupAccess(actor, student.groupId);
  }
  const result = await recalculateStudent(studentId);
  await prisma.studentLearningPreference.updateMany({ where: { studentId }, data: { lastSyncedAt: null } });
  await audit({ actorId: actor.id, action: "LEARNING_STATE_RECALCULATED", entityType: "ADAPTIVE", entityId: studentId, metadata: result });
  return result;
}

export async function saveAdaptiveSetting(actorId: string, key: string, value: string) {
  await setAdaptiveSetting("GLOBAL", key, value, actorId);
  await audit({ actorId, action: "ADAPTIVE_SETTING_CHANGED", entityType: "ADAPTIVE", entityId: "GLOBAL", metadata: { key, value } });
}

export async function applyRetention(actorId: string) {
  const row = await prisma.adaptiveSetting.findUnique({ where: { scopeKey_key: { scopeKey: "GLOBAL", key: "eventRetentionDays" } } });
  const days = Math.min(3650, Math.max(30, Number(row?.value ?? 365)));
  const cutoff = new Date(Date.now() - days * 86400000);
  const result = await prisma.learningEvent.updateMany({
    where: { observedAt: { lt: cutoff }, excludedAt: null },
    data: { excludedAt: new Date(), excludeReason: "Retention window", excludedById: actorId },
  });
  await audit({ actorId, action: "LEARNING_RETENTION_APPLIED", entityType: "ADAPTIVE", entityId: "GLOBAL", metadata: { days, excluded: result.count } });
  return { excluded: result.count, days };
}

export async function addSkill(actorId: string, input: { code: string; title: string; parentCode?: string | null }) {
  await ensureSkillCatalog();
  const code = input.code.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
  if (!code || code.length > 40) throw new ApiError(422, "Enter a short skill code.");
  const row = await prisma.skill.upsert({
    where: { code },
    create: { code, title: input.title.trim(), parentCode: input.parentCode || null },
    update: { title: input.title.trim(), parentCode: input.parentCode || null, active: true },
  });
  await audit({ actorId, action: "SKILL_ADDED", entityType: "ADAPTIVE", entityId: row.id, metadata: { code } });
  return { id: row.id, code: row.code };
}

export async function adaptiveUsage() {
  const since = new Date(Date.now() - 7 * 86400000);
  const [events, plans, openRecs] = await Promise.all([
    prisma.learningEvent.count({ where: { observedAt: { gte: since }, excludedAt: null } }),
    prisma.dailyLearningPlan.count({ where: { generatedAt: { gte: since } } }),
    prisma.learningRecommendation.count({ where: { status: "OPEN" } }),
  ]);
  return { events7d: events, plans7d: plans, openRecommendations: openRecs };
}
