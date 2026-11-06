/**
 * Zod schemas for every activity type's CONFIGURATION (authored content) and
 * ANSWER (student submission). One place validates both — server-side for
 * every submission, and the seed uses the same schemas at write time.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Shared pieces
// ---------------------------------------------------------------------------

const optionSchema = z.object({
  id: z.string().min(1).max(40),
  text: z.string().min(1).max(200),
});

const explanationField = z.string().trim().max(500).optional();

// ---------------------------------------------------------------------------
// Configurations (authored content)
// ---------------------------------------------------------------------------

export const multipleChoiceConfig = z
  .object({
    question: z.string().trim().min(1).max(400),
    options: z.array(optionSchema).min(2).max(6),
    correctOptionId: z.string().min(1),
    explanation: explanationField,
  })
  .superRefine((v, ctx) => {
    if (!v.options.some((o) => o.id === v.correctOptionId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "correctOptionId must match one option" });
    }
  });

export const trueFalseConfig = z.object({
  statement: z.string().trim().min(1).max(400),
  answer: z.boolean(),
  explanation: explanationField,
});

export const fillBlankConfig = z
  .object({
    /** Sentence containing "___" as the blank. */
    sentenceWithBlank: z.string().trim().min(1).max(400).refine((v) => v.includes("___"), {
      message: "sentenceWithBlank must contain ___",
    }),
    /** Accepted answers (normalized comparison: case/whitespace-insensitive). */
    acceptedAnswers: z.array(z.string().trim().min(1).max(80)).min(1).max(8),
    /** Optional choices — when present the UI renders a choice list. */
    options: z.array(z.string().trim().min(1).max(80)).max(8).optional(),
    explanation: explanationField,
  });

export const matchingConfig = z
  .object({
    pairs: z
      .array(z.object({ left: z.string().trim().min(1).max(120), right: z.string().trim().min(1).max(120) }))
      .min(2)
      .max(8),
    instruction: z.string().trim().max(200).optional(),
  })
  .refine((v) => {
    const lefts = new Set(v.pairs.map((p) => p.left));
    const rights = new Set(v.pairs.map((p) => p.right));
    return lefts.size === v.pairs.length && rights.size === v.pairs.length;
  }, "Matching pairs must be unique on both sides");

export const wordOrderConfig = z.object({
  /** Correct order of tokens. */
  words: z.array(z.string().trim().min(1).max(60)).min(2).max(12),
  /** Optional extra distractor tokens. */
  extraWords: z.array(z.string().trim().min(1).max(60)).max(4).optional(),
  explanation: explanationField,
});

export const vocabularyRecognitionConfig = z
  .object({
    /** WORD_TO_MEANING shows the word; MEANING_TO_WORD shows the translation. */
    mode: z.enum(["WORD_TO_MEANING", "MEANING_TO_WORD"]),
    prompt: z.string().trim().min(1).max(200),
    options: z.array(optionSchema).min(2).max(6),
    correctOptionId: z.string().min(1),
    explanation: explanationField,
  })
  .superRefine((v, ctx) => {
    if (!v.options.some((o) => o.id === v.correctOptionId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "correctOptionId must match one option" });
    }
  });

export const listenAndChooseConfig = z
  .object({
    /** Real audio file URL. Listening activities are only seeded WITH audio. */
    audioUrl: z.string().min(1),
    /** Used only for the explicit "show text instead" accessibility fallback. */
    transcript: z.string().trim().min(1).max(600),
    question: z.string().trim().min(1).max(400),
    options: z.array(optionSchema).min(2).max(6),
    correctOptionId: z.string().min(1),
    explanation: explanationField,
  })
  .superRefine((v, ctx) => {
    if (!v.options.some((o) => o.id === v.correctOptionId)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "correctOptionId must match one option" });
    }
  });

export const listenAndTypeConfig = z.object({
  audioUrl: z.string().min(1),
  /** The sentence to type — this IS the answer, never sent to the client. */
  transcript: z.string().trim().min(1).max(300),
  explanation: explanationField,
});

export const speakingPromptConfig = z.object({
  /** The sentence the student should say. */
  text: z.string().trim().min(1).max(300),
  tip: z.string().trim().max(300).optional(),
  /** Optional model pronunciation (never required). */
  modelAudioUrl: z.string().optional(),
  translation: z.string().trim().max(200).optional(),
});

export const flashcardItemSchema = z.object({
  /** Linked vocabulary row when the cards come from the lesson vocabulary. */
  vocabularyId: z.string().optional(),
  word: z.string().trim().min(1).max(120),
  translation: z.string().trim().max(200).optional(),
  phonetic: z.string().trim().max(80).optional(),
  example: z.string().trim().max(300).optional(),
});

export const flashcardConfig = z.object({
  items: z.array(flashcardItemSchema).min(1).max(20),
});

export const activityConfigSchema = z.object({
  MULTIPLE_CHOICE: multipleChoiceConfig,
  TRUE_FALSE: trueFalseConfig,
  FILL_BLANK: fillBlankConfig,
  MATCHING: matchingConfig,
  WORD_ORDER: wordOrderConfig,
  VOCABULARY_RECOGNITION: vocabularyRecognitionConfig,
  LISTEN_AND_CHOOSE: listenAndChooseConfig,
  LISTEN_AND_TYPE: listenAndTypeConfig,
  SPEAKING_PROMPT: speakingPromptConfig,
  FLASHCARD: flashcardConfig,
});

// ---------------------------------------------------------------------------
// Answers (student submissions)
// ---------------------------------------------------------------------------

export const multipleChoiceAnswer = z.object({ optionId: z.string().min(1) }).strict();
export const trueFalseAnswer = z.object({ value: z.boolean() }).strict();
export const fillBlankAnswer = z.object({ text: z.string().max(120) }).strict();
export const wordOrderAnswer = z
  .object({ order: z.array(z.string().min(1).max(60)).min(2).max(16) })
  .strict();
export const matchingAnswer = z
  .object({
    pairs: z.array(z.object({ left: z.string().min(1).max(120), right: z.string().min(1).max(120) })).min(1).max(8),
  })
  .strict();
export const vocabularyRecognitionAnswer = z.object({ optionId: z.string().min(1) }).strict();
export const listenAndChooseAnswer = z.object({ optionId: z.string().min(1) }).strict();
export const listenAndTypeAnswer = z.object({ text: z.string().max(300) }).strict();
/** Self-reported practice; recordings come in a later phase. */
export const speakingAnswer = z
  .object({ selfReported: z.literal(true), recordingUrl: z.string().optional() })
  .strict();
export const flashcardAnswer = z
  .object({
    marks: z
      .array(
        z.object({
          word: z.string().min(1),
          vocabularyId: z.string().optional(),
          response: z.enum(["KNOWN", "NEED_REVIEW"]),
        })
      )
      .min(1)
      .max(20),
  })
  .strict();

export const activityAnswerSchema = z.object({
  MULTIPLE_CHOICE: multipleChoiceAnswer,
  TRUE_FALSE: trueFalseAnswer,
  FILL_BLANK: fillBlankAnswer,
  MATCHING: matchingAnswer,
  WORD_ORDER: wordOrderAnswer,
  VOCABULARY_RECOGNITION: vocabularyRecognitionAnswer,
  LISTEN_AND_CHOOSE: listenAndChooseAnswer,
  LISTEN_AND_TYPE: listenAndTypeAnswer,
  SPEAKING_PROMPT: speakingAnswer,
  FLASHCARD: flashcardAnswer,
});

/** Normalization for typed answers: case-, spacing- and punctuation-insensitive
 *  but NOT fuzzy — "am" and "AM" match, "an" does not match "am". */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.!?,;:]+$/g, "")
    .trim();
}
