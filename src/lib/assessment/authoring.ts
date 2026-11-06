/**
 * Shared authoring payload schema + validation for the question bank API.
 * Kept out of route files (Next.js routes may only export handlers).
 */
import { z } from "zod";
import { ApiError } from "@/lib/api";
import { OPTION_TYPES } from "./registry";

export const questionPayloadSchema = z
  .object({
    type: z.string().min(1),
    questionText: z.string().trim().min(1).max(1000),
    explanation: z.string().trim().max(1000).nullable().optional(),
    difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).default("EASY"),
    points: z.number().int().min(1).max(100).default(1),
    skill: z.enum(["VOCABULARY", "GRAMMAR", "READING", "LISTENING", "SPEAKING", "WRITING"]).nullable().optional(),
    levelId: z.string().trim().nullable().optional(),
    lessonId: z.string().trim().nullable().optional(),
    moduleId: z.string().trim().nullable().optional(),
    grammarConceptId: z.string().trim().nullable().optional(),
    vocabularyId: z.string().trim().nullable().optional(),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).default("DRAFT"),
    configuration: z.unknown().optional(),
    options: z.array(z.object({ text: z.string().trim().min(1).max(200), isCorrect: z.boolean() })).max(6).optional(),
  })
  .strict();

/** Choice-style questions need 2–6 options with exactly one correct answer. */
export function validateOptions(payload: { type: string; options?: { text: string; isCorrect: boolean }[] }) {
  if (OPTION_TYPES.has(payload.type as (typeof OPTION_TYPES extends Set<infer T> ? T : never))) {
    const opts = payload.options ?? [];
    if (opts.length < 2 || opts.length > 6) {
      throw new ApiError(422, "Choice questions need 2–6 options.");
    }
    if (opts.filter((o) => o.isCorrect).length !== 1) {
      throw new ApiError(422, "Choose exactly one correct option.");
    }
  }
}
