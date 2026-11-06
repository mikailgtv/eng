import { prisma } from "@/lib/prisma";

export type VoiceLimits = {
  enabled: boolean;
  dailyMinutes: number;
  monthlyMinutes: number;
  maxAudioSec: number;
  teacherTranscripts: boolean;
  requireConsent: boolean;
  storeAudio: boolean;
};

const DEFAULTS: Record<string, string> = {
  enabled: "true",
  dailyMinutes: "15",
  monthlyMinutes: "120",
  maxAudioSec: "20",
  teacherTranscripts: "false",
  requireConsent: "true",
  storeAudio: "false",
};

export async function getVoiceSetting(scopeKey: string, key: string) {
  const row = await prisma.voiceSetting.findUnique({ where: { scopeKey_key: { scopeKey, key } } });
  return row?.value ?? null;
}

export async function setVoiceSetting(scopeKey: string, key: string, value: string, actorId: string) {
  await prisma.voiceSetting.upsert({
    where: { scopeKey_key: { scopeKey, key } },
    create: { scopeKey, key, value, updatedById: actorId },
    update: { value, updatedById: actorId },
  });
}

export async function resolveVoiceLimits(groupId: string | null): Promise<VoiceLimits> {
  const rows = await prisma.voiceSetting.findMany({
    where: { scopeKey: { in: ["GLOBAL", groupId ?? ""] } },
  });
  const map = new Map(rows.map((row) => [`${row.scopeKey}:${row.key}`, row.value]));
  const pick = (key: string) => map.get(`${groupId}:${key}`) ?? map.get(`GLOBAL:${key}`) ?? DEFAULTS[key];
  const globalOn = (map.get("GLOBAL:enabled") ?? "true") !== "false";
  const groupOn = groupId ? (map.get(`${groupId}:enabled`) ?? "true") !== "false" : true;
  return {
    enabled: globalOn && groupOn,
    dailyMinutes: clamp(Number(pick("dailyMinutes")), 1, 180),
    monthlyMinutes: clamp(Number(pick("monthlyMinutes")), 1, 2000),
    maxAudioSec: clamp(Number(pick("maxAudioSec")), 5, 60),
    teacherTranscripts: pick("teacherTranscripts") === "true",
    requireConsent: pick("requireConsent") !== "false",
    storeAudio: pick("storeAudio") === "true",
  };
}

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}
