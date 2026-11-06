/**
 * Server-side learning context. Never accepts a client student id or level.
 * Omits passwords, tokens, employee codes, emails, and teacher notes.
 */
import { prisma } from "@/lib/prisma";
import { parseBlock } from "@/lib/blocks";
import { stripIdentitySecrets } from "@/lib/identity/privacy";
import type { LearningContext, MistakeItem, VocabItem } from "./types";

export async function buildLearningContext(studentId: string, lessonId?: string | null): Promise<LearningContext> {
  const student = await prisma.user.findUnique({
    where: { id: studentId },
    select: { id: true, firstName: true, englishLevel: true, groupId: true, role: true },
  });
  if (!student || student.role !== "STUDENT") {
    return blank("Student");
  }

  const course = student.groupId
    ? await prisma.course.findFirst({
        where: { status: "PUBLISHED", assignments: { some: { groupId: student.groupId } }, level: { status: "ACTIVE" } },
        select: {
          title: true,
          modules: {
            where: { status: "PUBLISHED" },
            orderBy: { order: "asc" },
            select: {
              title: true,
              lessons: {
                where: { status: "PUBLISHED" },
                orderBy: { order: "asc" },
                select: { id: true, title: true, blocks: { orderBy: { order: "asc" }, take: 4 } },
              },
            },
          },
        },
      })
    : null;

  const lessons = course?.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleTitle: m.title }))) ?? [];
  const progress = lessons.length
    ? await prisma.lessonProgress.findMany({
        where: { studentId, lessonId: { in: lessons.map((l) => l.id) }, status: "COMPLETED" },
        select: { lessonId: true },
      })
    : [];
  const done = new Set(progress.map((p) => p.lessonId));
  const requested = lessonId ? lessons.find((l) => l.id === lessonId) : null;
  const current = requested ?? lessons.find((l) => !done.has(l.id)) ?? lessons[0] ?? null;

  const vocabRows = current
    ? await prisma.vocabulary.findMany({
        where: { lessonId: current.id },
        orderBy: { order: "asc" },
        take: 8,
        select: { word: true, translation: true, phonetic: true, pronunciation: true, exampleSentence: true },
      })
    : [];
  const vocabulary: VocabItem[] = vocabRows.map((row) => ({
    word: row.word,
    translation: row.translation,
    phonetic: row.phonetic || row.pronunciation,
    example: row.exampleSentence,
    source: "current",
  }));

  const grammarRows = current
    ? await prisma.grammarContent.findMany({
        where: { lessonId: current.id },
        take: 2,
        select: { title: true, explanation: true, patterns: true },
      })
    : [];

  const wrong = await prisma.activityAttempt.findMany({
    where: { studentId, isCorrect: false },
    orderBy: { submittedAt: "desc" },
    take: 12,
    select: { activity: { select: { title: true, lesson: { select: { id: true, title: true } } } } },
  });
  const mistakeMap = new Map<string, MistakeItem>();
  for (const row of wrong) {
    const topic = row.activity.title || row.activity.lesson.title;
    const existing = mistakeMap.get(topic);
    if (existing) existing.count += 1;
    else mistakeMap.set(topic, { topic, count: 1, lessonTitle: row.activity.lesson.title, lessonId: row.activity.lesson.id });
  }
  const mistakes = [...mistakeMap.values()].sort((a, b) => b.count - a.count).slice(0, 3);

  const excerpt = current ? excerptFromBlocks(current.blocks) : null;
  const recommendation = mistakes[0]
    ? `Review ${mistakes[0].lessonTitle ?? mistakes[0].topic}.`
    : current && !done.has(current.id)
      ? `Continue ${current.title}.`
      : null;

  const safe = {
    firstName: student.firstName,
    level: student.englishLevel || "PRE_A1",
    courseTitle: course?.title ?? null,
    moduleTitle: current?.moduleTitle ?? null,
    lessonId: current?.id ?? null,
    lessonTitle: current?.title ?? null,
    lessonExcerpt: excerpt,
    vocabulary,
    grammar: grammarRows.map((g) => ({
      title: g.title,
      explanation: g.explanation,
      patterns: parseStringList(g.patterns),
    })),
    mistakes,
    completedLessonTitles: lessons.filter((l) => done.has(l.id)).map((l) => l.title).slice(0, 6),
    recommendation,
    adaptiveNote: await adaptiveNote(student.id),
  };
  return stripIdentitySecrets(safe);
}

function blank(firstName: string): LearningContext {
  return {
    firstName,
    level: "PRE_A1",
    courseTitle: null,
    moduleTitle: null,
    lessonId: null,
    lessonTitle: null,
    lessonExcerpt: null,
    vocabulary: [],
    grammar: [],
    mistakes: [],
    completedLessonTitles: [],
    recommendation: null,
  };
}

async function adaptiveNote(studentId: string) {
  try {
    const { tutorAdaptiveNote } = await import("@/lib/adaptive/read");
    return await tutorAdaptiveNote(studentId);
  } catch {
    return null;
  }
}

function excerptFromBlocks(blocks: { type: string; data: string }[]): string | null {
  const parts: string[] = [];
  for (const block of blocks) {
    const parsed = parseBlock(block.type, block.data);
    if (parsed.kind !== "ok") continue;
    const data = parsed.data as { text?: string; title?: string };
    if (data.text) parts.push(data.text);
    else if (data.title) parts.push(data.title);
    if (parts.join(" ").length > 320) break;
  }
  const text = parts.join(" ").slice(0, 360);
  return text || null;
}

function parseStringList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string").slice(0, 4) : [];
  } catch {
    return [];
  }
}

export function contextForProvider(context: LearningContext): string {
  const lines = [
    `Level: ${context.level}`,
    context.courseTitle ? `Course: ${context.courseTitle}` : "Course: none",
    context.lessonTitle ? `Current lesson: ${context.lessonTitle}` : "Current lesson: none",
    context.lessonExcerpt ? `Lesson text: ${context.lessonExcerpt}` : "",
    context.vocabulary.length ? `Vocabulary: ${context.vocabulary.map((v) => v.word).join(", ")}` : "Vocabulary: none stored",
    context.grammar.length ? `Grammar: ${context.grammar.map((g) => g.title).join(", ")}` : "Grammar: none stored",
    context.mistakes.length ? `Recent practice misses: ${context.mistakes.map((m) => `${m.topic} (${m.count})`).join("; ")}` : "Recent practice misses: none stored",
    context.adaptiveNote ? `Adaptive note: ${context.adaptiveNote}` : "",
  ];
  return lines.filter(Boolean).join("\n").slice(0, 1400);
}
