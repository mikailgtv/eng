import { prisma } from "@/lib/prisma";
import { AI_MODES, type AiMode } from "./types";

export type ResolvedAiSettings = {
  enabled: boolean;
  dailyRequestLimit: number;
  maxResponseChars: number;
  maxInputChars: number;
  allowedModes: AiMode[];
  translationEnabled: boolean;
  conversationEnabled: boolean;
  defaultDifficulty: "EASY" | "NORMAL" | "CHALLENGE";
  providerConfigured: boolean;
};

const DEFAULTS = {
  enabled: "true",
  dailyRequestLimit: "40",
  maxResponseChars: "800",
  maxInputChars: "500",
  allowedModes: AI_MODES.join(","),
  translationEnabled: "true",
};

export async function getSetting(scopeKey: string, key: string): Promise<string | null> {
  const row = await prisma.aiSetting.findUnique({ where: { scopeKey_key: { scopeKey, key } } });
  return row?.value ?? null;
}

export async function setSetting(scopeKey: string, key: string, value: string, actorId: string) {
  await prisma.aiSetting.upsert({
    where: { scopeKey_key: { scopeKey, key } },
    create: { scopeKey, key, value, updatedById: actorId },
    update: { value, updatedById: actorId },
  });
}

export async function resolveAiSettings(groupId: string | null): Promise<ResolvedAiSettings> {
  const keys = Object.keys(DEFAULTS);
  const rows = await prisma.aiSetting.findMany({
    where: { scopeKey: { in: ["GLOBAL", groupId ?? ""] }, key: { in: keys.concat(["conversationEnabled", "defaultDifficulty"]) } },
  });
  const map = new Map(rows.map((row) => [`${row.scopeKey}:${row.key}`, row.value]));
  const pick = (key: string, fallback: string) => map.get(`${groupId}:${key}`) ?? map.get(`GLOBAL:${key}`) ?? fallback;
  const globalOn = (map.get("GLOBAL:enabled") ?? DEFAULTS.enabled) !== "false";
  const groupOn = groupId ? (map.get(`${groupId}:enabled`) ?? "true") !== "false" : true;
  const modes = pick("allowedModes", DEFAULTS.allowedModes)
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is AiMode => (AI_MODES as readonly string[]).includes(item));
  const difficulty = pick("defaultDifficulty", "EASY");
  return {
    enabled: globalOn && groupOn,
    dailyRequestLimit: clamp(Number(pick("dailyRequestLimit", DEFAULTS.dailyRequestLimit)), 1, 200),
    maxResponseChars: clamp(Number(pick("maxResponseChars", DEFAULTS.maxResponseChars)), 80, 2000),
    maxInputChars: clamp(Number(map.get("GLOBAL:maxInputChars") ?? DEFAULTS.maxInputChars), 40, 1000),
    allowedModes: modes.length ? modes : [...AI_MODES],
    translationEnabled: pick("translationEnabled", "true") !== "false",
    conversationEnabled: pick("conversationEnabled", "true") !== "false",
    defaultDifficulty: difficulty === "NORMAL" || difficulty === "CHALLENGE" ? difficulty : "EASY",
    providerConfigured: Boolean(process.env.AI_API_KEY),
  };
}

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export async function countTodayUsage(studentId: string) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  return prisma.aiUsage.count({ where: { studentId, createdAt: { gte: start }, ok: true } });
}
