import { prisma } from "@/lib/prisma";
import { TOPIC_TAGS } from "./rules";

const DEFAULTS: Record<string, string> = {
  builderEnabled: "true",
  requireReview: "true",
  maxMediaBytes: "8000000",
};

export async function contentSettings() {
  const rows = await prisma.contentSetting.findMany({ where: { scopeKey: "GLOBAL" } });
  const values = { ...DEFAULTS };
  for (const row of rows) values[row.key] = row.value;
  return {
    builderEnabled: values.builderEnabled !== "false",
    requireReview: values.requireReview !== "false",
    maxMediaBytes: Number(values.maxMediaBytes) || 8_000_000,
  };
}

export async function saveContentSetting(actorId: string, key: string, value: string) {
  if (!Object.prototype.hasOwnProperty.call(DEFAULTS, key)) throw new Error("That content setting is not recognized.");
  await prisma.contentSetting.upsert({
    where: { scopeKey_key: { scopeKey: "GLOBAL", key } },
    create: { scopeKey: "GLOBAL", key, value, updatedById: actorId },
    update: { value, updatedById: actorId },
  });
}

export async function ensureContentTags() {
  for (const name of TOPIC_TAGS) {
    await prisma.contentTag.upsert({ where: { name }, create: { name, kind: "TOPIC" }, update: {} });
  }
}

/** Link existing courses to one curriculum. Does not clone or unpublish them. */
export async function ensureCurriculumShell(actorId?: string | null) {
  const existing = await prisma.curriculum.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  const created = await prisma.curriculum.create({
    data: {
      title: "Organizational English",
      description: "Courses already in the LMS, grouped as one curriculum.",
      status: "ACTIVE",
      createdById: actorId ?? null,
    },
  });
  await prisma.course.updateMany({ where: { curriculumId: null }, data: { curriculumId: created.id } });
  return created;
}
