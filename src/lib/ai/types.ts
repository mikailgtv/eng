/** Shared tutor types. The client never supplies level or student id. */

export const AI_MODES = [
  "CONVERSATION",
  "VOCABULARY",
  "GRAMMAR",
  "LESSON_HELP",
  "MISTAKE_REVIEW",
  "QUIZ",
  "FREE",
] as const;

export type AiMode = (typeof AI_MODES)[number];

export const AI_DIFFICULTIES = ["EASY", "NORMAL", "CHALLENGE"] as const;
export type AiDifficulty = (typeof AI_DIFFICULTIES)[number];

export type VocabItem = {
  word: string;
  translation: string | null;
  phonetic: string | null;
  example: string | null;
  source: "current" | "review" | "incorrect";
};

export type GrammarItem = {
  title: string;
  explanation: string | null;
  patterns: string[];
};

export type MistakeItem = {
  topic: string;
  count: number;
  lessonTitle: string | null;
  lessonId: string | null;
};

/** Concise educational context. No passwords, tokens, notes, or employee codes. */
export type LearningContext = {
  firstName: string;
  level: string;
  courseTitle: string | null;
  moduleTitle: string | null;
  lessonId: string | null;
  lessonTitle: string | null;
  lessonExcerpt: string | null;
  vocabulary: VocabItem[];
  grammar: GrammarItem[];
  mistakes: MistakeItem[];
  completedLessonTitles: string[];
  recommendation: string | null;
  /** Observed review note for the tutor. Optional so older callers stay valid. */
  adaptiveNote?: string | null;
};

export type TutorState = {
  vocabIndex: number;
  quizIndex: number;
  quizTotal: number;
  corrections: number;
  vocabPracticed: string[];
  grammarTopic: string | null;
  warnedChallenge: boolean;
};

export type TutorTurn = {
  text: string;
  translation?: string | null;
  correction?: { type: string; say: string } | null;
  metadata: Record<string, unknown>;
  nextState: TutorState;
  generated?: { kind: string; prompt: string; answer: string | null }[];
  provider: string;
};

export function emptyState(): TutorState {
  return {
    vocabIndex: 0,
    quizIndex: 0,
    quizTotal: 5,
    corrections: 0,
    vocabPracticed: [],
    grammarTopic: null,
    warnedChallenge: false,
  };
}

export function parseState(raw: string | null | undefined): TutorState {
  if (!raw) return emptyState();
  try {
    const parsed = JSON.parse(raw) as Partial<TutorState>;
    return { ...emptyState(), ...parsed, vocabPracticed: parsed.vocabPracticed ?? [] };
  } catch {
    return emptyState();
  }
}
