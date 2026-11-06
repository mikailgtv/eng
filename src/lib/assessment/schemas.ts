/**
 * Zod schemas for question-bank CONFIGURATION and student ANSWERS.
 * Same philosophy as the practice engine: content is validated server-side,
 * students only ever send raw answers, and correctness is computed here.
 */
import { z } from "zod";
import { normalizeText } from "@/lib/activities/schemas";
import { DIFFICULTIES, SKILLS } from "./registry";

// ---------------------------------------------------------------------------
// Question configuration payloads (per type; MULTIPLE_CHOICE/LISTENING keep
// their options in QuestionOption rows, so only LISTENING needs media here)
// ---------------------------------------------------------------------------

export const trueFalseConfig = z.object({ answer: z.boolean() });

export const fillBlankConfig = z.object({
  /** Accepted answers — compared with normalizeText (not fuzzy). */
  acceptedAnswers: z.array(z.string().trim().min(1).max(80)).min(1).max(8),
});

export const matchingConfig = z
  .object({
    pairs: z
      .array(z.object({ left: z.string().trim().min(1).max(120), right: z.string().trim().min(1).max(120) }))
      .min(2)
      .max(8),
  })
  .refine((v) => {
    const lefts = new Set(v.pairs.map((p) => p.left));
    const rights = new Set(v.pairs.map((p) => p.right));
    return lefts.size === v.pairs.length && rights.size === v.pairs.length;
  }, "Matching pairs must be unique on both sides");

export const wordOrderConfig = z.object({
  words: z.array(z.string().trim().min(1).max(60)).min(2).max(12),
});

export const listeningConfig = z.object({
  /** Real audio file URL — listening questions are only created WITH audio. */
  audioUrl: z.string().min(1),
  /** Server-side only; used for grading fallbacks and accessibility. */
  transcript: z.string().trim().min(1).max(600),
});

/** READING / WRITING / SPEAKING — architecture placeholder, manual grading. */
export const manualConfig = z.object({
  prompt: z.string().trim().max(1000).optional(),
  modelAnswer: z.string().trim().max(1000).optional(),
});

// ---------------------------------------------------------------------------
// Student answers
// ---------------------------------------------------------------------------

export const choiceAnswer = z.object({ optionId: z.string().min(1) }).strict();
export const trueFalseAnswer = z.object({ value: z.boolean() }).strict();
export const fillBlankAnswer = z.object({ text: z.string().max(200) }).strict();
export const matchingAnswer = z
  .object({
    pairs: z
      .array(z.object({ left: z.string().min(1).max(120), right: z.string().min(1).max(120) }))
      .max(8)
      .default([]),
  })
  .strict();
export const wordOrderAnswer = z
  .object({ order: z.array(z.string().min(1).max(60)).max(16).default([]) })
  .strict();
/** Manual types accept text for now — never auto-graded. */
export const manualAnswer = z.object({ text: z.string().max(4000) }).strict();

export function answerSchemaFor(type: string) {
  switch (type) {
    case "MULTIPLE_CHOICE":
    case "LISTENING":
      return choiceAnswer;
    case "TRUE_FALSE":
      return trueFalseAnswer;
    case "FILL_BLANK":
      return fillBlankAnswer;
    case "MATCHING":
      return matchingAnswer;
    case "WORD_ORDER":
      return wordOrderAnswer;
    default:
      return manualAnswer;
  }
}

// ---------------------------------------------------------------------------
// Authoring payloads (teacher API)
// ---------------------------------------------------------------------------

export const questionOptionInput = z.object({
  text: z.string().trim().min(1).max(200),
  isCorrect: z.boolean().default(false),
});

export const questionInput = z
  .object({
    type: z.string().min(1),
    questionText: z.string().trim().min(1).max(1000),
    explanation: z.string().trim().max(1000).optional(),
    difficulty: z.enum(DIFFICULTIES).default("EASY"),
    points: z.number().int().min(1).max(100).default(1),
    skill: z.enum(SKILLS).optional(),
    levelId: z.string().trim().optional(),
    lessonId: z.string().trim().optional(),
    moduleId: z.string().trim().optional(),
    grammarConceptId: z.string().trim().optional(),
    vocabularyId: z.string().trim().optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
    configuration: z.unknown().optional(),
    options: z.array(questionOptionInput).max(6).optional(),
  })
  .strict();

export const assessmentInput = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(1000).optional(),
    type: z.string().min(1),
    courseId: z.string().trim().optional(),
    levelId: z.string().trim().optional(),
    moduleId: z.string().trim().optional(),
    durationMinutes: z.number().int().min(1).max(300).nullable().optional(),
    passingScore: z.number().int().min(1).max(100).default(70),
    maxAttempts: z.number().int().min(1).max(20).nullable().optional(),
    randomizeQuestions: z.boolean().default(false),
    randomizeOptions: z.boolean().default(false),
    showResults: z.boolean().default(true),
    showCorrectAnswers: z.boolean().default(true),
    allowNavigation: z.boolean().default(true),
    status: z.enum(["DRAFT", "SCHEDULED", "OPEN", "CLOSED", "ARCHIVED"]).default("DRAFT"),
    startAt: z.string().datetime({ offset: true }).nullable().optional(),
    endAt: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .strict();

export { normalizeText };
