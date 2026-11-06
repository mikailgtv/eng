/**
 * Phase 12 notification categories, priorities, and template checks.
 * Urgent is reserved for authorized administrative events.
 */
export const CATEGORIES = [
  "ACADEMIC",
  "ASSIGNMENT",
  "EXAM",
  "SCHEDULE",
  "ATTENDANCE",
  "SPEAKING",
  "LISTENING",
  "AI",
  "ADAPTIVE_LEARNING",
  "GAMIFICATION",
  "CERTIFICATE",
  "ADMIN",
  "SYSTEM",
  "MESSAGE",
] as const;

export type NoticeCategory = (typeof CATEGORIES)[number];

export const PRIORITIES = ["LOW", "NORMAL", "HIGH", "URGENT"] as const;
export type NoticePriority = (typeof PRIORITIES)[number];

export const ANNOUNCEMENT_TYPES = [
  "INFORMATION",
  "REMINDER",
  "SCHEDULE_CHANGE",
  "COURSE_UPDATE",
  "EXAM_NOTICE",
  "SYSTEM_MAINTENANCE",
  "TRAINING",
] as const;

export const TEMPLATE_VARIABLES = [
  "student_name",
  "assignment_name",
  "due_date",
  "course_name",
  "exam_name",
  "class_name",
  "certificate_id",
  "group_name",
] as const;

export const DEFAULT_RULES: { eventKey: string; category: NoticeCategory; priority: NoticePriority; enabled: boolean; cooldownMinutes: number }[] = [
  { eventKey: "assignment.created", category: "ASSIGNMENT", priority: "NORMAL", enabled: true, cooldownMinutes: 60 },
  { eventKey: "assignment.due_soon", category: "ASSIGNMENT", priority: "NORMAL", enabled: true, cooldownMinutes: 720 },
  { eventKey: "assignment.overdue", category: "ASSIGNMENT", priority: "NORMAL", enabled: true, cooldownMinutes: 1440 },
  { eventKey: "exam.scheduled", category: "EXAM", priority: "NORMAL", enabled: true, cooldownMinutes: 720 },
  { eventKey: "exam.starting", category: "EXAM", priority: "HIGH", enabled: true, cooldownMinutes: 180 },
  { eventKey: "exam.missed", category: "EXAM", priority: "NORMAL", enabled: true, cooldownMinutes: 1440 },
  { eventKey: "exam.result", category: "EXAM", priority: "NORMAL", enabled: true, cooldownMinutes: 1440 },
  { eventKey: "class.soon", category: "SCHEDULE", priority: "NORMAL", enabled: true, cooldownMinutes: 180 },
  { eventKey: "class.canceled", category: "SCHEDULE", priority: "HIGH", enabled: true, cooldownMinutes: 60 },
  { eventKey: "certificate.expiring", category: "CERTIFICATE", priority: "NORMAL", enabled: true, cooldownMinutes: 1440 },
  { eventKey: "adaptive.review", category: "ADAPTIVE_LEARNING", priority: "LOW", enabled: true, cooldownMinutes: 1440 },
  { eventKey: "adaptive.plan", category: "ADAPTIVE_LEARNING", priority: "LOW", enabled: true, cooldownMinutes: 1440 },
  { eventKey: "message.sent", category: "MESSAGE", priority: "NORMAL", enabled: true, cooldownMinutes: 1 },
  { eventKey: "ai.ready", category: "AI", priority: "LOW", enabled: false, cooldownMinutes: 1440 },
];

const TYPE_CATEGORY: Record<string, NoticeCategory> = {
  CLASS_REMINDER: "SCHEDULE",
  ASSIGNMENT: "ASSIGNMENT",
  EXAM: "EXAM",
  ABSENCE: "ATTENDANCE",
  LESSON: "ACADEMIC",
  SYSTEM: "SYSTEM",
};

export function categoryForType(type: string, explicit?: string | null): NoticeCategory {
  if (explicit && CATEGORIES.includes(explicit as NoticeCategory)) return explicit as NoticeCategory;
  if (type.startsWith("CERT_")) return "CERTIFICATE";
  return TYPE_CATEGORY[type] ?? "SYSTEM";
}

export function isCriticalType(type: string, critical?: boolean): boolean {
  if (critical) return true;
  return type.startsWith("CERT_") || type === "EXAM";
}

export function zoneName(explicit?: string | null): string {
  return explicit || process.env.ORG_TIMEZONE || "UTC";
}

export function formatInZone(date: Date, timeZone = zoneName()): string {
  const formatted = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(date);
  return `${formatted} ${timeZone}`;
}

export function inQuietHours(now: Date, start: string | null, end: string | null, timeZone: string): boolean {
  if (!start || !end || !/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return false;
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const current = hour * 60 + minute;
  const [startHour, startMinute] = start.split(":").map(Number);
  const [endHour, endMinute] = end.split(":").map(Number);
  const startMin = startHour * 60 + startMinute;
  const endMin = endHour * 60 + endMinute;
  if (startMin === endMin) return false;
  if (startMin < endMin) return current >= startMin && current < endMin;
  return current >= startMin || current < endMin;
}

export function renderTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_match, key: string) => vars[key] ?? "");
}

export function validateTemplate(body: string, subject: string): string | null {
  const text = `${subject}\n${body}`;
  if (/[<>]/.test(text)) return "Templates are plain text. HTML is not allowed.";
  const unknown = [...text.matchAll(/\{\{\s*([a-z_]+)\s*\}\}/g)].map((match) => match[1]).filter((key) => !TEMPLATE_VARIABLES.includes(key as (typeof TEMPLATE_VARIABLES)[number]));
  if (unknown.length) return `Unknown variable: ${unknown[0]}.`;
  if (!body.trim() || !subject.trim()) return "Enter a subject and a message.";
  return null;
}

export function groupedBody(title: string, count: number): string {
  if (count <= 1) return title;
  return `${count} updates: ${title}`;
}
