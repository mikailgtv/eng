import type { SeedCourse } from "./types";
import { MODULES_1_3 } from "./pre-a1-modules-1-3";
import { MODULES_4_6 } from "./pre-a1-modules-4-6";

/** All CEFR levels, from absolute beginner upward. Only PRE_A1 is ACTIVE. */
export const SEED_LEVELS = [
  { code: "PRE_A1", name: "Starter", displayName: "Starter / Pre-A1", order: 1, status: "ACTIVE", description: "Absolute beginner. Start from zero — the alphabet, first words and first sentences." },
  { code: "A1", name: "Beginner", displayName: "Beginner / A1", order: 2, status: "INACTIVE", description: "Simple everyday communication." },
  { code: "A2", name: "Elementary", displayName: "Elementary / A2", order: 3, status: "INACTIVE", description: "Routine tasks and simple exchanges." },
  { code: "B1", name: "Intermediate", displayName: "Intermediate / B1", order: 4, status: "INACTIVE", description: "Work-related and everyday conversation." },
  { code: "B2", name: "Upper-Intermediate", displayName: "Upper-Intermediate / B2", order: 5, status: "INACTIVE", description: "Clear, detailed communication." },
  { code: "C1", name: "Advanced", displayName: "Advanced / C1", order: 6, status: "INACTIVE", description: "Fluent, flexible professional use." },
  { code: "C2", name: "Mastery", displayName: "Mastery / C2", order: 7, status: "INACTIVE", description: "Near-native proficiency." },
] as const;

/** The initial Pre-A1 / Starter course with its full curriculum. */
export const SEED_COURSES: SeedCourse[] = [
  {
    code: "EN-STARTER-PREA1",
    title: "English Starter",
    description:
      "Your first English course, built for absolute beginners. Start from zero and learn step by step: the alphabet, first words, first sentences, numbers, time and everyday English.",
    levelCode: "PRE_A1",
    modules: [...MODULES_1_3, ...MODULES_4_6],
  },
];

export type { SeedCourse, SeedModule, SeedLesson, SeedBlock, SeedVocabulary, SeedGrammar } from "./types";
