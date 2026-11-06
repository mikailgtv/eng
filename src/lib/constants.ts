/**
 * Single source of truth for every enumerated value stored in the database.
 * Values are stored as plain strings (keeps the Prisma schema portable between
 * SQLite and PostgreSQL). To support a new group type / level / role, add it
 * here — UI selects, labels and validation all derive from these registries.
 */

export const ROLES = ["STUDENT", "TEACHER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type AccountStatus = (typeof STATUSES)[number];

export interface GroupTypeDef {
  value: string;
  label: string;
}

/**
 * Open registry of learning-group types. Adding a new type later (e.g.
 * "OFFICE_STAFF") only requires appending an entry — no migration needed.
 */
export const GROUP_TYPES: GroupTypeDef[] = [
  { value: "FIREFIGHTER_SHIFT", label: "Firefighter shift" },
  { value: "DAY_WORKER", label: "Day worker" },
];

export function groupTypeLabel(value: string): string {
  return GROUP_TYPES.find((t) => t.value === value)?.label ?? value.replaceAll("_", " ").toLowerCase();
}

export interface LevelDef {
  value: string;
  label: string;
}

/** CEFR levels, from absolute beginner upward. */
export const ENGLISH_LEVELS: LevelDef[] = [
  { value: "PRE_A1", label: "Pre-A1" },
  { value: "A1", label: "A1" },
  { value: "A2", label: "A2" },
  { value: "B1", label: "B1" },
  { value: "B2", label: "B2" },
  { value: "C1", label: "C1" },
  { value: "C2", label: "C2" },
];

export function levelLabel(value: string | null | undefined): string {
  if (!value) return "Not assessed yet";
  return ENGLISH_LEVELS.find((l) => l.value === value)?.label ?? value;
}

export function roleLabel(role: Role): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

/** Where each role lands after signing in. */
export const ROLE_HOME: Record<Role, string> = {
  STUDENT: "/student",
  TEACHER: "/teacher",
  ADMIN: "/admin",
};

// ---------------------------------------------------------------------------
// Phase 2 — learning-engine registries
// ---------------------------------------------------------------------------

/** Publishing lifecycle shared by courses, modules and lessons. */
export const CONTENT_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

/** Per-student lesson progress states. */
export const PROGRESS_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] as const;
export type ProgressStatus = (typeof PROGRESS_STATUSES)[number];

/** Lesson content block types (renderers in src/components/learn). */
export const CONTENT_BLOCK_TYPES = [
  "TEXT",
  "HEADING",
  "IMAGE",
  "EXAMPLE",
  "VOCABULARY",
  "GRAMMAR",
  "AUDIO",
  "VIDEO",
  "TIP",
  "WARNING",
  "QUESTION",
  "DIALOGUE",
  "TRANSLATION",
  "EXERCISE",
  "MULTIPLE_CHOICE",
  "TRUE_FALSE",
  "FILL_BLANK",
  "MATCHING",
  "WORD_ORDER",
  "LISTENING",
  "SPEAKING",
  "READING",
  "WRITING",
  "FLASHCARDS",
  "AI_PRACTICE",
  "TEACHER_NOTE",
] as const;
export type ContentBlockType = (typeof CONTENT_BLOCK_TYPES)[number];

/** Human labels for the publishing lifecycle. */
export function contentStatusLabel(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

/** Audit actions (see prisma/schema.prisma AuditLog). */
export const AUDIT_ACTIONS = {
  USER_CREATED: "USER_CREATED",
  USER_UPDATED: "USER_UPDATED",
  USER_DEACTIVATED: "USER_DEACTIVATED",
  USER_ACTIVATED: "USER_ACTIVATED",
  ROLE_CHANGED: "ROLE_CHANGED",
  GROUP_CREATED: "GROUP_CREATED",
  GROUP_UPDATED: "GROUP_UPDATED",
  GROUP_DEACTIVATED: "GROUP_DEACTIVATED",
  GROUP_ACTIVATED: "GROUP_ACTIVATED",
  MEMBER_ASSIGNED: "MEMBER_ASSIGNED",
  MEMBER_REMOVED: "MEMBER_REMOVED",
} as const;

export const USERS_PAGE_SIZE = 10;
export const AUDIT_PAGE_SIZE = 20;
