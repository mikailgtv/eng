/**
 * Awards XP from a stored learning event. Students cannot call this directly.
 * The ledger is the history. Profile totals are a cache.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyGroupStudents, notifyUsers } from "@/lib/teaching/notify";
import { planDate } from "@/lib/adaptive/plans";
import { BADGE_SEEDS, DEFAULT_SETTINGS, EVENT_RULES, MILESTONE_SEEDS, applyStreakStep, shiftDate } from "./rules";

let ready = false;

export async function ensureMotivationCatalog() {
  if (ready) return;
  for (let level = 1; level <= 12; level += 1) {
    await prisma.learningLevelDef.upsert({
      where: { level },
      create: { level, xpRequired: (level - 1) * 60, title: `Learning Level ${level}` },
      update: {},
    });
  }
  for (const badge of BADGE_SEEDS) {
    await prisma.badge.upsert({
      where: { code: badge.code },
      create: badge,
      update: {},
    });
  }
  for (const milestone of MILESTONE_SEEDS) {
    await prisma.milestone.upsert({
      where: { code: milestone.code },
      create: milestone,
      update: {},
    });
  }
  ready = true;
}

export async function motivationSettings() {
  const rows = await prisma.gamificationSetting.findMany({ where: { scopeKey: "GLOBAL" } });
  const map = new Map(rows.map((row) => [row.key, row.value]));
  const num = (key: string, fallback: number) => {
    const value = Number(map.get(key) ?? DEFAULT_SETTINGS[key] ?? fallback);
    return Number.isFinite(value) ? value : fallback;
  };
  return {
    enabled: (map.get("enabled") ?? "true") !== "false",
    dailyXpCap: num("dailyXpCap", 80),
    weeklyGoal: num("weeklyGoal", 4),
    freezeMax: num("freezeMax", 1),
    xp: (key: string, fallback: number) => num(key, fallback),
    cap: (key: string, fallback: number) => num(key, fallback),
  };
}

export async function applyEngagement(input: {
  studentId: string;
  eventType: string;
  sourceType: string;
  sourceId: string;
  payload?: Record<string, unknown> | null;
}) {
  const rule = EVENT_RULES[input.eventType];
  if (!rule) return { awarded: 0 };
  if (input.eventType === "EXAM_COMPLETED" && !quizPassed(input.payload)) return { awarded: 0 };
  const settings = await motivationSettings();
  if (!settings.enabled) return { awarded: 0 };
  await ensureMotivationCatalog();
  await touchStreak(input.studentId);
  const awarded = await awardXp(input, rule, settings);
  await evaluateRewards(input.studentId);
  await updateChallenges(input.studentId, input.eventType);
  await maybeFlag(input.studentId);
  return { awarded };
}

async function awardXp(
  input: { studentId: string; eventType: string; sourceType: string; sourceId: string; payload?: Record<string, unknown> | null },
  rule: (typeof EVENT_RULES)[string],
  settings: Awaited<ReturnType<typeof motivationSettings>>
) {
  const amount = settings.xp(rule.xpKey, rule.defaultXp);
  if (amount <= 0) return 0;
  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);
  const [todayXp, todayRule, sameActivity] = await Promise.all([
    prisma.xpTransaction.aggregate({ where: { studentId: input.studentId, createdAt: { gte: day }, reversedAt: null, amount: { gt: 0 } }, _sum: { amount: true } }),
    prisma.xpTransaction.count({ where: { studentId: input.studentId, ruleKey: rule.ruleKey, createdAt: { gte: day }, reversedAt: null, amount: { gt: 0 } } }),
    activityAlreadyAwarded(input.studentId, input.payload, day),
  ]);
  if ((todayXp._sum.amount ?? 0) + amount > settings.dailyXpCap) return 0;
  if (todayRule >= settings.cap(rule.capKey, rule.defaultCap)) return 0;
  if (sameActivity) return 0;
  try {
    await prisma.xpTransaction.create({
      data: {
        studentId: input.studentId,
        amount,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        ruleKey: rule.ruleKey,
        metadata: JSON.stringify({ eventType: input.eventType, minutes: rule.minutes, activityId: input.payload?.activityId ?? null }),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") return 0;
    throw err;
  }
  await refreshProfile(input.studentId);
  return amount;
}

async function activityAlreadyAwarded(studentId: string, payload: Record<string, unknown> | null | undefined, day: Date) {
  const activityId = typeof payload?.activityId === "string" ? payload.activityId : null;
  if (!activityId) return false;
  const rows = await prisma.xpTransaction.findMany({
    where: { studentId, createdAt: { gte: day }, reversedAt: null, ruleKey: "practice" },
    select: { metadata: true },
    take: 20,
  });
  return rows.some((row) => row.metadata?.includes(activityId));
}

export async function touchStreak(studentId: string, today = planDate()) {
  await ensureMotivationCatalog();
  const settings = await motivationSettings();
  const streak = await prisma.learningStreak.findUnique({ where: { studentId } });
  const freezes = await prisma.streakFreeze.count({ where: { studentId, usedAt: null } });
  const step = applyStreakStep({
    current: streak?.current ?? 0,
    longest: streak?.longest ?? 0,
    lastDate: streak?.lastActivityDate ?? null,
    today,
    freezes,
  });
  if (streak?.lastActivityDate === today) return step;
  await prisma.learningStreak.upsert({
    where: { studentId },
    create: { studentId, current: step.current, longest: step.longest, lastActivityDate: today, status: step.status },
    update: { current: step.current, longest: step.longest, lastActivityDate: today, status: step.status },
  });
  if (step.useFreeze) {
    const freeze = await prisma.streakFreeze.findFirst({ where: { studentId, usedAt: null }, orderBy: { earnedAt: "asc" } });
    if (freeze) await prisma.streakFreeze.update({ where: { id: freeze.id }, data: { usedAt: new Date() } });
  }
  if (step.current >= 3 && freezes < settings.freezeMax && !step.useFreeze) {
    const unused = await prisma.streakFreeze.count({ where: { studentId, usedAt: null } });
    if (unused < settings.freezeMax) {
      await prisma.streakFreeze.create({ data: { studentId, source: "STREAK" } });
    }
  }
  return step;
}

async function evaluateRewards(studentId: string) {
  const [badges, milestones, streak, events] = await Promise.all([
    prisma.badge.findMany({ where: { active: true } }),
    prisma.milestone.findMany({ where: { active: true } }),
    prisma.learningStreak.findUnique({ where: { studentId } }),
    prisma.learningEvent.groupBy({ by: ["eventType"], where: { studentId, excludedAt: null }, _count: { _all: true } }),
  ]);
  const counts = new Map(events.map((row) => [row.eventType, row._count._all]));
  const listeningMinutes = (counts.get("LISTENING_COMPLETED") ?? 0) * (EVENT_RULES.LISTENING_COMPLETED?.minutes ?? 5);
  for (const badge of badges) {
    if (!met(badge.requirementType, badge.requirementCount, counts, streak?.current ?? 0, listeningMinutes)) continue;
    const created = await prisma.studentBadge.create({ data: { studentId, badgeId: badge.id } }).catch(() => null);
    if (!created) continue;
    if (badge.xpReward > 0) {
      await prisma.xpTransaction.create({
        data: { studentId, amount: badge.xpReward, sourceType: "BADGE", sourceId: badge.id, ruleKey: "badge", metadata: JSON.stringify({ code: badge.code }) },
      }).catch(() => undefined);
    }
    await notifyOnce(studentId, `Badge unlocked: ${badge.name}`, badge.description, "/student/achievements");
  }
  for (const milestone of milestones) {
    if (!met(milestone.requirementType, milestone.requirementCount, counts, streak?.current ?? 0, listeningMinutes)) continue;
    const created = await prisma.studentMilestone.create({ data: { studentId, milestoneId: milestone.id } }).catch(() => null);
    if (created) await notifyOnce(studentId, milestone.name, milestone.description, "/student/achievements");
  }
  await refreshProfile(studentId);
}

function met(type: string, count: number, counts: Map<string, number>, streak: number, listeningMinutes: number) {
  if (type === "STREAK_DAYS") return streak >= count;
  if (type === "LISTENING_MINUTES") return listeningMinutes >= count;
  return (counts.get(type) ?? 0) >= count;
}

async function updateChallenges(studentId: string, eventType: string) {
  const now = new Date();
  const rows = await prisma.challengeParticipant.findMany({
    where: { studentId, completedAt: null, challenge: { active: true, startAt: { lte: now }, endAt: { gte: now } } },
    include: { challenge: true },
  });
  for (const row of rows) {
    if (row.challenge.requirementType !== "ANY" && row.challenge.requirementType !== eventType) continue;
    const progress = row.progress + 1;
    const done = progress >= row.challenge.requirementCount;
    await prisma.challengeParticipant.update({
      where: { id: row.id },
      data: { progress, completedAt: done ? now : null },
    });
    if (done) {
      if (row.challenge.xpReward > 0) {
        await prisma.xpTransaction.create({
          data: { studentId, amount: row.challenge.xpReward, sourceType: "CHALLENGE", sourceId: row.challenge.id, ruleKey: "challenge", metadata: JSON.stringify({ title: row.challenge.title }) },
        }).catch(() => undefined);
      }
      await notifyOnce(studentId, "Challenge completed", row.challenge.title, "/student/achievements");
    }
  }
  const student = await prisma.user.findUnique({ where: { id: studentId }, select: { groupId: true } });
  if (!student?.groupId) return;
  const groups = await prisma.groupChallenge.findMany({
    where: { groupId: student.groupId, active: true, startAt: { lte: now }, endAt: { gte: now } },
  });
  for (const challenge of groups) {
    if (challenge.requirementType !== "ANY" && challenge.requirementType !== eventType) continue;
    const progress = await prisma.groupChallengeProgress.upsert({
      where: { groupChallengeId: challenge.id },
      create: { groupChallengeId: challenge.id, total: 1 },
      update: { total: { increment: 1 } },
    });
    if (progress.total === challenge.requirementCount) {
      await notifyGroupStudents(student.groupId, { type: "SYSTEM", title: "Group challenge reached its goal", body: challenge.title, href: "/student/achievements" });
    }
  }
}

async function maybeFlag(studentId: string) {
  const since = new Date(Date.now() - 10 * 60 * 1000);
  const count = await prisma.learningEvent.count({ where: { studentId, observedAt: { gte: since }, excludedAt: null } });
  if (count < 12) return;
  await prisma.gamificationProfile.upsert({
    where: { studentId },
    create: { studentId, flaggedAt: new Date(), flagReason: "Many learning events in a short time. Review the ledger. Do not punish automatically." },
    update: { flaggedAt: new Date(), flagReason: "Many learning events in a short time. Review the ledger. Do not punish automatically." },
  });
}

export async function refreshProfile(studentId: string) {
  const [sum, levels] = await Promise.all([
    prisma.xpTransaction.aggregate({ where: { studentId, reversedAt: null }, _sum: { amount: true } }),
    prisma.learningLevelDef.findMany({ orderBy: { level: "asc" } }),
  ]);
  const totalXp = Math.max(0, sum._sum.amount ?? 0);
  let learningLevel = 1;
  for (const level of levels) {
    if (totalXp >= level.xpRequired) learningLevel = level.level;
  }
  await prisma.gamificationProfile.upsert({
    where: { studentId },
    create: { studentId, totalXp, learningLevel },
    update: { totalXp, learningLevel },
  });
  return { totalXp, learningLevel };
}

async function notifyOnce(studentId: string, title: string, body: string, href: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const existing = await prisma.notification.findFirst({ where: { userId: studentId, title, createdAt: { gte: since } } });
  if (existing) return;
  await notifyUsers([studentId], { type: "SYSTEM", category: "GAMIFICATION", title, body, href, priority: "LOW", source: "GAMIFICATION", groupKey: `gamification:${title}` });
}

function quizPassed(payload?: Record<string, unknown> | null) {
  const score = Number(payload?.score);
  const total = Number(payload?.total);
  if (!Number.isFinite(score) || !Number.isFinite(total) || total <= 0) return false;
  return score / total >= 0.6;
}

export async function reverseXp(actorId: string, transactionId: string, reason: string) {
  const original = await prisma.xpTransaction.findUnique({ where: { id: transactionId } });
  if (!original || original.reversedAt) return null;
  await prisma.xpTransaction.update({ where: { id: original.id }, data: { reversedAt: new Date() } });
  await prisma.xpTransaction.create({
    data: {
      studentId: original.studentId,
      amount: -original.amount,
      sourceType: "REVERSAL",
      sourceId: original.id,
      ruleKey: "reversal",
      reversalOfId: original.id,
      metadata: JSON.stringify({ reason, actorId }),
    },
  });
  return refreshProfile(original.studentId);
}

export { shiftDate };
