import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { assertGroupAccess, assignedGroupIds } from "@/lib/teaching/access";
import { planDate, weekStart } from "@/lib/adaptive/plans";
import { resolveAdaptiveSettings } from "@/lib/adaptive/settings";
import { ensureMotivationCatalog, motivationSettings, reverseXp } from "./award";
import { EVENT_RULES, levelProgress, shiftDate, streakMessage } from "./rules";

export async function studentEngagement(studentId: string) {
  await ensureMotivationCatalog();
  const settings = await motivationSettings();
  if (!settings.enabled) return { disabled: true as const };
  await ensurePersonalChallenge(studentId);
  const today = planDate();
  const adaptive = await resolveAdaptiveSettings((await prisma.user.findUnique({ where: { id: studentId }, select: { groupId: true } }))?.groupId ?? null);
  const week = weekStart(today, adaptive.weekStartsOn);
  const [profile, streak, levels, badges, earned, milestones, earnedMilestones, challenges, transactions, events] = await Promise.all([
    prisma.gamificationProfile.findUnique({ where: { studentId } }),
    prisma.learningStreak.findUnique({ where: { studentId } }),
    prisma.learningLevelDef.findMany({ orderBy: { level: "asc" } }),
    prisma.badge.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.studentBadge.findMany({ where: { studentId }, include: { badge: true } }),
    prisma.milestone.findMany({ where: { active: true } }),
    prisma.studentMilestone.findMany({ where: { studentId }, include: { milestone: true } }),
    prisma.challengeParticipant.findMany({
      where: { studentId, challenge: { active: true, endAt: { gte: new Date() } } },
      include: { challenge: true },
      take: 4,
    }),
    prisma.xpTransaction.findMany({ where: { studentId, reversedAt: null, createdAt: { gte: new Date(`${week}T00:00:00Z`) } }, select: { amount: true, metadata: true, createdAt: true, ruleKey: true } }),
    prisma.learningEvent.findMany({
      where: { studentId, excludedAt: null, observedAt: { gte: new Date(Date.now() - 14 * 86400000) }, eventType: { in: Object.keys(EVENT_RULES) } },
      select: { eventType: true, observedAt: true },
    }),
  ]);
  const progress = levelProgress(profile?.totalXp ?? 0, levels);
  const earnedIds = new Set(earned.map((row) => row.badgeId));
  const freezes = await prisma.streakFreeze.count({ where: { studentId, usedAt: null } });
  const minutesToday = transactions.filter((row) => planDate(row.createdAt) === today).reduce((sum, row) => sum + minutesOf(row.metadata), 0);
  const thisWeek = countWeek(events, week, today);
  const lastWeekStart = shiftDate(week, -7);
  const lastWeek = countWeek(events, lastWeekStart, shiftDate(week, -1));
  const group = await groupCollective(studentId);
  const fresh = earned.filter((row) => Date.now() - row.earnedAt.getTime() < 24 * 60 * 60 * 1000);
  return {
    disabled: false as const,
    learningLevel: progress.level,
    levelLabel: "Learning Level",
    percent: progress.percent,
    remaining: progress.remaining,
    totalXp: profile?.totalXp ?? 0,
    englishLevelNote: "Learning Level is motivation only. It is not your English level.",
    streak: streak?.current ?? 0,
    longestStreak: streak?.longest ?? 0,
    streakText: streakMessage(streak?.lastActivityDate ?? null, today, streak?.current ?? 0),
    freezes,
    goalMinutes: adaptive.dailyMinutes,
    goalProgressMinutes: minutesToday,
    weeklyTarget: settings.weeklyGoal,
    weeklyDone: thisWeek.days,
    thisWeek,
    lastWeekSessions: lastWeek.days,
    badges: badges.map((badge) => ({
      id: badge.id,
      name: badge.name,
      description: badge.description,
      category: badge.category,
      icon: badge.icon,
      earned: earnedIds.has(badge.id),
      requirement: badge.description,
    })),
    milestones: milestones.map((milestone) => ({
      name: milestone.name,
      description: milestone.description,
      earned: earnedMilestones.some((row) => row.milestoneId === milestone.id),
    })),
    challenges: challenges.map((row) => ({
      id: row.challengeId,
      title: row.challenge.title,
      progress: row.progress,
      target: row.challenge.requirementCount,
      scope: row.challenge.scope,
      done: Boolean(row.completedAt),
    })),
    groupChallenge: group,
    newBadge: fresh[0]?.badge.name ?? null,
    flagged: Boolean(profile?.flaggedAt),
  };
}

function minutesOf(metadata: string | null) {
  if (!metadata) return 0;
  try {
    const minutes = Number(JSON.parse(metadata).minutes);
    return Number.isFinite(minutes) ? minutes : 0;
  } catch {
    return 0;
  }
}

function countWeek(events: { eventType: string; observedAt: Date }[], start: string, end: string) {
  const rows = events.filter((event) => {
    const date = planDate(event.observedAt);
    return date >= start && date <= end;
  });
  return {
    days: new Set(rows.map((event) => planDate(event.observedAt))).size,
    sessions: rows.length,
    minutes: rows.reduce((sum, event) => sum + (EVENT_RULES[event.eventType]?.minutes ?? 0), 0),
    vocab: rows.filter((event) => event.eventType === "VOCABULARY_CORRECT").length,
    speaking: rows.filter((event) => event.eventType === "SPEAKING_COMPLETED").length,
    listening: rows.filter((event) => event.eventType === "LISTENING_COMPLETED").length,
    lessons: rows.filter((event) => event.eventType === "LESSON_COMPLETED").length,
  };
}

async function groupCollective(studentId: string) {
  const student = await prisma.user.findUnique({ where: { id: studentId }, select: { groupId: true } });
  if (!student?.groupId) return null;
  const challenge = await prisma.groupChallenge.findFirst({
    where: { groupId: student.groupId, active: true, endAt: { gte: new Date() } },
    include: { progress: true, group: { select: { name: true } } },
  });
  if (!challenge) return null;
  return {
    title: challenge.title,
    group: challenge.group.name,
    progress: challenge.progress?.total ?? 0,
    target: challenge.requirementCount,
  };
}

async function ensurePersonalChallenge(studentId: string) {
  const existing = await prisma.challengeParticipant.findFirst({
    where: { studentId, challenge: { scope: "PERSONAL", active: true, endAt: { gte: new Date() } } },
  });
  if (existing) return;
  const end = new Date(Date.now() + 2 * 86400000);
  const challenge = await prisma.challenge.create({
    data: {
      title: "Finish one activity from today's plan",
      description: "A short personal challenge. It is not a competition.",
      scope: "PERSONAL",
      createdById: studentId,
      requirementType: "ANY",
      requirementCount: 1,
      startAt: new Date(),
      endAt: end,
      xpReward: 5,
      active: true,
    },
  });
  await prisma.challengeParticipant.create({ data: { challengeId: challenge.id, studentId } });
}

export async function createTeacherChallenge(teacher: { id: string; role: string; groupId: string | null }, input: {
  title: string;
  description?: string | null;
  groupId: string;
  requirementType: string;
  requirementCount: number;
  endAt: Date;
  xpReward?: number;
}) {
  await assertGroupAccess(teacher, input.groupId);
  const students = await prisma.user.findMany({ where: { groupId: input.groupId, role: "STUDENT", status: "ACTIVE" }, select: { id: true } });
  const challenge = await prisma.challenge.create({
    data: {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      scope: "TEACHER",
      groupId: input.groupId,
      createdById: teacher.id,
      requirementType: input.requirementType,
      requirementCount: input.requirementCount,
      startAt: new Date(),
      endAt: input.endAt,
      xpReward: input.xpReward ?? 10,
      active: true,
      participants: { create: students.map((student) => ({ studentId: student.id })) },
    },
  });
  const { notifyGroupStudents } = await import("@/lib/teaching/notify");
  await notifyGroupStudents(input.groupId, { type: "SYSTEM", title: "New practice challenge", body: challenge.title, href: "/student/achievements" });
  await audit({ actorId: teacher.id, action: "CHALLENGE_CREATED", entityType: "GAMIFICATION", entityId: challenge.id, metadata: { groupId: input.groupId, requirementType: input.requirementType } });
  return { id: challenge.id };
}

export async function createGroupChallenge(teacher: { id: string; role: string; groupId: string | null }, input: {
  title: string;
  groupId: string;
  requirementCount: number;
  endAt: Date;
}) {
  await assertGroupAccess(teacher, input.groupId);
  const row = await prisma.groupChallenge.create({
    data: {
      title: input.title.trim(),
      groupId: input.groupId,
      requirementType: "ANY",
      requirementCount: input.requirementCount,
      startAt: new Date(),
      endAt: input.endAt,
      createdById: teacher.id,
      progress: { create: { total: 0 } },
    },
  });
  await audit({ actorId: teacher.id, action: "GROUP_CHALLENGE_CREATED", entityType: "GAMIFICATION", entityId: row.id, metadata: { groupId: input.groupId, target: input.requirementCount } });
  return { id: row.id, progress: 0, target: input.requirementCount };
}

export async function teacherEngagement(viewer: { id: string; role: string }) {
  const ids = await assignedGroupIds(viewer);
  const groups = await prisma.learningGroup.findMany({
    where: ids === null ? { status: "ACTIVE" } : { id: { in: ids } },
    select: { id: true, name: true, type: true },
    orderBy: { name: "asc" },
  });
  const since = new Date(Date.now() - 7 * 86400000);
  const summaries = [];
  for (const group of groups) {
    const students = await prisma.user.findMany({ where: { groupId: group.id, role: "STUDENT", status: "ACTIVE" }, select: { id: true } });
    const studentIds = students.map((student) => student.id);
    const [active, events, lessons, flagged, challenge] = await Promise.all([
      prisma.learningEvent.groupBy({ by: ["studentId"], where: { studentId: { in: studentIds }, excludedAt: null, observedAt: { gte: since }, eventType: { in: Object.keys(EVENT_RULES) } } }),
      prisma.learningEvent.count({ where: { studentId: { in: studentIds }, excludedAt: null, observedAt: { gte: since }, eventType: { in: Object.keys(EVENT_RULES) } } }),
      prisma.learningEvent.count({ where: { studentId: { in: studentIds }, eventType: "LESSON_COMPLETED", excludedAt: null, observedAt: { gte: since } } }),
      prisma.gamificationProfile.count({ where: { studentId: { in: studentIds }, flaggedAt: { not: null } } }),
      prisma.groupChallenge.findFirst({ where: { groupId: group.id, active: true }, include: { progress: true } }),
    ]);
    summaries.push({
      id: group.id,
      name: group.name,
      type: group.type,
      activeLearners: active.length,
      students: studentIds.length,
      activities: events,
      lessons,
      flaggedForReview: flagged,
      groupChallenge: challenge ? { title: challenge.title, progress: challenge.progress?.total ?? 0, target: challenge.requirementCount } : null,
    });
  }
  return summaries;
}

export async function saveGamificationSetting(actorId: string, key: string, value: string) {
  await prisma.gamificationSetting.upsert({
    where: { scopeKey_key: { scopeKey: "GLOBAL", key } },
    create: { scopeKey: "GLOBAL", key, value, updatedById: actorId },
    update: { value, updatedById: actorId },
  });
  await audit({ actorId, action: "GAMIFICATION_SETTING_CHANGED", entityType: "GAMIFICATION", entityId: "GLOBAL", metadata: { key, value } });
}

export async function saveBadge(actorId: string, input: { code: string; name: string; description: string; category: string; requirementType: string; requirementCount: number; xpReward: number; icon: string }) {
  const code = input.code.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "");
  if (!code) throw new ApiError(422, "Enter a badge code.");
  const row = await prisma.badge.upsert({
    where: { code },
    create: { ...input, code, visibility: "PERSONAL" },
    update: { name: input.name, description: input.description, category: input.category, requirementType: input.requirementType, requirementCount: input.requirementCount, xpReward: input.xpReward, icon: input.icon, active: true },
  });
  await audit({ actorId, action: "BADGE_SAVED", entityType: "GAMIFICATION", entityId: row.id, metadata: { code } });
  return { id: row.id, code };
}

export async function deactivateBadge(actorId: string, code: string) {
  const row = await prisma.badge.update({ where: { code }, data: { active: false } });
  await audit({ actorId, action: "BADGE_DEACTIVATED", entityType: "GAMIFICATION", entityId: row.id, metadata: { code } });
  return { id: row.id };
}

export async function correctXp(actorId: string, transactionId: string, reason: string) {
  const result = await reverseXp(actorId, transactionId, reason);
  if (!result) throw new ApiError(404, "Transaction not found or already corrected.");
  await audit({ actorId, action: "XP_REVERSED", entityType: "GAMIFICATION", entityId: transactionId, metadata: { reason } });
  return result;
}

export async function engagementUsage() {
  const since = new Date(Date.now() - 7 * 86400000);
  const [events, badges, challenges, flagged] = await Promise.all([
    prisma.learningEvent.groupBy({ by: ["studentId"], where: { observedAt: { gte: since }, excludedAt: null, eventType: { in: Object.keys(EVENT_RULES) } } }),
    prisma.studentBadge.count({ where: { earnedAt: { gte: since } } }),
    prisma.challengeParticipant.count({ where: { completedAt: { gte: since } } }),
    prisma.gamificationProfile.count({ where: { flaggedAt: { not: null } } }),
  ]);
  const streaks = await prisma.learningStreak.findMany({ select: { current: true } });
  const buckets = { none: 0, short: 0, week: 0 };
  for (const streak of streaks) {
    if (streak.current <= 0) buckets.none += 1;
    else if (streak.current < 7) buckets.short += 1;
    else buckets.week += 1;
  }
  return {
    activeLearners7d: events.length,
    badgesEarned7d: badges,
    challengesCompleted7d: challenges,
    flaggedForReview: flagged,
    streakBuckets: buckets,
  };
}
