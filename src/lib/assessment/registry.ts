/**
 * Assessment engine registry — quizzes & exams.
 *
 * Clear separation (never mixed):
 *   PRACTICE → Phase-3 activity engine (learning, unlimited, low stakes)
 *   QUIZ     → short assessment connected to a lesson/module/course
 *   EXAM     → formal assessment with strict rules
 *
 * PRACTICE is deliberately absent from Assessment.type: practice records live
 * in activity_attempts and are never merged with quiz/exam results.
 */

export const ASSESSMENT_TYPES = ["QUIZ", "EXAM"] as const;
export type AssessmentType = (typeof ASSESSMENT_TYPES)[number];
export function isAssessmentType(v: string): v is AssessmentType {
  return (ASSESSMENT_TYPES as readonly string[]).includes(v);
}

/** Phase 17 types. They are not accepted by the Phase 4 create route. */
export const INTELLIGENCE_ASSESSMENT_TYPES = ["DIAGNOSTIC", "PLACEMENT", "FINAL", "SPEAKING", "WRITING"] as const;
export type IntelligenceAssessmentType = (typeof INTELLIGENCE_ASSESSMENT_TYPES)[number];
export const ALL_ASSESSMENT_TYPES = [...ASSESSMENT_TYPES, ...INTELLIGENCE_ASSESSMENT_TYPES] as const;

export function isKnownAssessmentType(v: string): boolean {
  return (ALL_ASSESSMENT_TYPES as readonly string[]).includes(v);
}

/** Official scored work. Diagnostic, placement, and practice are not included. */
export function isOfficialAssessmentType(type: string): boolean {
  return type === "EXAM" || type === "FINAL";
}

export function assessmentTypeLabel(type: string): string {
  switch (type) {
    case "QUIZ": return "Quiz";
    case "EXAM": return "Official exam";
    case "DIAGNOSTIC": return "Diagnostic test";
    case "PLACEMENT": return "Placement test";
    case "FINAL": return "Final assessment";
    case "SPEAKING": return "Speaking assessment";
    case "WRITING": return "Writing assessment";
    default: return type;
  }
}

export const QUESTION_REVIEW_STATES = ["DRAFT", "REVIEW", "APPROVED", "PUBLISHED", "RETIRED"] as const;
export const PLACEMENT_LEVELS = ["PRE_A1", "A1", "A2", "B1", "B2", "C1"] as const;
export const MIN_ITEM_SAMPLE = 10;
export const MIN_RELIABLE_SAMPLE = 30;

export const ASSESSMENT_STATUSES = ["DRAFT", "SCHEDULED", "OPEN", "CLOSED", "ARCHIVED"] as const;
export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number];

export const QUESTION_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type QuestionStatus = (typeof QUESTION_STATUSES)[number];

export const QUESTION_TYPES = [
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "FILL_BLANK",
  "MATCHING",
  "WORD_ORDER",
  "LISTENING",
  // Architecture-ready, auto-grading NOT implemented (flagged for manual review)
  "READING",
  "WRITING",
  "SPEAKING",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];
export function isQuestionType(v: string): v is QuestionType {
  return (QUESTION_TYPES as readonly string[]).includes(v);
}

/** Types the server can grade automatically today. */
export const AUTO_GRADABLE_TYPES = new Set<QuestionType>([
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "FILL_BLANK",
  "MATCHING",
  "WORD_ORDER",
  "LISTENING",
]);

export function isAutoGradable(type: string): boolean {
  return AUTO_GRADABLE_TYPES.has(type as QuestionType);
}

/** Option-based types render QuestionOption rows (shuffled per attempt setting). */
export const OPTION_TYPES = new Set<QuestionType>(["MULTIPLE_CHOICE", "LISTENING"]);

export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const SKILLS = ["VOCABULARY", "GRAMMAR", "READING", "LISTENING", "SPEAKING", "WRITING"] as const;
export type Skill = (typeof SKILLS)[number];

export const ATTEMPT_STATUSES = ["IN_PROGRESS", "SUBMITTED", "GRADED", "EXPIRED"] as const;
export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];

/** Student-facing labels — plain, beginner-friendly English. */
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: "Multiple choice",
  TRUE_FALSE: "True or false",
  FILL_BLANK: "Fill the blank",
  MATCHING: "Matching",
  WORD_ORDER: "Word order",
  LISTENING: "Listening",
  READING: "Reading",
  WRITING: "Writing",
  SPEAKING: "Speaking",
};

export const SKILL_LABELS: Record<Skill, string> = {
  VOCABULARY: "Vocabulary",
  GRAMMAR: "Grammar",
  READING: "Reading",
  LISTENING: "Listening",
  SPEAKING: "Speaking",
  WRITING: "Writing",
};

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

/**
 * Grace period (seconds) after the deadline during which an in-flight student
 * submission is still accepted as a normal submit; after that the server
 * finalizes the attempt automatically. Protects against clock jitter without
 * meaningfully extending the timer.
 */
export const SUBMIT_GRACE_SECONDS = 45;

/** Guessable upper bound for attempt numbers / sanity checks. */
export const MAX_POINTS_PER_QUESTION = 100;
export const MAX_QUESTIONS_PER_ASSESSMENT = 100;
