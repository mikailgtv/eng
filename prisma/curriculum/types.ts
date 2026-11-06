/**
 * Seed-curriculum content types (Pre-A1 / Starter).
 * Content lives here as data — the UI never hardcodes lesson content.
 */

export type SeedVocabulary = {
  word: string;
  translation?: string;
  /** Respelling guide, e.g. "BUK" */
  pronunciation?: string;
  /** IPA, e.g. /bʊk/ */
  phonetic?: string;
  exampleSentence?: string;
};

export type SeedGrammar = {
  title: string;
  explanation?: string;
  patterns: string[];
  examples: string[];
};

export type SeedBlock =
  | { type: "TEXT"; text: string }
  | { type: "HEADING"; text: string; level?: 2 | 3 }
  | { type: "EXAMPLE"; items: { text: string; note?: string }[]; intro?: string }
  | { type: "TIP"; text: string }
  | { type: "WARNING"; text: string }
  | { type: "QUESTION"; prompt: string; answer: string; hint?: string }
  | { type: "GRAMMAR"; title: string; explanation?: string; patterns: string[]; examples: string[] }
  | { type: "VOCABULARY"; intro?: string };

export type SeedLesson = {
  title: string;
  description: string;
  objectives: string[];
  durationMin: number;
  blocks: SeedBlock[];
  vocabulary?: SeedVocabulary[];
  grammar?: SeedGrammar;
};

export type SeedModule = {
  title: string;
  description: string;
  lessons: SeedLesson[];
};

export type SeedCourse = {
  code: string;
  title: string;
  description: string;
  levelCode: string;
  modules: SeedModule[];
};
