/**
 * Phase 11 completion rules.
 * The formula lives in the saved course rule, not in one hardcoded score.
 * Practice, XP, badges, streaks, and AI tutor activity are never requirements.
 */
import { z } from "zod";

export const COURSE_STATUSES = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "REQUIREMENTS_PENDING",
  "ELIGIBLE",
  "COMPLETED",
  "CERTIFICATE_ISSUED",
  "EXPIRED",
  "REVOKED",
  "ARCHIVED",
] as const;

export type CourseStatus = (typeof COURSE_STATUSES)[number];

export const STATUS_DEFINITIONS: Record<CourseStatus, string> = {
  NOT_STARTED: "No official lesson, assignment, exam, attendance, speaking, or listening record exists for this course.",
  IN_PROGRESS: "Official work has started, but a completion rule is not configured, so eligibility cannot be decided.",
  REQUIREMENTS_PENDING: "A completion rule exists and at least one official requirement is still missing.",
  ELIGIBLE: "Every configured official requirement is met or has a visible audited override. No certificate has been issued.",
  COMPLETED: "An administrator recorded completion after eligibility. A certificate has not been issued.",
  CERTIFICATE_ISSUED: "An active certificate exists. Later rule changes do not rewrite that certificate.",
  EXPIRED: "The certificate is past its expiration date. The certificate record is kept.",
  REVOKED: "The certificate was revoked. The record and the reason are kept.",
  ARCHIVED: "The completion record was archived. An active certificate was not deleted by archiving.",
};

export const REQUIREMENT_STATUSES = ["MET", "MISSING", "NOT_REQUIRED", "OVERRIDDEN"] as const;
export type RequirementStatus = (typeof REQUIREMENT_STATUSES)[number];

export type Requirement = {
  key: string;
  requirement: string;
  status: RequirementStatus;
  evidence: string;
  missingAction: string | null;
};

export const hoursSchema = z.object({
  mode: z.enum(["NONE", "PLANNED", "ATTENDANCE"]),
  plannedHours: z.number().min(0).max(10000).nullable(),
  minAttendedHours: z.number().min(0).max(10000).nullable(),
});

export const rulesSchema = z.object({
  lessons: z.object({ enabled: z.boolean(), minPercent: z.number().int().min(1).max(100) }),
  assignments: z.object({
    enabled: z.boolean(),
    requireGraded: z.boolean(),
    includePracticeTasks: z.boolean(),
  }),
  exams: z.object({
    enabled: z.boolean(),
    minPercent: z.number().int().min(1).max(100),
    useAssessmentPassingScore: z.boolean(),
  }),
  quizzes: z.object({ enabled: z.boolean(), minPercent: z.number().int().min(1).max(100) }),
  attendance: z.object({ enabled: z.boolean(), minPercent: z.number().int().min(1).max(100) }),
  speaking: z.object({ enabled: z.boolean(), requireReviewed: z.boolean() }),
  listening: z.object({ enabled: z.boolean() }),
  teacherApproval: z.object({ enabled: z.boolean() }),
  hours: hoursSchema,
  expirationMonths: z.number().int().min(1).max(120).nullable(),
}).strict();

export type CompletionRules = z.infer<typeof rulesSchema>;

export const EMPTY_RULES: CompletionRules = {
  lessons: { enabled: false, minPercent: 100 },
  assignments: { enabled: false, requireGraded: false, includePracticeTasks: false },
  exams: { enabled: false, minPercent: 70, useAssessmentPassingScore: true },
  quizzes: { enabled: false, minPercent: 70 },
  attendance: { enabled: false, minPercent: 80 },
  speaking: { enabled: false, requireReviewed: false },
  listening: { enabled: false },
  teacherApproval: { enabled: false },
  hours: { mode: "NONE", plannedHours: null, minAttendedHours: null },
  expirationMonths: null,
};

const BLOCKED_KEYS = ["practice", "xp", "aiTutor", "ai", "badges", "streaks", "voice"];

export function parseCompletionRules(raw: unknown): CompletionRules {
  if (raw && typeof raw === "object") {
    const keys = Object.keys(raw as object);
    if (keys.some((key) => BLOCKED_KEYS.includes(key))) {
      throw new Error("Practice, XP, badges, streaks, and AI tutor activity cannot be official requirements.");
    }
  }
  const parsed = rulesSchema.parse(raw);
  if (!hasOfficialRequirement(parsed)) {
    throw new Error("Choose at least one official requirement. An empty rule does not make a student eligible.");
  }
  if (parsed.hours.mode === "PLANNED" && parsed.hours.plannedHours === null) {
    throw new Error("Enter planned hours, or turn planned hours off.");
  }
  if (parsed.hours.mode === "ATTENDANCE" && parsed.hours.minAttendedHours === null) {
    throw new Error("Enter the minimum attendance hours, or turn that rule off.");
  }
  return parsed;
}

export function hasOfficialRequirement(rules: CompletionRules): boolean {
  return rules.lessons.enabled
    || rules.assignments.enabled
    || rules.exams.enabled
    || rules.quizzes.enabled
    || rules.attendance.enabled
    || rules.speaking.enabled
    || rules.listening.enabled
    || rules.teacherApproval.enabled
    || rules.hours.mode !== "NONE";
}

export function ruleSummary(rules: CompletionRules): string {
  const parts: string[] = [];
  if (rules.lessons.enabled) parts.push(`lessons ${rules.lessons.minPercent}%`);
  if (rules.assignments.enabled) parts.push(rules.assignments.requireGraded ? "graded assignments" : "submitted assignments");
  if (rules.exams.enabled) parts.push(rules.exams.useAssessmentPassingScore ? "official exams at each exam's stored passing score" : `official exams at ${rules.exams.minPercent}%`);
  if (rules.quizzes.enabled) parts.push(`quizzes at ${rules.quizzes.minPercent}%`);
  if (rules.attendance.enabled) parts.push(`attendance ${rules.attendance.minPercent}%`);
  if (rules.speaking.enabled) parts.push(rules.speaking.requireReviewed ? "reviewed speaking assignments" : "submitted speaking assignments");
  if (rules.listening.enabled) parts.push("official listening assignments");
  if (rules.teacherApproval.enabled) parts.push("teacher approval");
  if (rules.hours.mode === "PLANNED") parts.push(`planned hours ${rules.hours.plannedHours}`);
  if (rules.hours.mode === "ATTENDANCE") parts.push(`attendance hours ${rules.hours.minAttendedHours}`);
  return parts.join("; ");
}

/** A stored percentage meets a threshold only at or above it. Historical rows are not rewritten. */
export function meetsThreshold(score: number, threshold: number): boolean {
  return score >= threshold;
}

export function percent(done: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.floor((done / total) * 100);
}

export type CertificateLifecycle = "NONE" | "ISSUED" | "EXPIRED" | "REVOKED" | "SUPERSEDED";

export function deriveStatus(input: {
  courseArchived: boolean;
  ruleConfigured: boolean;
  started: boolean;
  eligible: boolean;
  completionRecorded: boolean;
  archivedRecord: boolean;
  certificate: CertificateLifecycle;
}): CourseStatus {
  if (input.certificate === "ISSUED") return "CERTIFICATE_ISSUED";
  if (input.certificate === "EXPIRED") return "EXPIRED";
  if (input.certificate === "REVOKED") return "REVOKED";
  if (input.archivedRecord || input.courseArchived) return "ARCHIVED";
  if (input.completionRecorded && input.eligible) return "COMPLETED";
  if (input.eligible) return "ELIGIBLE";
  if (!input.ruleConfigured) return input.started ? "IN_PROGRESS" : "NOT_STARTED";
  if (!input.started) return "NOT_STARTED";
  return "REQUIREMENTS_PENDING";
}

export function formatCertificateId(pattern: string, year: number, sequence: number, width: number, prefix: string): string {
  const seq = String(sequence).padStart(width, "0");
  return pattern
    .replaceAll("{PREFIX}", prefix)
    .replaceAll("{YEAR}", String(year))
    .replaceAll("{SEQUENCE}", seq);
}

export function assertNumberingPattern(pattern: string, width: number): void {
  if (!pattern.includes("{YEAR}") || !pattern.includes("{SEQUENCE}")) {
    throw new Error("The numbering pattern must include {YEAR} and {SEQUENCE}.");
  }
  if (!/^[-A-Z0-9{}]+$/.test(pattern) || pattern.length > 32) {
    throw new Error("Use only capital letters, numbers, hyphens, and the tokens {PREFIX}, {YEAR}, and {SEQUENCE}.");
  }
  if (width < 4 || width > 8) throw new Error("Sequence width must be from 4 to 8 digits.");
  const sample = formatCertificateId(pattern, 2026, 1, width, "CERT");
  if (!/^[A-Z0-9-]{8,40}$/.test(sample)) {
    throw new Error("That pattern does not produce a searchable certificate ID such as CERT-2026-000184.");
  }
}

export function orgYear(date = new Date()): number {
  const zone = process.env.ORG_TIMEZONE || "UTC";
  const year = new Intl.DateTimeFormat("en-GB", { timeZone: zone, year: "numeric" }).formatToParts(date)
    .find((part) => part.type === "year")?.value;
  return Number(year ?? date.getUTCFullYear());
}

export function officialDateTime(date: Date): string {
  const zone = process.env.ORG_TIMEZONE || "UTC";
  const formatted = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: zone,
  }).format(date);
  return `${formatted} ${zone}`;
}

export function requirement(key: string, label: string, status: RequirementStatus, evidence: string, missingAction: string | null): Requirement {
  return { key, requirement: label, status, evidence, missingAction: status === "MISSING" ? missingAction : null };
}

export function countsTowardCertificate(source: string): boolean {
  return source === "OFFICIAL";
}
