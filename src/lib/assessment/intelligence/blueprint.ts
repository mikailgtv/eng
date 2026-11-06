import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { isKnownAssessmentType, SKILLS, type Skill } from "@/lib/assessment/registry";

export type BlueprintSection = { skill: Skill; percent: number; required?: boolean };
export type DifficultyMix = { EASY: number; MEDIUM: number; HARD: number };

const DIFFICULTY = ["EASY", "MEDIUM", "HARD"] as const;

export function parseBlueprint(input: {
  sections: BlueprintSection[];
  difficulty: DifficultyMix;
  questionCount: number;
}) {
  if (!Number.isInteger(input.questionCount) || input.questionCount < 1 || input.questionCount > 100) {
    throw new ApiError(422, "Question count must be between 1 and 100.");
  }
  const skillTotal = input.sections.reduce((sum, section) => sum + section.percent, 0);
  if (Math.round(skillTotal) !== 100) throw new ApiError(422, "Skill percentages must add up to 100.");
  const difficultyTotal = input.difficulty.EASY + input.difficulty.MEDIUM + input.difficulty.HARD;
  if (Math.round(difficultyTotal) !== 100) throw new ApiError(422, "Difficulty percentages must add up to 100.");
  for (const section of input.sections) {
    if (!(SKILLS as readonly string[]).includes(section.skill)) throw new ApiError(422, "Unknown skill in the blueprint.");
    if (section.percent < 0 || section.percent > 100) throw new ApiError(422, "A section percentage is out of range.");
  }
  return {
    sections: allocate(input.questionCount, input.sections.map((section) => ({ key: section.skill, percent: section.percent }))),
    difficulty: allocate(input.questionCount, DIFFICULTY.map((key) => ({ key, percent: input.difficulty[key] }))),
  };
}

function allocate(total: number, parts: { key: string; percent: number }[]) {
  const raw = parts.map((part) => ({ key: part.key, exact: (total * part.percent) / 100 }));
  const counts = raw.map((part) => ({ key: part.key, count: Math.floor(part.exact), fraction: part.exact - Math.floor(part.exact) }));
  let left = total - counts.reduce((sum, part) => sum + part.count, 0);
  [...counts].sort((a, b) => b.fraction - a.fraction).forEach((part) => {
    if (left <= 0) return;
    part.count += 1;
    left -= 1;
  });
  return counts.filter((part) => part.count > 0);
}

export async function validateBlueprint(input: {
  sections: BlueprintSection[];
  difficulty: DifficultyMix;
  questionCount: number;
  levelId?: string | null;
}) {
  const plan = parseBlueprint(input);
  const missing: string[] = [];
  for (const section of plan.sections) {
    const have = await prisma.question.count({
      where: {
        status: "PUBLISHED",
        skill: section.key,
        ...(input.levelId ? { levelId: input.levelId } : {}),
        OR: [{ bankMeta: null }, { bankMeta: { reviewState: { in: ["APPROVED", "PUBLISHED"] } } }],
      },
    });
    if (have < section.count) missing.push(`${section.key}: need ${section.count}, have ${have}.`);
  }
  for (const band of plan.difficulty) {
    const have = await prisma.question.count({
      where: {
        status: "PUBLISHED",
        difficulty: band.key,
        ...(input.levelId ? { levelId: input.levelId } : {}),
        OR: [{ bankMeta: null }, { bankMeta: { reviewState: { in: ["APPROVED", "PUBLISHED"] } } }],
      },
    });
    if (have < band.count) missing.push(`${band.key}: need ${band.count}, have ${have}.`);
  }
  return {
    satisfied: missing.length === 0,
    message: missing.length ? "Blueprint cannot be fully satisfied." : "The question bank can satisfy this blueprint.",
    missing,
    plan,
  };
}

export async function saveBlueprint(actorId: string, input: {
  title: string;
  assessmentType: string;
  courseId?: string | null;
  levelId?: string | null;
  moduleId?: string | null;
  unitId?: string | null;
  questionCount: number;
  timeLimitMinutes?: number | null;
  passingScore: number;
  attemptLimit?: number | null;
  sections: BlueprintSection[];
  difficulty: DifficultyMix;
  objectives?: string[];
  secureMode?: boolean;
  retakePolicy?: Record<string, unknown>;
}) {
  if (!isKnownAssessmentType(input.assessmentType)) throw new ApiError(422, "Unknown assessment type.");
  const check = await validateBlueprint(input);
  const saved = await prisma.assessmentBlueprint.create({
    data: {
      title: input.title,
      assessmentType: input.assessmentType,
      courseId: input.courseId || null,
      levelId: input.levelId || null,
      moduleId: input.moduleId || null,
      unitId: input.unitId || null,
      questionCount: input.questionCount,
      timeLimitMinutes: input.timeLimitMinutes ?? null,
      passingScore: input.passingScore,
      attemptLimit: input.attemptLimit ?? null,
      retakePolicy: JSON.stringify(input.retakePolicy ?? { mode: "NONE", countsAs: "LATEST" }),
      secureMode: Boolean(input.secureMode),
      status: check.satisfied ? "REVIEW" : "DRAFT",
      createdById: actorId,
      versions: {
        create: {
          version: 1,
          sections: JSON.stringify(input.sections),
          difficulty: JSON.stringify(input.difficulty),
          objectives: JSON.stringify(input.objectives ?? []),
          scoringConfig: JSON.stringify({ passingScore: input.passingScore, method: "weighted-sections" }),
        },
      },
    },
    include: { versions: true },
  });
  return { blueprint: saved, check };
}
