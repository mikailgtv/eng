import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api";
import { audit } from "@/lib/audit";
import type { SessionUser } from "@/types";
import { assertLessonEdit } from "./lessons";
import { sanitizeContent, validateDifficulty, LIBRARY_KINDS } from "./rules";

export async function searchLibrary(query: { q?: string; kind?: string; level?: string; topic?: string; skill?: string; author?: string; take?: number; cursor?: string }) {
  const take = Math.min(30, Math.max(1, query.take ?? 20));
  const items = await prisma.contentItem.findMany({
    where: {
      archivedAt: null,
      kind: { not: "LESSON_SNAPSHOT" },
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.level ? { levelCode: query.level } : {}),
      ...(query.topic ? { topic: { contains: query.topic } } : {}),
      ...(query.skill ? { OR: [{ primarySkill: query.skill }, { secondarySkill: query.skill }] } : {}),
      ...(query.q ? { OR: [{ title: { contains: query.q } }, { body: { contains: query.q } }, { topic: { contains: query.q } }] } : {}),
      ...(query.cursor ? { createdAt: { lt: new Date(query.cursor) } } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take,
    include: { author: { select: { firstName: true, lastName: true } }, _count: { select: { usages: true } }, tags: { include: { tag: true } } },
  });
  return {
    items: items.map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      levelCode: item.levelCode,
      difficulty: item.difficulty,
      topic: item.topic,
      primarySkill: item.primarySkill,
      status: item.status,
      source: item.source,
      aiLabeled: item.aiLabeled,
      author: item.author ? `${item.author.firstName} ${item.author.lastName}` : "Unknown",
      usageCount: item._count.usages,
      tags: item.tags.map((tag) => tag.tag.name),
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
    nextCursor: items.length === take ? items[items.length - 1]?.createdAt.toISOString() ?? null : null,
  };
}

export async function createLibraryItem(actor: SessionUser, input: {
  kind: string;
  title: string;
  body?: string;
  levelCode?: string | null;
  difficulty?: string | null;
  topic?: string | null;
  primarySkill?: string | null;
  secondarySkill?: string | null;
  tags?: string[];
  aiLabeled?: boolean;
}) {
  if (!LIBRARY_KINDS.includes(input.kind as (typeof LIBRARY_KINDS)[number]) && input.kind !== "LESSON_SNAPSHOT") {
    throw new ApiError(400, "Choose a library category.");
  }
  const title = sanitizeContent(input.title);
  if (title.length < 2) throw new ApiError(400, "Enter a title.");
  const difficulty = validateDifficulty(input.difficulty);
  if (input.difficulty && !difficulty) throw new ApiError(400, "Difficulty must be Very Easy, Easy, Medium, Hard, or Very Hard.");
  const item = await prisma.contentItem.create({
    data: {
      kind: input.kind,
      title,
      body: sanitizeContent(input.body ?? ""),
      levelCode: input.levelCode || null,
      difficulty,
      topic: input.topic ? sanitizeContent(input.topic) : null,
      primarySkill: input.primarySkill || null,
      secondarySkill: input.secondarySkill || null,
      authorId: actor.id,
      source: input.aiLabeled ? "AI_DRAFT" : "TEACHER",
      aiLabeled: Boolean(input.aiLabeled),
      status: "DRAFT",
    },
  });
  if (input.tags?.length) {
    for (const name of input.tags) {
      const tag = await prisma.contentTag.upsert({ where: { name: sanitizeContent(name) }, create: { name: sanitizeContent(name) }, update: {} });
      await prisma.contentItemTag.create({ data: { itemId: item.id, tagId: tag.id } });
    }
  }
  await audit({ actorId: actor.id, action: "CONTENT_CREATED", entityType: "CONTENT", entityId: item.id, metadata: { kind: item.kind, aiLabeled: item.aiLabeled } });
  return item;
}

export async function useItemInLesson(actor: SessionUser, itemId: string, lessonId: string, placement = "LESSON") {
  await assertLessonEdit(actor, lessonId);
  const item = await prisma.contentItem.findUnique({ where: { id: itemId } });
  if (!item || item.archivedAt) throw new ApiError(404, "Content item not found.");
  const usage = await prisma.contentItemUsage.create({ data: { contentItemId: itemId, lessonId, placement } });
  if (item.kind === "VOCABULARY") {
    const word = await prisma.vocabulary.create({
      data: {
        lessonId,
        word: item.title,
        translation: item.body || null,
        levelCode: item.levelCode,
        difficulty: item.difficulty,
        topic: item.topic,
        order: 0,
      },
    });
    await prisma.knowledgeItem.upsert({
      where: { vocabularyId: word.id },
      create: { skillCode: "vocabulary", kind: "VOCABULARY", label: word.word, vocabularyId: word.id, lessonId, levelCode: item.levelCode },
      update: {},
    });
  }
  if (item.kind === "GRAMMAR") {
    const grammar = await prisma.grammarContent.create({
      data: { lessonId, title: item.title, explanation: item.body, difficulty: item.difficulty, levelCode: item.levelCode },
    });
    await prisma.knowledgeItem.upsert({
      where: { grammarId: grammar.id },
      create: { skillCode: "grammar", kind: "GRAMMAR", label: grammar.title, grammarId: grammar.id, lessonId, levelCode: item.levelCode },
      update: {},
    });
  }
  await audit({ actorId: actor.id, action: "CONTENT_REUSED", entityType: "CONTENT", entityId: itemId, metadata: { lessonId, placement } });
  return usage;
}

export async function saveVocabulary(actor: SessionUser, lessonId: string, input: {
  word: string;
  meaning?: string | null;
  translation?: string | null;
  partOfSpeech?: string | null;
  exampleSentence?: string | null;
  exampleTranslation?: string | null;
  difficulty?: string | null;
  topic?: string | null;
  levelCode?: string | null;
  tags?: string | null;
  relatedWords?: string | null;
  synonyms?: string | null;
  antonyms?: string | null;
}) {
  await assertLessonEdit(actor, lessonId);
  const difficulty = validateDifficulty(input.difficulty);
  if (input.difficulty && !difficulty) throw new ApiError(400, "Choose a difficulty tag, not an academic level.");
  const word = sanitizeContent(input.word);
  if (word.length < 1) throw new ApiError(400, "Enter a word.");
  const row = await prisma.vocabulary.create({
    data: {
      lessonId,
      word,
      meaning: input.meaning ? sanitizeContent(input.meaning) : null,
      translation: input.translation ? sanitizeContent(input.translation) : null,
      partOfSpeech: input.partOfSpeech || null,
      exampleSentence: input.exampleSentence ? sanitizeContent(input.exampleSentence) : null,
      exampleTranslation: input.exampleTranslation ? sanitizeContent(input.exampleTranslation) : null,
      difficulty,
      topic: input.topic ? sanitizeContent(input.topic) : null,
      levelCode: input.levelCode || null,
      tags: input.tags ? sanitizeContent(input.tags) : null,
      relatedWords: input.relatedWords ? sanitizeContent(input.relatedWords) : null,
      synonyms: input.synonyms ? sanitizeContent(input.synonyms) : null,
      antonyms: input.antonyms ? sanitizeContent(input.antonyms) : null,
    },
  });
  await prisma.knowledgeItem.create({
    data: { skillCode: "vocabulary", kind: "VOCABULARY", label: row.word, vocabularyId: row.id, lessonId, levelCode: row.levelCode },
  });
  return row;
}

export async function saveGrammar(actor: SessionUser, lessonId: string, input: {
  title: string;
  explanation?: string | null;
  translation?: string | null;
  commonMistakes?: string | null;
  examples?: string | null;
  difficulty?: string | null;
  levelCode?: string | null;
}) {
  await assertLessonEdit(actor, lessonId);
  const title = sanitizeContent(input.title);
  if (title.length < 2) throw new ApiError(400, "Enter a grammar topic.");
  const row = await prisma.grammarContent.create({
    data: {
      lessonId,
      title,
      explanation: input.explanation ? sanitizeContent(input.explanation) : null,
      translation: input.translation ? sanitizeContent(input.translation) : null,
      commonMistakes: input.commonMistakes ? sanitizeContent(input.commonMistakes) : null,
      examples: input.examples ? sanitizeContent(input.examples) : null,
      difficulty: validateDifficulty(input.difficulty),
      levelCode: input.levelCode || null,
    },
  });
  await prisma.knowledgeItem.create({
    data: { skillCode: "grammar", kind: "GRAMMAR", label: row.title, grammarId: row.id, lessonId, levelCode: row.levelCode },
  });
  return row;
}

export async function contentAnalytics(resourceType: string, resourceId: string) {
  const [views, audio, replays, mistakes] = await Promise.all([
    prisma.contentMetric.count({ where: { resourceType, resourceId, eventType: "VIEW" } }),
    prisma.contentMetric.count({ where: { resourceType, resourceId, eventType: "AUDIO_PLAY" } }),
    prisma.contentMetric.count({ where: { resourceType, resourceId, eventType: "REPLAY" } }),
    prisma.contentMetric.count({ where: { resourceType, resourceId, eventType: "MISTAKE" } }),
  ]);
  const completions = resourceType === "LESSON"
    ? await prisma.lessonProgress.count({ where: { lessonId: resourceId, status: "COMPLETED" } })
    : 0;
  const practice = resourceType === "LESSON"
    ? await prisma.activityAttempt.count({ where: { activity: { lessonId: resourceId } } })
    : 0;
  const speaking = resourceType === "LESSON"
    ? await prisma.speechAttempt.count({ where: { session: { lessonId: resourceId } } })
    : 0;
  const listening = resourceType === "LESSON"
    ? await prisma.listeningAttempt.count({ where: { exercise: { lessonId: resourceId } } })
    : 0;
  return {
    views,
    completions,
    practiceAttempts: practice,
    speakingAttempts: speaking,
    listeningAttempts: listening,
    audioPlays: audio,
    replays,
    commonMistakes: mistakes,
    note: "Counts from stored events. This is not a ranking.",
  };
}

export async function recommendForStudent(studentId: string) {
  const due = await prisma.studentKnowledgeState.findMany({
    where: { studentId, state: { in: ["NEEDS_REVIEW", "LEARNING", "PRACTICING"] } },
    include: { item: { select: { label: true, lessonId: true, kind: true } } },
    take: 5,
    orderBy: { updatedAt: "desc" },
  });
  const { recommendationReason } = await import("./rules");
  return due.map((row) => ({
    label: row.item.label,
    kind: row.item.kind,
    lessonId: row.item.lessonId,
    state: row.state,
    reason: recommendationReason(row.state, row.item.label),
  }));
}
