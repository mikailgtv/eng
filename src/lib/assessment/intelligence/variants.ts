import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { parseBlueprint, type BlueprintSection, type DifficultyMix } from "./blueprint";

const WEIGHT = { EASY: 1, MEDIUM: 2, HARD: 3 } as const;

export async function buildVariants(blueprintId: string, count: number) {
  if (count < 1 || count > 5) throw new ApiError(422, "Choose between 1 and 5 variants.");
  const blueprint = await prisma.assessmentBlueprint.findUnique({
    where: { id: blueprintId },
    include: { versions: { orderBy: { version: "desc" }, take: 1 } },
  });
  if (!blueprint) throw new ApiError(404, "Blueprint not found.");
  const version = blueprint.versions[0];
  if (!version) throw new ApiError(422, "This blueprint has no saved version.");
  const sections = JSON.parse(version.sections) as BlueprintSection[];
  const difficulty = JSON.parse(version.difficulty) as DifficultyMix;
  const check = parseBlueprint({ sections, difficulty, questionCount: blueprint.questionCount });
  const bank = await prisma.question.findMany({
    where: {
      status: "PUBLISHED",
      ...(blueprint.levelId ? { levelId: blueprint.levelId } : {}),
      OR: [{ bankMeta: null }, { bankMeta: { reviewState: { in: ["APPROVED", "PUBLISHED"] } } }],
    },
    select: { id: true, skill: true, difficulty: true },
  });
  const target = targetIndex(check.difficulty);
  const made: { id: string; label: string; difficultyIndex: number; questionIds: string[] }[] = [];
  const usedSets = new Set<string>();
  for (let i = 0; i < count; i += 1) {
    const picked = pickVariant(bank, check, target, usedSets);
    if (!picked) {
      throw new ApiError(422, "Could not build a variant that matches the blueprint difficulty. No incomplete variant was saved.");
    }
    usedSets.add(picked.ids.slice().sort().join(","));
    const row = await prisma.assessmentVariant.create({
      data: {
        blueprintId,
        blueprintVersionId: version.id,
        label: `Variant ${String.fromCharCode(65 + i)}`,
        questionIds: JSON.stringify(picked.ids),
        difficultyIndex: picked.index,
      },
    });
    made.push({ id: row.id, label: row.label, difficultyIndex: row.difficultyIndex, questionIds: picked.ids });
  }
  return { target, tolerance: 0.35, variants: made };
}

function targetIndex(parts: { key: string; count: number }[]) {
  const total = parts.reduce((sum, part) => sum + part.count, 0) || 1;
  const weighted = parts.reduce((sum, part) => sum + part.count * (WEIGHT[part.key as keyof typeof WEIGHT] ?? 2), 0);
  return weighted / total;
}

function pickVariant(
  bank: { id: string; skill: string | null; difficulty: string }[],
  plan: { sections: { key: string; count: number }[]; difficulty: { key: string; count: number }[] },
  target: number,
  used: Set<string>,
) {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const chosen: { id: string; difficulty: string }[] = [];
    const taken = new Set<string>();
    let ok = true;
    for (const section of plan.sections) {
      const pool = shuffle(bank.filter((item) => item.skill === section.key && !taken.has(item.id)));
      if (pool.length < section.count) { ok = false; break; }
      pool.slice(0, section.count).forEach((item) => {
        taken.add(item.id);
        chosen.push(item);
      });
    }
    if (!ok) return null;
    const counts = { EASY: 0, MEDIUM: 0, HARD: 0 };
    chosen.forEach((item) => { counts[item.difficulty as keyof typeof counts] += 1; });
    const difficultyOk = plan.difficulty.every((part) => Math.abs(counts[part.key as keyof typeof counts] - part.count) <= 1);
    const index = chosen.reduce((sum, item) => sum + (WEIGHT[item.difficulty as keyof typeof WEIGHT] ?? 2), 0) / chosen.length;
    const key = chosen.map((item) => item.id).sort().join(",");
    if (difficultyOk && Math.abs(index - target) <= 0.35 && !used.has(key)) return { ids: chosen.map((item) => item.id), index };
  }
  return null;
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
