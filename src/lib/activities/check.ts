/**
 * Server-side activity checking.
 *
 * The client NEVER sends correctness — it sends its raw answer, the server
 * validates the payload against the activity's configuration and computes
 * isCorrect + score here. Also strips correct answers from configurations
 * before they are sent to students (sanitizeForStudent).
 */
import { z } from "zod";
import {
  activityConfigSchema,
  activityAnswerSchema,
  normalizeText,
  matchingConfig,
  wordOrderConfig,
  multipleChoiceConfig,
  trueFalseConfig,
  fillBlankConfig,
  vocabularyRecognitionConfig,
  listenAndChooseConfig,
  listenAndTypeConfig,
  flashcardConfig,
  speakingPromptConfig,
  multipleChoiceAnswer,
  trueFalseAnswer,
  fillBlankAnswer,
  wordOrderAnswer,
  matchingAnswer,
  vocabularyRecognitionAnswer,
  listenAndChooseAnswer,
  listenAndTypeAnswer,
  speakingAnswer,
  flashcardAnswer,
} from "@/lib/activities/schemas";
import { shuffle } from "@/lib/utils-shuffle";
import type { ActivityType } from "@/lib/activities/registry";

type ConfigMap = z.infer<typeof activityConfigSchema>;
type AnswerMap = z.infer<typeof activityAnswerSchema>;

export type ParsedActivity = {
  type: ActivityType;
  config: ConfigMap[ActivityType];
};

export function parseConfiguration(type: string, configJson: string): ParsedActivity | null {
  const shape = activityConfigSchema.shape as unknown as Record<string, z.ZodTypeAny>;
  if (!(type in shape)) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(configJson);
  } catch {
    return null;
  }
  const result = shape[type].safeParse(raw);
  if (!result.success) return null;
  return { type: type as ActivityType, config: result.data as ConfigMap[ActivityType] };
}

/** The visible result the client renders after a submission. */
export type Feedback = {
  isCorrect: boolean | null;
  /** Correct answer / statement shown in the feedback (never sent before submit). */
  correctText: string | null;
  explanation: string | null;
};

/** Compute correctness for one submission. Throws ZodError on bad payloads. */
export function checkAnswer(
  type: ActivityType,
  config: ConfigMap[ActivityType],
  answer: unknown
): { feedback: Feedback; scoreRatio: number | null; validated: unknown } {
  switch (type) {
    case "MULTIPLE_CHOICE": {
      const c = config as z.infer<typeof multipleChoiceConfig>;
      const a = multipleChoiceAnswer.parse(answer);
      const correct = a.optionId === c.correctOptionId;
      const chosen = c.options.find((o) => o.id === c.correctOptionId);
      return {
        feedback: {
          isCorrect: correct,
          correctText: chosen?.text ?? null,
          explanation: c.explanation ?? null,
        },
        scoreRatio: correct ? 1 : 0,
        validated: a,
      };
    }

    case "TRUE_FALSE": {
      const c = config as z.infer<typeof trueFalseConfig>;
      const a = trueFalseAnswer.parse(answer);
      const correct = a.value === c.answer;
      return {
        feedback: {
          isCorrect: correct,
          correctText: c.answer ? "True" : "False",
          explanation: c.explanation ?? null,
        },
        scoreRatio: correct ? 1 : 0,
        validated: a,
      };
    }

    case "FILL_BLANK": {
      const c = config as z.infer<typeof fillBlankConfig>;
      const a = fillBlankAnswer.parse(answer);
      const normalized = normalizeText(a.text);
      const correct = c.acceptedAnswers.some((acc) => normalizeText(acc) === normalized);
      return {
        feedback: {
          isCorrect: correct,
          correctText: c.acceptedAnswers[0],
          explanation: c.explanation ?? null,
        },
        scoreRatio: correct ? 1 : 0,
        validated: a,
      };
    }

    case "WORD_ORDER": {
      const c = config as z.infer<typeof wordOrderConfig>;
      const a = wordOrderAnswer.parse(answer);
      const expected = [...c.words];
      const correct =
        a.order.length === expected.length && a.order.every((w, i) => w === expected[i]);
      return {
        feedback: {
          isCorrect: correct,
          correctText: expected.join(" "),
          explanation: c.explanation ?? null,
        },
        scoreRatio: correct ? 1 : 0,
        validated: a,
      };
    }

    case "MATCHING": {
      const c = config as z.infer<typeof matchingConfig>;
      const a = matchingAnswer.parse(answer);
      const rightByLeft = new Map(c.pairs.map((p) => [p.left, p.right]));
      const answered = a.pairs.filter((p) => rightByLeft.has(p.left));
      const correctPairs = answered.filter((p) => rightByLeft.get(p.left) === p.right).length;
      const allCorrect = correctPairs === c.pairs.length && answered.length === c.pairs.length;
      const ratio = c.pairs.length === 0 ? 0 : correctPairs / c.pairs.length;
      const wrong = a.pairs.filter((p) => rightByLeft.get(p.left) !== p.right);
      const firstWrong = wrong[0];
      return {
        feedback: {
          isCorrect: allCorrect,
          correctText: allCorrect
            ? null
            : firstWrong
              ? `${firstWrong.left} → ${rightByLeft.get(firstWrong.left)}`
              : null,
          explanation: null,
        },
        scoreRatio: ratio,
        validated: a,
      };
    }

    case "VOCABULARY_RECOGNITION": {
      const c = config as z.infer<typeof vocabularyRecognitionConfig>;
      const a = vocabularyRecognitionAnswer.parse(answer);
      const correct = a.optionId === c.correctOptionId;
      const chosen = c.options.find((o) => o.id === c.correctOptionId);
      return {
        feedback: {
          isCorrect: correct,
          correctText: chosen?.text ?? null,
          explanation: c.explanation ?? null,
        },
        scoreRatio: correct ? 1 : 0,
        validated: a,
      };
    }

    case "LISTEN_AND_CHOOSE": {
      const c = config as z.infer<typeof listenAndChooseConfig>;
      const a = listenAndChooseAnswer.parse(answer);
      const correct = a.optionId === c.correctOptionId;
      const chosen = c.options.find((o) => o.id === c.correctOptionId);
      return {
        feedback: {
          isCorrect: correct,
          correctText: chosen?.text ?? null,
          explanation: c.explanation ?? null,
        },
        scoreRatio: correct ? 1 : 0,
        validated: a,
      };
    }

    case "LISTEN_AND_TYPE": {
      const c = config as z.infer<typeof listenAndTypeConfig>;
      const a = listenAndTypeAnswer.parse(answer);
      const correct = normalizeText(a.text) === normalizeText(c.transcript);
      return {
        feedback: {
          isCorrect: correct,
          correctText: c.transcript,
          explanation: c.explanation ?? null,
        },
        scoreRatio: correct ? 1 : 0,
        validated: a,
      };
    }

    case "SPEAKING_PROMPT": {
      // Self-reported practice — never claim correctness without speech analysis.
      const a = speakingAnswer.parse(answer);
      return {
        feedback: {
          isCorrect: null,
          correctText: null,
          explanation: "Nice practice! Pronunciation feedback arrives in a later phase.",
        },
        scoreRatio: null,
        validated: a,
      };
    }

    case "FLASHCARD": {
      // Self-assessment — correctness is not claimed; review state is updated
      // separately by the vocabulary-review logic.
      const a = flashcardAnswer.parse(answer);
      return {
        feedback: { isCorrect: null, correctText: null, explanation: null },
        scoreRatio: null,
        validated: a,
      };
    }

    default:
      throw new Error(`Unsupported activity type: ${type as string}`);
  }
}

// ---------------------------------------------------------------------------
// Student-safe configuration (strip answers)
// ---------------------------------------------------------------------------

export type SanitizedActivity = {
  id: string;
  type: ActivityType;
  title: string | null;
  instructions: string | null;
  order: number;
  points: number;
  required: boolean;
  config: unknown;
  /** Vocabulary ids linked to this activity (used by flashcard/review flows). */
  vocabularyIds: string[];
};

export function sanitizeForStudent(
  activity: { id: string; type: string; title: string | null; instructions: string | null; order: number; points: number; required: boolean; configuration: string },
  vocabularyIds: string[]
): SanitizedActivity | null {
  const parsed = parseConfiguration(activity.type, activity.configuration);
  if (!parsed) return null;
  const c = parsed.config as Record<string, unknown>;

  let safeConfig: unknown;
  switch (parsed.type) {
    case "MULTIPLE_CHOICE":
      safeConfig = {
        question: c.question,
        options: shuffle(c.options as { id: string; text: string }[]),
      };
      break;
    case "TRUE_FALSE":
      safeConfig = { statement: c.statement };
      break;
    case "FILL_BLANK":
      safeConfig = {
        sentenceWithBlank: c.sentenceWithBlank,
        options: Array.isArray(c.options) ? shuffle(c.options as string[]) : undefined,
      };
      break;
    case "MATCHING": {
      const pairs = c.pairs as { left: string; right: string }[];
      safeConfig = {
        instruction: c.instruction,
        lefts: shuffle(pairs.map((p) => p.left)),
        rights: shuffle(pairs.map((p) => p.right)),
      };
      break;
    }
    case "WORD_ORDER": {
      const tokens = [
        ...(c.words as string[]),
        ...((c.extraWords as string[]) ?? []),
      ];
      safeConfig = { tokens: shuffle(tokens) };
      break;
    }
    case "VOCABULARY_RECOGNITION":
      safeConfig = {
        mode: c.mode,
        prompt: c.prompt,
        options: shuffle(c.options as { id: string; text: string }[]),
      };
      break;
    case "LISTEN_AND_CHOOSE":
      safeConfig = {
        audioUrl: c.audioUrl,
        transcript: c.transcript, // used only via the explicit "show text" fallback
        question: c.question,
        options: shuffle(c.options as { id: string; text: string }[]),
      };
      break;
    case "LISTEN_AND_TYPE":
      safeConfig = { audioUrl: c.audioUrl }; // transcript IS the answer — stripped
      break;
    case "SPEAKING_PROMPT":
      safeConfig = { text: c.text, tip: c.tip, modelAudioUrl: c.modelAudioUrl, translation: c.translation };
      break;
    case "FLASHCARD":
      safeConfig = { items: (c.items as unknown[]).map((it) => it) }; // reveals by design
      break;
    default:
      return null;
  }

  return {
    id: activity.id,
    type: parsed.type,
    title: activity.title,
    instructions: activity.instructions,
    order: activity.order,
    points: activity.points,
    required: activity.required,
    config: safeConfig,
    vocabularyIds,
  };
}
