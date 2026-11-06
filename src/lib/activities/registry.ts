/**
 * Activity type registry — the single place that lists supported activity
 * types. Adding a new type later = add an entry here + schemas + renderer.
 */
export const ACTIVITY_TYPES = [
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "FILL_BLANK",
  "MATCHING",
  "WORD_ORDER",
  "VOCABULARY_RECOGNITION",
  "LISTEN_AND_CHOOSE",
  "LISTEN_AND_TYPE",
  "SPEAKING_PROMPT",
  "FLASHCARD",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export function isActivityType(type: string): type is ActivityType {
  return (ACTIVITY_TYPES as readonly string[]).includes(type);
}

/** Whether attempts of this type are objectively scored (false = self-assessed). */
export function isScoredType(type: ActivityType): boolean {
  return type !== "SPEAKING_PROMPT" && type !== "FLASHCARD";
}

/** Types whose sanitized payload the client can self-check (by design). */
export const CLIENT_VISIBLE_ANSWER_TYPES: ActivityType[] = ["FLASHCARD"];

export const VOCAB_REVIEW_STATUSES = ["NEW", "LEARNING", "REVIEW", "MASTERED"] as const;
export type VocabReviewStatus = (typeof VOCAB_REVIEW_STATUSES)[number];

export const PARTS_OF_SPEECH = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "conjunction",
  "phrase",
] as const;

export const COMPLETION_RULES = {
  VIEW_ONLY: "VIEW_ONLY",
  VIEW_AND_REQUIRED_ACTIVITIES: "VIEW_AND_REQUIRED_ACTIVITIES",
  MIN_PRACTICE_SCORE: "MIN_PRACTICE_SCORE",
  TEACHER_APPROVAL: "TEACHER_APPROVAL",
} as const;
