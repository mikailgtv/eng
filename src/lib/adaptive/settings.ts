import { prisma } from "@/lib/prisma";
import { parseIntervals } from "./review";

export type AdaptiveLimits = {
  enabled: boolean;
  intervals: number[];
  dailyMinutes: number;
  maxRecommendations: number;
  aiPersonalization: boolean;
  teacherOverride: boolean;
  eventRetentionDays: number;
};

const DEFAULTS: Record<string, string> = {
  enabled: "true",
  reviewIntervals: "1,2,4,8,16",
  dailyMinutes: "10",
  maxRecommendations: "4",
  aiPersonalization: "true",
  teacherOverride: "true",
  eventRetentionDays: "365",
  weekStartsOn: "SAT",
};

const MINUTES = new Set([5, 10, 15, 20, 30, 45, 60]);

export async function getAdaptiveSetting(scopeKey: string, key: string) {
  const row = await prisma.adaptiveSetting.findUnique({ where: { scopeKey_key: { scopeKey, key } } });
  return row?.value ?? null;
}

export async function setAdaptiveSetting(scopeKey: string, key: string, value: string, actorId: string) {
  await prisma.adaptiveSetting.upsert({
    where: { scopeKey_key: { scopeKey, key } },
    create: { scopeKey, key, value, updatedById: actorId },
    update: { value, updatedById: actorId },
  });
}

export async function resolveAdaptiveSettings(groupId: string | null): Promise<AdaptiveLimits & { weekStartsOn: string }> {
  const rows = await prisma.adaptiveSetting.findMany({ where: { scopeKey: { in: ["GLOBAL", groupId ?? ""] } } });
  const map = new Map(rows.map((row) => [`${row.scopeKey}:${row.key}`, row.value]));
  const pick = (key: string) => map.get(`${groupId}:${key}`) ?? map.get(`GLOBAL:${key}`) ?? DEFAULTS[key];
  const globalOn = (map.get("GLOBAL:enabled") ?? "true") !== "false";
  const groupOn = groupId ? (map.get(`${groupId}:enabled`) ?? "true") !== "false" : true;
  const minutes = Number(pick("dailyMinutes"));
  return {
    enabled: globalOn && groupOn,
    intervals: parseIntervals(pick("reviewIntervals")),
    dailyMinutes: MINUTES.has(minutes) ? minutes : 10,
    maxRecommendations: clamp(Number(pick("maxRecommendations")), 1, 6),
    aiPersonalization: pick("aiPersonalization") !== "false",
    teacherOverride: pick("teacherOverride") !== "false",
    eventRetentionDays: clamp(Number(pick("eventRetentionDays")), 30, 3650),
    weekStartsOn: pick("weekStartsOn") || "SAT",
  };
}

export function clampMinutes(value: number, fallback: number) {
  return MINUTES.has(value) ? value : fallback;
}

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}
