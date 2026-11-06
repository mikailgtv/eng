/**
 * Lesson content-block payload schemas.
 *
 * Blocks are stored as a (type, JSON string) pair in the database so the
 * schema stays portable. This module is the single place that knows each
 * block type's shape: it validates payloads at render time — an invalid or
 * unknown block is skipped (and logged) instead of crashing the lesson page.
 */
import { z } from "zod";
import type { ContentBlockType } from "@/lib/constants";

export const textBlockSchema = z.object({
  text: z.string().min(1),
  translation: z.string().optional(),
  note: z.string().optional(),
});

export const headingBlockSchema = z.object({
  text: z.string().min(1),
  level: z.union([z.literal(2), z.literal(3)]).optional(),
});

export const imageBlockSchema = z.object({
  url: z.string().min(1),
  alt: z.string().min(1, "Images require alt text (accessibility)."),
  caption: z.string().optional(),
});

export const exampleBlockSchema = z.object({
  /** Each example: the English sentence + optional beginner-language note. */
  items: z.array(z.object({ text: z.string().min(1), note: z.string().optional() })).min(1),
  intro: z.string().optional(),
});

/** Embedded vocabulary variant — standalone rows normally live in the
 *  Vocabulary table; this block type lets future teacher authoring embed
 *  items directly inside the content flow. */
export const vocabularyBlockSchema = z.object({
  intro: z.string().optional(),
  items: z
    .array(
      z.object({
        word: z.string().min(1),
        translation: z.string().optional(),
        phonetic: z.string().optional(),
        pronunciation: z.string().optional(),
        example: z.string().optional(),
        audioUrl: z.string().optional(),
      })
    )
    .optional(),
});

export const grammarBlockSchema = z.object({
  title: z.string().min(1),
  explanation: z.string().optional(),
  patterns: z.array(z.string().min(1)).optional(),
  examples: z.array(z.string().min(1)).optional(),
});

const mediaUrl = z
  .string()
  .min(1)
  .refine((v) => v.startsWith("/") || z.string().url().safeParse(v).success, "Use a site path or a full URL.");

export const audioBlockSchema = z.object({
  url: mediaUrl,
  title: z.string().optional(),
});

export const videoBlockSchema = z.object({
  url: mediaUrl,
  title: z.string().optional(),
});

export const tipBlockSchema = z.object({
  text: z.string().min(1),
});

export const warningBlockSchema = z.object({
  text: z.string().min(1),
});

/** Practice item: shown in the "Practice" section of a lesson. */
export const questionBlockSchema = z.object({
  prompt: z.string().min(1),
  hint: z.string().optional(),
  answer: z.string().min(1),
});

const line = z.object({ speaker: z.string().min(1), text: z.string().min(1), translation: z.string().optional() });

export const dialogueBlockSchema = z.object({ lines: z.array(line).min(1) });
export const translationBlockSchema = z.object({ text: z.string().min(1), translation: z.string().min(1) });
export const exerciseBlockSchema = z.object({ prompt: z.string().min(1), answer: z.string().min(1) });
export const multipleChoiceBlockSchema = z.object({
  prompt: z.string().min(1),
  options: z.array(z.string().min(1)).min(2),
  answer: z.string().min(1),
});
export const trueFalseBlockSchema = z.object({ prompt: z.string().min(1), answer: z.boolean() });
export const fillBlankBlockSchema = z.object({ prompt: z.string().min(1), answer: z.string().min(1) });
export const matchingBlockSchema = z.object({ pairs: z.array(z.object({ left: z.string().min(1), right: z.string().min(1) })).min(1) });
export const wordOrderBlockSchema = z.object({ words: z.array(z.string().min(1)).min(2), answer: z.string().min(1) });
export const listeningBlockSchema = z.object({ title: z.string().optional(), transcript: z.string().optional(), audioUrl: z.string().optional() });
export const speakingBlockSchema = z.object({ prompt: z.string().min(1) });
export const readingBlockSchema = z.object({ title: z.string().min(1), text: z.string().min(1), translation: z.string().optional() });
export const writingBlockSchema = z.object({ prompt: z.string().min(1) });
export const flashcardBlockSchema = z.object({ cards: z.array(z.object({ front: z.string().min(1), back: z.string().min(1) })).min(1) });
export const aiPracticeBlockSchema = z.object({ prompt: z.string().min(1), label: z.string().optional() });
export const teacherNoteBlockSchema = z.object({ text: z.string().min(1) });

const SCHEMAS = {
  TEXT: textBlockSchema,
  HEADING: headingBlockSchema,
  IMAGE: imageBlockSchema,
  EXAMPLE: exampleBlockSchema,
  VOCABULARY: vocabularyBlockSchema,
  GRAMMAR: grammarBlockSchema,
  AUDIO: audioBlockSchema,
  VIDEO: videoBlockSchema,
  TIP: tipBlockSchema,
  WARNING: warningBlockSchema,
  QUESTION: questionBlockSchema,
  DIALOGUE: dialogueBlockSchema,
  TRANSLATION: translationBlockSchema,
  EXERCISE: exerciseBlockSchema,
  MULTIPLE_CHOICE: multipleChoiceBlockSchema,
  TRUE_FALSE: trueFalseBlockSchema,
  FILL_BLANK: fillBlankBlockSchema,
  MATCHING: matchingBlockSchema,
  WORD_ORDER: wordOrderBlockSchema,
  LISTENING: listeningBlockSchema,
  SPEAKING: speakingBlockSchema,
  READING: readingBlockSchema,
  WRITING: writingBlockSchema,
  FLASHCARDS: flashcardBlockSchema,
  AI_PRACTICE: aiPracticeBlockSchema,
  TEACHER_NOTE: teacherNoteBlockSchema,
} satisfies Record<ContentBlockType, z.ZodTypeAny>;

export type BlockDataMap = {
  TEXT: z.infer<typeof textBlockSchema>;
  HEADING: z.infer<typeof headingBlockSchema>;
  IMAGE: z.infer<typeof imageBlockSchema>;
  EXAMPLE: z.infer<typeof exampleBlockSchema>;
  VOCABULARY: z.infer<typeof vocabularyBlockSchema>;
  GRAMMAR: z.infer<typeof grammarBlockSchema>;
  AUDIO: z.infer<typeof audioBlockSchema>;
  VIDEO: z.infer<typeof videoBlockSchema>;
  TIP: z.infer<typeof tipBlockSchema>;
  WARNING: z.infer<typeof warningBlockSchema>;
  QUESTION: z.infer<typeof questionBlockSchema>;
  DIALOGUE: z.infer<typeof dialogueBlockSchema>;
  TRANSLATION: z.infer<typeof translationBlockSchema>;
  EXERCISE: z.infer<typeof exerciseBlockSchema>;
  MULTIPLE_CHOICE: z.infer<typeof multipleChoiceBlockSchema>;
  TRUE_FALSE: z.infer<typeof trueFalseBlockSchema>;
  FILL_BLANK: z.infer<typeof fillBlankBlockSchema>;
  MATCHING: z.infer<typeof matchingBlockSchema>;
  WORD_ORDER: z.infer<typeof wordOrderBlockSchema>;
  LISTENING: z.infer<typeof listeningBlockSchema>;
  SPEAKING: z.infer<typeof speakingBlockSchema>;
  READING: z.infer<typeof readingBlockSchema>;
  WRITING: z.infer<typeof writingBlockSchema>;
  FLASHCARDS: z.infer<typeof flashcardBlockSchema>;
  AI_PRACTICE: z.infer<typeof aiPracticeBlockSchema>;
  TEACHER_NOTE: z.infer<typeof teacherNoteBlockSchema>;
};

export type ParsedBlock =
  | { kind: "ok"; type: ContentBlockType; data: BlockDataMap[ContentBlockType] }
  | { kind: "invalid"; type: string; error: string };

/** Parse and validate one block's JSON payload against its type schema. */
export function parseBlock(type: string, dataJson: string): ParsedBlock {
  const schema = SCHEMAS[type as ContentBlockType];
  if (!schema) return { kind: "invalid", type, error: "Unknown block type" };
  let raw: unknown;
  try {
    raw = JSON.parse(dataJson);
  } catch {
    return { kind: "invalid", type, error: "Block payload is not valid JSON" };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    return { kind: "invalid", type, error: result.error.issues[0]?.message ?? "Invalid block payload" };
  }
  return { kind: "ok", type: type as ContentBlockType, data: result.data };
}
