/**
 * Phase 14 content rules. Difficulty is a content tag, not an academic level.
 * Published content is snapshotted before it changes.
 */

export const WORKFLOW = ["DRAFT", "IN_REVIEW", "APPROVED", "PUBLISHED", "ARCHIVED"] as const;
export const DIFFICULTIES = ["VERY_EASY", "EASY", "MEDIUM", "HARD", "VERY_HARD"] as const;
export const SKILLS = ["VOCABULARY", "GRAMMAR", "READING", "WRITING", "LISTENING", "SPEAKING"] as const;
export const RELEASE_MODES = ["IMMEDIATE", "SCHEDULED", "SEQUENTIAL", "TEACHER"] as const;
export const TOPIC_TAGS = [
  "Workplace",
  "Firefighting",
  "Safety",
  "Emergency",
  "Equipment",
  "Communication",
  "Health",
  "First Aid",
  "Daily Work",
  "Tools",
  "Instructions",
  "Numbers",
  "Time",
  "Directions",
] as const;

export const LIBRARY_KINDS = [
  "VOCABULARY",
  "GRAMMAR",
  "READING",
  "LISTENING",
  "SPEAKING",
  "WRITING",
  "IMAGE",
  "AUDIO",
  "VIDEO",
  "EXERCISE",
  "AI_CONTENT",
  "DOCUMENT",
] as const;

const ANSWER_TYPES = new Set(["EXERCISE", "MULTIPLE_CHOICE", "TRUE_FALSE", "FILL_BLANK", "MATCHING", "WORD_ORDER", "QUESTION"]);

export function difficultyLabel(value: string | null | undefined) {
  if (!value) return "Not tagged";
  return value.replaceAll("_", " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

export function sanitizeContent(input: string) {
  return input.replace(/<[^>]*>/g, "").replace(/javascript:/gi, "").replace(/\u0000/g, "").trim().slice(0, 8000);
}

export function validateDifficulty(value: string | null | undefined) {
  if (!value) return null;
  return DIFFICULTIES.includes(value as (typeof DIFFICULTIES)[number]) ? value : null;
}

export type QualityIssue = { code: string; message: string };

export function checkLessonQuality(input: {
  title: string;
  objectiveCount: number;
  blocks: { type: string; data: Record<string, unknown>; hidden?: boolean }[];
  beginnerMode?: boolean;
  unpublishedDependency?: boolean;
  brokenReference?: boolean;
}) {
  const issues: QualityIssue[] = [];
  if (input.title.trim().length < 2) issues.push({ code: "MISSING_TITLE", message: "Add a lesson title." });
  if (input.objectiveCount < 1) issues.push({ code: "MISSING_OBJECTIVE", message: "Add at least one learning objective." });
  const visible = input.blocks.filter((block) => !block.hidden && block.type !== "TEACHER_NOTE");
  if (visible.length === 0) issues.push({ code: "EMPTY_LESSON", message: "Add at least one visible block before publishing." });
  for (const block of visible) {
    if (ANSWER_TYPES.has(block.type)) {
      const answer = block.data.answer;
      const pairs = block.data.pairs;
      if ((answer === undefined || answer === "" || answer === null) && !Array.isArray(pairs)) {
        issues.push({ code: "MISSING_ANSWER", message: `${block.type.replaceAll("_", " ")} is missing an answer.` });
      }
    }
    if (block.type === "AUDIO" && !block.data.url) issues.push({ code: "MISSING_AUDIO", message: "An audio block has no file. It will not play." });
    if (block.type === "IMAGE" && !block.data.url) issues.push({ code: "BROKEN_MEDIA", message: "An image block has no file." });
    if (block.type === "LISTENING" && !block.data.audioUrl && !block.data.transcript) {
      issues.push({ code: "MISSING_AUDIO", message: "Listening has no audio and no transcript." });
    }
    if (input.beginnerMode && block.type === "TEXT" && String(block.data.text ?? "").length > 400) {
      issues.push({ code: "BEGINNER_LENGTH", message: "A Pre-A1 text block is long. Split it into shorter sentences." });
    }
    if (input.beginnerMode && (block.type === "TEXT" || block.type === "READING") && !block.data.translation && !block.data.note) {
      issues.push({ code: "MISSING_TRANSLATION", message: "Pre-A1 text should include a translation or a short note." });
    }
  }
  if (input.unpublishedDependency) issues.push({ code: "UNPUBLISHED_DEPENDENCY", message: "A prerequisite is not published." });
  if (input.brokenReference) issues.push({ code: "BROKEN_REFERENCE", message: "A referenced content item no longer exists." });
  return { ok: issues.length === 0, issues };
}

export function prerequisiteMet(requiredCompleted: boolean, hasOverride: boolean) {
  return requiredCompleted || hasOverride;
}

export function releaseOpen(input: {
  mode: string | null;
  releaseAt: Date | null;
  released: boolean;
  afterCompleted: boolean;
  now: Date;
  hasOverride: boolean;
}) {
  if (input.hasOverride) return true;
  if (!input.mode || input.mode === "IMMEDIATE") return true;
  if (input.mode === "SCHEDULED") return Boolean(input.releaseAt && input.releaseAt <= input.now);
  if (input.mode === "SEQUENTIAL") return input.afterCompleted;
  if (input.mode === "TEACHER") return input.released;
  return false;
}

export function nextVersion(current: number) {
  return current + 1;
}

export function canTeacherPublish(requireReview: boolean, approved: boolean, role: string) {
  if (role === "ADMIN") return true;
  if (!requireReview) return role === "TEACHER";
  return role === "TEACHER" && approved;
}

export function recommendationReason(state: string, label: string) {
  if (state === "NEEDS_REVIEW") return `Recommended because "${label}" is marked Needs Review.`;
  if (state === "LEARNING" || state === "PRACTICING") return `Recommended because "${label}" is still being practiced.`;
  return `Recommended because there is a stored learning record for "${label}".`;
}
